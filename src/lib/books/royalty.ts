// Royalty ledger maths. Pure functions: every percentage comes from a royalty_rules row (the database),
// none is written in code. Amounts are in the order's currency, rounded to 2 decimals, and the
// author share plus the company share always add up to the net.

import { round2 } from './currency'

export interface RoyaltyRule {
  book_id: string | null
  ebook_author_share_pct: number | null
  print_author_share_pct: number | null
  referral_share_pct: number | null
  hold_days: number
  minimum_payout: number
}

/** The book's own rule if it has one, otherwise the default rule (book_id null), otherwise none. */
export function pickRule(rules: RoyaltyRule[], bookId: string): RoyaltyRule | null {
  return rules.find(r => r.book_id === bookId) || rules.find(r => r.book_id == null) || null
}

export interface RoyaltyPartInput {
  formatType: 'print' | 'ebook' | 'bundle'
  gross: number                // the line total in the order currency
  quantity: number
  orderFee: number             // Paystack fee for the whole order (0 when not reported)
  orderTotal: number           // the whole order total, to share the fee in proportion
  printCostPerCopy: number | null
  rule: RoyaltyRule | null
  referral: boolean            // the order carries this author's own referral code
  bundleEbookRatio?: number | null   // ebook price / (ebook price + print price), for bundles
}

export interface RoyaltyPart {
  part: 'ebook' | 'print'
  gross: number; payment_fee: number; net: number
  author_share: number; company_share: number
  source: 'store' | 'referral'
  note: string | null
}

function onePart(part: 'ebook' | 'print', gross: number, fee: number, i: RoyaltyPartInput): RoyaltyPart {
  const net = round2(gross - fee)
  const rule = i.rule
  const normalPct = part === 'ebook' ? rule?.ebook_author_share_pct : rule?.print_author_share_pct
  const usingReferral = i.referral && rule?.referral_share_pct != null
  const pct = usingReferral ? rule!.referral_share_pct : normalPct
  const notes: string[] = []
  if (!rule) notes.push('no royalty rule configured')
  else if (pct == null) notes.push(`no ${part} share set in the rule`)
  if (i.orderFee === 0) notes.push('payment fee not reported, 0 used')
  let base = net
  if (part === 'print') {
    const cost = round2((i.printCostPerCopy ?? 0) * i.quantity)
    if (i.printCostPerCopy == null) notes.push('print cost not set, 0 used')
    base = Math.max(0, round2(net - cost))
  }
  const author = pct == null ? 0 : round2(base * Number(pct) / 100)
  return {
    part, gross: round2(gross), payment_fee: round2(fee), net,
    author_share: author, company_share: round2(net - author),
    source: usingReferral ? 'referral' : 'store', note: notes.length ? notes.join('; ') : null,
  }
}

/** One entry for an ebook or print line; two for a bundle (ebook part and print part). */
export function computeRoyalty(i: RoyaltyPartInput): RoyaltyPart[] {
  const feeFor = (g: number) => (i.orderTotal > 0 ? round2(i.orderFee * g / i.orderTotal) : 0)
  if (i.formatType === 'ebook') return [onePart('ebook', i.gross, feeFor(i.gross), i)]
  if (i.formatType === 'print') return [onePart('print', i.gross, feeFor(i.gross), i)]
  const r = i.bundleEbookRatio
  if (r == null || !(r > 0) || !(r < 1)) return [onePart('print', i.gross, feeFor(i.gross), i)]   // bundle without both prices: treated as print
  const ebookGross = round2(i.gross * r)
  const printGross = round2(i.gross - ebookGross)
  return [onePart('ebook', ebookGross, feeFor(ebookGross), i), onePart('print', printGross, feeFor(printGross), i)]
}

/** pending becomes payable once payable_at has passed (computed when read, no scheduled job) */
export function effectiveStatus(e: { status: string; payable_at: string | null }, now: Date): string {
  if (e.status === 'pending' && e.payable_at && new Date(e.payable_at).getTime() <= now.getTime()) return 'payable'
  return e.status
}

export function negate(e: { gross: number; payment_fee: number; net: number; author_share: number; company_share: number }) {
  return { gross: -e.gross, payment_fee: -e.payment_fee, net: -e.net, author_share: -e.author_share, company_share: -e.company_share }
}

export interface LedgerRow {
  id: string; author_id: string; book_id: string; order_id: string; part: string; currency: string; source: string
  gross: number; payment_fee: number; net: number; author_share: number; company_share: number
  status: string; payable_at: string | null; created_at: string; payout_id?: string | null; note?: string | null
}

/** One line per author, month and currency, counting only what is not reversed */
export function summariseEntries(rows: LedgerRow[], now: Date) {
  const map = new Map<string, any>()
  for (const r of rows) {
    const month = r.created_at.slice(0, 7)
    const key = `${r.author_id}|${month}|${r.currency}`
    const s = map.get(key) || { author_id: r.author_id, month, currency: r.currency, entries: 0, gross: 0, payment_fee: 0, net: 0, author_share: 0, company_share: 0, pending: 0, payable: 0, paid: 0 }
    const st = effectiveStatus(r, now)
    if (st !== 'reversed') {
      s.entries++; s.gross += Number(r.gross); s.payment_fee += Number(r.payment_fee); s.net += Number(r.net)
      s.author_share += Number(r.author_share); s.company_share += Number(r.company_share)
      if (st === 'pending') s.pending += Number(r.author_share)
      if (st === 'payable') s.payable += Number(r.author_share)
      if (st === 'paid') s.paid += Number(r.author_share)
    }
    map.set(key, s)
  }
  return (Array.from(map.values()).map(s => Object.fromEntries(Object.entries(s).map(([k, v]) => [k, typeof v === 'number' ? round2(v) : v]))) as any[]).sort((a, b) => String(b.month).localeCompare(String(a.month)))
}

const csvCell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
export function ledgerCsv(rows: (LedgerRow & { author_name?: string; book_title?: string })[], now: Date): string {
  const head = ['date', 'author', 'book', 'order', 'part', 'source', 'currency', 'gross', 'payment_fee', 'net', 'author_share', 'company_share', 'status', 'payable_at', 'note']
  const lines = rows.map(r => [r.created_at.slice(0, 10), r.author_name || r.author_id, r.book_title || r.book_id, r.order_id.slice(0, 8), r.part, r.source, r.currency, r.gross, r.payment_fee, r.net, r.author_share, r.company_share, effectiveStatus(r, now), r.payable_at?.slice(0, 10) || '', r.note || ''].map(csvCell).join(','))
  return [head.join(','), ...lines].join('\n') + '\n'
}

/** What an author may be paid now: due entries not already in a payout, and whether the minimum is met */
export function payoutDecision(rows: LedgerRow[], minimum: number, now: Date) {
  const due = rows.filter(r => !r.payout_id && r.status !== 'reversed' && r.status !== 'paid' && ['payable'].includes(effectiveStatus(r, now)))
  const total = round2(due.reduce((s, r) => s + Number(r.author_share), 0))
  return { due, total, meetsMinimum: total >= minimum && total > 0 }
}
