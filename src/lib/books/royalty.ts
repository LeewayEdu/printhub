// Royalty ledger maths. Pure functions: every percentage comes from a royalty_rules row (the database),
// none is written in code. Amounts are in the order's currency, rounded to 2 decimals, and the
// author share plus the company share always add up to the net.

import { round2 } from './currency'

export interface RoyaltyRule {
  book_id: string | null
  option_key?: string | null
  ebook_author_share_pct: number | null
  print_author_share_pct: number | null
  referral_share_pct: number | null
  hold_days: number
  minimum_payout: number
}

/**
 * The book's own override if it has one, otherwise the rule for the book's royalty option ('distribution' by
 * default, 'package' for books published through a C-Chu publishing package), otherwise none. A book on an
 * option whose rule has not been set gets NO rule (flagged in the ledger); it never silently falls back.
 */
export function pickRule(rules: RoyaltyRule[], bookId: string, optionKey: string = 'distribution'): RoyaltyRule | null {
  return rules.find(r => r.book_id === bookId)
    || rules.find(r => r.book_id == null && r.option_key === optionKey)
    || (optionKey === 'distribution' ? rules.find(r => r.book_id == null && r.option_key == null) : undefined)
    || null
}

/** Author share of a print sale: pct % of (net minus print cost), never below 0. */
export function printAuthorShare(net: number, quantity: number, costPerCopy: number, pct: number): number {
  return round2(Math.max(0, round2(net - round2(costPerCopy * quantity))) * Number(pct) / 100)
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
  /** 'needs_print_cost' when a print part could not be computed because the book has no print cost yet */
  flag: string | null
}

function onePart(part: 'ebook' | 'print', gross: number, fee: number, i: RoyaltyPartInput): RoyaltyPart {
  const net = round2(gross - fee)
  const rule = i.rule
  const normalPct = part === 'ebook' ? rule?.ebook_author_share_pct : rule?.print_author_share_pct
  // The referral share applies to EBOOK sales only (own link or code); print uses the normal print share
  const usingReferral = part === 'ebook' && i.referral && rule?.referral_share_pct != null
  const pct = usingReferral ? rule!.referral_share_pct : normalPct
  const notes: string[] = []
  if (!rule) notes.push('no royalty rule configured')
  else if (pct == null) notes.push(`no ${part} share set in the rule`)
  if (i.orderFee === 0) notes.push('payment fee not reported, 0 used')
  let author = 0
  let flag: string | null = null
  if (part === 'print' && i.printCostPerCopy == null) {
    // Never guess a cost: record the sale, give the author 0 for now and flag it until the cost is set
    flag = 'needs_print_cost'
    notes.unshift('needs print cost')
  } else if (pct != null) {
    author = part === 'print' ? printAuthorShare(net, i.quantity, i.printCostPerCopy as number, Number(pct)) : round2(net * Number(pct) / 100)
  }
  return {
    part, gross: round2(gross), payment_fee: round2(fee), net,
    author_share: author, company_share: round2(net - author),
    source: usingReferral ? 'referral' : 'store', note: notes.length ? notes.join('; ') : null, flag,
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
  flag?: string | null
  rate_to_ngn?: number | null
  author_share_ngn?: number | null
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
    const s = map.get(key) || { author_id: r.author_id, month, currency: r.currency, entries: 0, gross: 0, payment_fee: 0, net: 0, author_share: 0, company_share: 0, pending: 0, payable: 0, paid: 0, flagged: 0, author_share_ngn: 0 }
    const st = effectiveStatus(r, now)
    if (st !== 'reversed') {
      if (r.flag) s.flagged++
      s.author_share_ngn += nairaShare(r) ?? 0
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
  const head = ['date', 'author', 'book', 'order', 'part', 'source', 'currency', 'gross', 'payment_fee', 'net', 'author_share', 'rate_to_ngn', 'author_share_ngn', 'company_share', 'status', 'payable_at', 'flag', 'note']
  const lines = rows.map(r => [r.created_at.slice(0, 10), r.author_name || r.author_id, r.book_title || r.book_id, r.order_id.slice(0, 8), r.part, r.source, r.currency, r.gross, r.payment_fee, r.net, r.author_share, r.rate_to_ngn ?? '', nairaShare(r) ?? '', r.company_share, effectiveStatus(r, now), r.payable_at?.slice(0, 10) || '', r.flag || '', r.note || ''].map(csvCell).join(','))
  return [head.join(','), ...lines].join('\n') + '\n'
}

/** The naira the author is owed for an entry: the stored naira amount (rate actually received), or the share itself for a naira sale. */
export const nairaShare = (r: { currency?: string | null; author_share: number; author_share_ngn?: number | null }): number | null =>
  r.author_share_ngn != null ? Number(r.author_share_ngn) : (r.currency == null || r.currency === 'NGN') ? Number(r.author_share) : null   // a row with no currency is naira (the column default)

/** What an author may be paid now: due entries not already in a payout, and whether the minimum is met */
export function payoutDecision(rows: LedgerRow[], minimum: number, now: Date) {
  // flagged entries (for example "needs print cost") are held back until the flag is cleared
  const due = rows.filter(r => !r.flag && !r.payout_id && r.status !== 'reversed' && r.status !== 'paid' && ['payable'].includes(effectiveStatus(r, now)))
  // authors are paid in NAIRA, at the rate actually received: an entry with no naira amount yet is not payable
  const payable = due.filter(r => nairaShare(r) != null)
  const total = round2(payable.reduce((s, r) => s + (nairaShare(r) as number), 0))
  return { due: payable, total, meetsMinimum: total >= minimum && total > 0 }
}
