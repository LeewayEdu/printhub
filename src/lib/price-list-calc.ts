// Pure calculation for the Price List page: book-print estimate and editorial cost. No React, no database.
// Every rate and tier comes from src/lib/price-list.ts. The figure is an estimate; the quotation confirms the final price.

import {
  PAGE_RATES, BINDING_PER_COPY, BULK_TIERS, LIMITS, EDITORIAL,
  type Size, type Paper, type ColourMode,
} from '@/lib/price-list'

export interface PrintInput { size: Size; paper: Paper; colour: ColourMode; pages: number; copies: number }

export type PrintField = 'size' | 'paper' | 'colour' | 'pages' | 'copies'
export type PrintResult =
  | {
      ok: true
      pagesEntered: number
      pagesBilled: number          // rounded up to the next even number
      pagesRounded: boolean
      ratePerPage: number
      binding: number
      perCopy: number
      listTotal: number
      tierLabel: string
      discountPercent: number      // 0 below 100 copies and for the custom-quote tier
      discountAmount: number
      finalTotal: number | null    // null when the tier is "custom quote"
      customQuote: boolean
    }
  | { ok: false; errors: Partial<Record<PrintField, string>>; a4Cream?: boolean }

const group = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',')

export const A4_CREAM_MESSAGE = 'Contact us for A4 cream: it is priced on request.'

/** Next even number at or above `pages` (1 becomes 2, 121 becomes 122, 120 stays 120). */
export function roundPagesUp(pages: number): number {
  return pages % 2 === 0 ? pages : pages + 1
}

/** The bulk tier for a number of copies. */
export function bulkTier(copies: number) {
  return BULK_TIERS.find(t => copies >= t.minCopies && (t.maxCopies === null || copies <= t.maxCopies)) || BULK_TIERS[0]
}

/** Whole-naira rounding for a discount: nearest naira, halves round up. */
export function roundNaira(n: number): number {
  return Math.round(n)
}

/** Read a typed count. Returns NaN unless the text is a whole number made of digits only (no decimals, signs, letters, blanks). */
export function parseCount(text: string | number): number {
  if (typeof text === 'number') return Number.isInteger(text) ? text : NaN
  const t = text.trim()
  return /^\d+$/.test(t) ? Number(t) : NaN
}

export function calcPrint(input: PrintInput): PrintResult {
  const errors: Partial<Record<PrintField, string>> = {}
  const { size, paper, colour, pages, copies } = input

  if (!(size in BINDING_PER_COPY)) errors.size = 'Choose a size.'
  if (paper !== 'white' && paper !== 'cream') errors.paper = 'Choose a paper.'
  if (colour !== 'bw' && colour !== 'colour') errors.colour = 'Choose black & white or colour.'

  if (!Number.isInteger(pages) || pages < LIMITS.minPages) errors.pages = 'Enter the number of pages as a whole number, 1 or more.'
  else if (pages > LIMITS.maxPages) errors.pages = `For more than ${group(LIMITS.maxPages)} pages, contact us for a quote.`

  if (!Number.isInteger(copies) || copies < LIMITS.minCopies) errors.copies = 'Enter the number of copies as a whole number, 1 or more.'
  else if (copies > LIMITS.maxCopies) errors.copies = `For more than ${group(LIMITS.maxCopies)} copies, contact us for a quote.`

  const rates = !errors.size && !errors.paper && !errors.colour ? PAGE_RATES[paper][size] : undefined
  if (!errors.size && !errors.paper && !errors.colour && !rates) {
    return { ok: false, errors: { ...errors, paper: A4_CREAM_MESSAGE }, a4Cream: true }
  }
  if (Object.keys(errors).length || !rates) return { ok: false, errors }

  const pagesBilled = roundPagesUp(pages)
  const ratePerPage = rates[colour]
  const binding = BINDING_PER_COPY[size]
  const perCopy = pagesBilled * ratePerPage + binding
  const listTotal = perCopy * copies
  const tier = bulkTier(copies)
  const customQuote = !!tier.customQuote
  const discountPercent = customQuote ? 0 : tier.percent
  const discountAmount = customQuote ? 0 : roundNaira((listTotal * discountPercent) / 100)
  return {
    ok: true, pagesEntered: pages, pagesBilled, pagesRounded: pagesBilled !== pages, ratePerPage, binding, perCopy, listTotal,
    tierLabel: tier.label, discountPercent, discountAmount,
    finalTotal: customQuote ? null : listTotal - discountAmount,
    customQuote,
  }
}

/** Editorial cost for a word count at each of the three rates. Returns null unless words is a whole number of 1 or more. */
export function editorialCost(words: number): { proofreading: number; copyediting: number; both: number } | null {
  if (!Number.isInteger(words) || words < 1 || words > LIMITS.maxWords) return null
  const rate = (k: string) => EDITORIAL.find(e => e.key === k)!.perWord
  return { proofreading: words * rate('proofreading'), copyediting: words * rate('copyediting'), both: words * rate('both') }
}

/** 1234567 -> "₦1,234,567" (fixed grouping, so the server and browser always print the same text) */
export function naira(n: number): string {
  return '₦' + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}
