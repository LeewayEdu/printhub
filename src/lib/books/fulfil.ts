// Fulfilment of book items AFTER a payment has been confirmed by the server (Paystack verify or webhook,
// or an admin confirming a bank transfer). It is the only code that grants entitlements and writes
// royalty entries. It is idempotent: unique keys on entitlements (order_item_id) and royalty_entries
// (order_item_id, part) mean calling it any number of times never grants or records twice. Nothing
// here is reachable from the browser.

import type { SupabaseClient } from '@supabase/supabase-js'
import { SITE_URL } from '@/lib/site-url'
import { resendMailer, type Mailer } from '@/lib/design-reminders'
import { DEFAULT_MAX_DOWNLOADS } from './download'
import { computeRoyalty, negate, pickRule, printAuthorShare, type RoyaltyRule } from './royalty'

export const PAID_OR_LATER = ['paid', 'processing', 'shipped', 'delivered']
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string))
const isDuplicate = (e: any) => e?.code === '23505'

export interface FulfilResult { state: 'not_paid' | 'no_books' | 'done' | 'error'; granted: number; ledger: number; emailed: boolean; detail?: string }

export async function fulfilBooksForOrder(db: SupabaseClient, orderId: string, deps: { mailer?: Mailer; now?: Date } = {}): Promise<FulfilResult> {
  const now = deps.now || new Date()
  const mailer = deps.mailer || resendMailer
  const none = (state: FulfilResult['state'], detail?: string): FulfilResult => ({ state, granted: 0, ledger: 0, emailed: false, detail })

  const { data: order } = await db.from('orders').select('*').eq('id', orderId).maybeSingle()
  if (!order) return none('error', 'order not found')
  if (!PAID_OR_LATER.includes(order.status)) return none('not_paid')

  const { data: items, error: itemsErr } = await db.from('order_items').select('*').eq('order_id', orderId).eq('item_type', 'book')
  if (itemsErr || !items || items.length === 0) return none('no_books')

  const formatIds = Array.from(new Set(items.map((i: any) => i.book_format_id).filter(Boolean)))
  const bookIds = Array.from(new Set(items.map((i: any) => i.book_id).filter(Boolean)))
  const [{ data: formats }, { data: siblings }, { data: books }, { data: rules }] = await Promise.all([
    db.from('book_formats').select('id, type, book_id, price_ngn, print_cost_ngn').in('id', formatIds),
    db.from('book_formats').select('id, type, book_id, price_ngn').in('book_id', bookIds),
    db.from('books').select('*').in('id', bookIds),     // '*' includes royalty_option once books-1b-migration.sql has run
    db.from('royalty_rules').select('*'),
  ])
  const authorIds = Array.from(new Set((books || []).map((b: any) => b.author_id)))
  const { data: authors } = await db.from('authors').select('id, referral_code').in('id', authorIds)

  const fmtById = new Map<string, any>((formats || []).map((f: any) => [f.id, f]))
  const bookById = new Map<string, any>((books || []).map((b: any) => [b.id, b]))
  const authorById = new Map<string, any>((authors || []).map((a: any) => [a.id, a]))
  const currency = order.currency || 'NGN'
  const orderFee = Number(order.payment_fee) || 0
  const orderTotal = Number(order.total_amount) || 0
  const isTest = !!order.is_test
  // Authors are paid in naira at the rate actually received. A naira sale has rate 1. A USD sale uses the naira Paystack
  // settled for the order (recorded by an admin: see recordSettlement); until then it is flagged and not payable.
  const rate: number | null = currency === 'NGN' ? 1 : (Number(order.settled_ngn) > 0 && orderTotal > 0 ? Number(order.settled_ngn) / orderTotal : null)

  let granted = 0
  let ledger = 0
  const grantedTitles: string[] = []

  for (const item of items as any[]) {
    const fmt = fmtById.get(item.book_format_id)
    const book = bookById.get(item.book_id)
    if (!fmt || !book) continue

    // 1. entitlement for anything with an ebook file
    if ((fmt.type === 'ebook' || fmt.type === 'bundle') && order.user_id) {
      const { data: ent, error } = await db.from('entitlements').insert({
        user_id: order.user_id, order_id: orderId, order_item_id: item.id, book_id: book.id,
        book_format_id: fmt.id, max_downloads: DEFAULT_MAX_DOWNLOADS,
      }).select('id').single()
      if (ent) { granted++; grantedTitles.push(book.title) }
      else if (error && !isDuplicate(error)) return { ...none('error', `entitlement: ${error.message}`), granted, ledger }
    }

    // 2. royalty entries (never for test orders)
    if (!isTest) {
      const author = authorById.get(book.author_id)
      const referral = !!(order.author_ref_code && author?.referral_code && String(order.author_ref_code).toLowerCase() === String(author.referral_code).toLowerCase())
      const sib = (siblings || []).filter((s: any) => s.book_id === book.id)
      const eb = sib.find((s: any) => s.type === 'ebook'), pr = sib.find((s: any) => s.type === 'print')
      const ratio = eb && pr && Number(eb.price_ngn) + Number(pr.price_ngn) > 0 ? Number(eb.price_ngn) / (Number(eb.price_ngn) + Number(pr.price_ngn)) : null
      const rule = pickRule((rules || []) as RoyaltyRule[], book.id, book.royalty_option || 'distribution')
      const parts = computeRoyalty({
        formatType: fmt.type, gross: Number(item.price), quantity: Number(item.quantity) || 1, orderFee, orderTotal,
        printCostPerCopy: fmt.print_cost_ngn == null ? null : Number(fmt.print_cost_ngn), rule, referral, bundleEbookRatio: ratio,
      })
      for (const p of parts) {
        const payableAt = new Date(now.getTime() + (rule?.hold_days ?? 30) * 86400000).toISOString()
        const { error } = await db.from('royalty_entries').insert({
          order_id: orderId, order_item_id: item.id, book_id: book.id, author_id: book.author_id, book_format_id: fmt.id,
          part: p.part, currency, gross: p.gross, payment_fee: p.payment_fee, net: p.net,
          author_share: p.author_share, company_share: p.company_share, source: p.source,
          status: 'pending', payable_at: payableAt, note: p.note, flag: p.flag || (rate == null ? 'awaiting_settlement' : null),
          rate_to_ngn: rate, author_share_ngn: rate == null ? null : Math.round(p.author_share * rate * 100) / 100,
          settled_note: rate == null ? 'USD sale: waiting for the naira amount Paystack settled' : (currency === 'NGN' ? null : 'rate = naira settled / USD total'),
        })
        if (!error) ledger++
        else if (!isDuplicate(error)) return { ...none('error', `ledger: ${error.message}`), granted, ledger }
      }
    }
  }

  // 3. one confirmation email, only when something was newly granted
  let emailed = false
  if (granted > 0 && order.email) {
    const list = grantedTitles.map(t => `<li>${esc(t)}</li>`).join('')
    const html = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:24px auto;border:1px solid #eee;border-radius:10px;overflow:hidden">
<div style="background:#C0392B;color:#fff;padding:18px 24px;font-weight:700;font-size:16px">Your books are ready</div>
<div style="padding:22px 24px;font-size:14px;line-height:1.7;color:#222">
<p>Hi ${esc(order.first_name || 'there')}, thank you for your purchase.</p><ul>${list}</ul>
<p><a href="${SITE_URL}/dashboard/my-books" style="display:inline-block;background:#C0392B;color:#fff;text-decoration:none;font-weight:700;padding:11px 22px;border-radius:8px">Go to My books</a></p>
<p style="font-size:12px;color:#888">Your downloads are personal to your account and each book can be downloaded a limited number of times.</p>
</div></div>`
    emailed = await mailer(order.email, 'Your C-Chu Books purchase is ready to download', html)
  }
  return { state: 'done', granted, ledger, emailed }
}

/** A refunded order: withdraw access and cancel out the royalty entries with negative ones. */
export async function reverseBooksForOrder(db: SupabaseClient, orderId: string): Promise<{ revoked: number; reversed: number }> {
  const now = new Date().toISOString()
  const { data: revoked } = await db.from('entitlements').update({ revoked_at: now }).eq('order_id', orderId).is('revoked_at', null).select('id')

  const { data: entries } = await db.from('royalty_entries').select('*').eq('order_id', orderId).is('refund_of', null)
  let reversed = 0
  for (const e of (entries || []) as any[]) {
    if (e.status === 'reversed') continue
    const wasPaid = e.status === 'paid'
    const { id, created_at, ...rest } = e
    const { error } = await db.from('royalty_entries').insert({
      ...rest, ...negate(e), author_share_ngn: e.author_share_ngn == null ? null : -Number(e.author_share_ngn), refund_of: e.id, payout_id: null, status: wasPaid ? 'payable' : 'reversed',
      payable_at: wasPaid ? now : e.payable_at, note: 'refund',
    })
    if (error) continue            // already reversed (unique refund_of) or failed: skip
    if (!wasPaid) await db.from('royalty_entries').update({ status: 'reversed' }).eq('id', e.id)
    reversed++
  }
  return { revoked: (revoked || []).length, reversed }
}


/**
 * After a missing print cost has been entered for a book, recompute its flagged ledger entries. Only entries that
 * are still unpaid and not in a payout are touched; the net never changes, only the author/company split.
 */
export async function recalcFlaggedForBook(db: SupabaseClient, bookId: string): Promise<{ updated: number; stillMissing: number }> {
  const { data: entries } = await db.from('royalty_entries').select('*').eq('book_id', bookId).eq('flag', 'needs_print_cost')
  const { data: book } = await db.from('books').select('*').eq('id', bookId).maybeSingle()
  const { data: rules } = await db.from('royalty_rules').select('*')
  const rule = pickRule((rules || []) as RoyaltyRule[], bookId, book?.royalty_option || 'distribution')
  let updated = 0, stillMissing = 0
  for (const e of (entries || []) as any[]) {
    if (e.status === 'paid' || e.status === 'reversed' || e.payout_id) continue
    const { data: fmt } = await db.from('book_formats').select('print_cost_ngn').eq('id', e.book_format_id).maybeSingle()
    const { data: item } = await db.from('order_items').select('quantity').eq('id', e.order_item_id).maybeSingle()
    if (!fmt || fmt.print_cost_ngn == null || !rule || rule.print_author_share_pct == null) { stillMissing++; continue }
    const author = printAuthorShare(Number(e.net), Number(item?.quantity) || 1, Number(fmt.print_cost_ngn), Number(rule.print_author_share_pct))
    const { error } = await db.from('royalty_entries').update({
      author_share: author, company_share: Math.round((Number(e.net) - author) * 100) / 100, flag: null,
      note: `print cost added later (${fmt.print_cost_ngn} per copy)`,
    }).eq('id', e.id)
    if (!error) updated++
  }
  return { updated, stillMissing }
}


/**
 * Records the naira Paystack actually settled for a USD order and converts that order's ledger entries at that rate
 * (rate = settled naira / USD total). Entries that were waiting for it are released; flagged-for-other-reasons stay flagged.
 */
export async function recordSettlement(db: SupabaseClient, orderId: string, settledNgn: number): Promise<{ ok: boolean; error?: string; updated?: number }> {
  if (!(settledNgn > 0)) return { ok: false, error: 'Enter the naira amount that was settled' }
  const { data: order } = await db.from('orders').select('*').eq('id', orderId).maybeSingle()
  if (!order) return { ok: false, error: 'Order not found' }
  if ((order.currency || 'NGN') !== 'USD') return { ok: false, error: 'Only USD orders need a settlement amount' }
  if (!PAID_OR_LATER.includes(order.status)) return { ok: false, error: 'The order is not paid' }
  const rate = settledNgn / Number(order.total_amount)
  const { error: oe } = await db.from('orders').update({ settled_ngn: settledNgn }).eq('id', orderId)
  if (oe) return { ok: false, error: oe.message }
  const { data: entries } = await db.from('royalty_entries').select('*').eq('order_id', orderId)
  let updated = 0
  for (const e of (entries || []) as any[]) {
    if (e.status === 'paid') continue
    const { error } = await db.from('royalty_entries').update({
      rate_to_ngn: rate, author_share_ngn: Math.round(Number(e.author_share) * rate * 100) / 100,
      flag: e.flag === 'awaiting_settlement' ? null : e.flag, settled_note: `rate = naira settled (${settledNgn}) / USD total (${order.total_amount})`,
    }).eq('id', e.id)
    if (!error) updated++
  }
  return { ok: true, updated }
}
