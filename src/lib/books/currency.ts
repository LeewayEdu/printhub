// Currency rules for books. NGN is the default. USD is offered only when ALL of these hold:
//   * the BOOKS_USD_ENABLED flag is "true"
//   * the visitor is outside Nigeria (Vercel's x-vercel-ip-country header)
//   * the format is an ebook with a price_usd
// Print books and bundles are Nigeria-only and always NGN. Used by the storefront (to choose what to
// show) and by the server price check (to re-verify what the order claims).

import type { BookFormatPublic, Currency } from './types'

export const PRICE_TOLERANCE_NGN = 1
export const PRICE_TOLERANCE_USD = 0.01

export function usdEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.BOOKS_USD_ENABLED === 'true'
}

export function visitorCountry(headers: Headers): string | null {
  const c = headers.get('x-vercel-ip-country')
  return c ? c.trim().toUpperCase() : null
}

/** Unknown country counts as Nigeria (NGN, print available): the safe default for local visitors. */
export const isInternational = (country: string | null) => !!country && country !== 'NG'
export const canShipPrintTo = (country: string | null) => !isInternational(country)

export function usdAvailable(format: Pick<BookFormatPublic, 'type' | 'price_usd'>, enabled: boolean): boolean {
  return enabled && format.type === 'ebook' && format.price_usd != null && Number(format.price_usd) > 0
}

export function displayCurrency(format: Pick<BookFormatPublic, 'type' | 'price_usd'>, country: string | null, enabled: boolean): Currency {
  return isInternational(country) && usdAvailable(format, enabled) ? 'USD' : 'NGN'
}

export function unitPrice(format: Pick<BookFormatPublic, 'price_ngn' | 'price_usd'>, currency: Currency): number | null {
  if (currency === 'USD') return format.price_usd == null ? null : Number(format.price_usd)
  return Number(format.price_ngn)
}

export function formatMoney(amount: number, currency: Currency): string {
  return currency === 'USD'
    ? `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `₦${amount.toLocaleString('en-NG', { maximumFractionDigits: 0 })}`
}

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100
export const toMinorUnits = (amount: number) => Math.round(amount * 100)   // kobo and cents both
