// Server-side price check for book lines. Books are priced from book_formats ONLY (never from the
// browser), in the order's currency, with a small tolerance, exactly like product lines.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Currency, FormatType } from './types'
import { PRICE_TOLERANCE_NGN, PRICE_TOLERANCE_USD, round2, unitPrice, usdAvailable } from './currency'

export const MAX_PRINT_QTY = 50

export interface BookCartLine { index: number; bookFormatId: string; quantity: number; claimed: number; name?: string }
export interface PricedBookLine {
  index: number; bookId: string; formatId: string; type: FormatType; title: string
  unit: number; quantity: number; total: number
}
export type BookPricing =
  | { ok: true; lines: PricedBookLine[]; total: number; hasPhysical: boolean }
  | { ok: false; error: 'books_unavailable' | 'book_not_found' | 'bad_quantity' | 'out_of_stock' | 'currency_not_available' | 'price_mismatch'; detail: string; index?: number }

export async function priceBookLines(db: SupabaseClient, lines: BookCartLine[], currency: Currency, enabled: boolean): Promise<BookPricing> {
  const ids = Array.from(new Set(lines.map(l => l.bookFormatId)))
  const { data, error } = await db.from('book_formats')
    .select('id, book_id, type, price_ngn, price_usd, stock, active, books(id, title, status)')
    .in('id', ids)
  if (error || !data) return { ok: false, error: 'books_unavailable', detail: 'Could not load book prices to verify the order' }
  const byId = new Map<string, any>(data.map((f: any) => [f.id, f]))

  const priced: PricedBookLine[] = []
  let total = 0
  let hasPhysical = false
  for (const l of lines) {
    const f = byId.get(l.bookFormatId)
    const book = Array.isArray(f?.books) ? f.books[0] : f?.books
    if (!f || !f.active || !book || book.status !== 'published') {
      return { ok: false, error: 'book_not_found', detail: 'A book in your cart is no longer available', index: l.index }
    }
    const qty = Number(l.quantity)
    const maxQty = f.type === 'ebook' ? 1 : MAX_PRINT_QTY
    if (!Number.isInteger(qty) || qty < 1 || qty > maxQty) {
      return { ok: false, error: 'bad_quantity', detail: `Quantity for ${book.title} must be between 1 and ${maxQty}`, index: l.index }
    }
    if (f.type !== 'ebook' && f.stock != null && qty > Number(f.stock)) {
      return { ok: false, error: 'out_of_stock', detail: `Only ${f.stock} copies of ${book.title} are in stock`, index: l.index }
    }
    if (currency === 'USD' && !usdAvailable(f, enabled)) {
      return { ok: false, error: 'currency_not_available', detail: `${book.title} is not sold in USD`, index: l.index }
    }
    const unit = unitPrice(f, currency)
    if (unit == null) return { ok: false, error: 'currency_not_available', detail: `${book.title} has no ${currency} price`, index: l.index }
    const lineTotal = round2(unit * qty)
    const tol = currency === 'USD' ? PRICE_TOLERANCE_USD : PRICE_TOLERANCE_NGN
    if (!Number.isFinite(Number(l.claimed)) || Math.abs(Number(l.claimed) - lineTotal) > tol) {
      return { ok: false, error: 'price_mismatch', detail: `Price for ${book.title} changed (expected ${lineTotal})`, index: l.index }
    }
    if (f.type !== 'ebook') hasPhysical = true
    priced.push({ index: l.index, bookId: f.book_id, formatId: f.id, type: f.type, title: book.title, unit, quantity: qty, total: lineTotal })
    total = round2(total + lineTotal)
  }
  return { ok: true, lines: priced, total, hasPhysical }
}
