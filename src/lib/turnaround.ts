// "Typical turnaround" shown on product pages.
//  1. A turnaround stored on the product itself always wins (a bare range such as "2-3"
//     gets " days" added).
//  2. Otherwise, products for book publishing, shirts and stickers get the general
//     window below (value supplied by the business owner).
//  3. Everything else shows no turnaround line at all.

export const GENERAL_TURNAROUND = {
  text: '2-5 days',
  nameMatch: /shirt|sticker|book/i,   // product names
  categories: ['book_printing'],      // product types
}

type P = { name?: string | null; product_type?: string | null; turnaround_time?: string | null }

export function turnaroundFor(p: P): string | null {
  const stored = p.turnaround_time?.trim()
  if (stored) return /^\d+\s*[-–]\s*\d+$/.test(stored) ? `${stored} days` : stored
  if ((p.name && GENERAL_TURNAROUND.nameMatch.test(p.name)) || (p.product_type && GENERAL_TURNAROUND.categories.includes(p.product_type))) {
    return GENERAL_TURNAROUND.text
  }
  return null
}
