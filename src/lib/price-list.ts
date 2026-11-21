// Publication Price List: the single source of truth for every figure, rate, tier, term and the effective date shown on
// /price-list. To change a price, edit it here and nowhere else. The page, the calculator and the tests all read this file.
// All amounts are Nigerian Naira (whole naira). Nothing on the price-list page is read from the database.
//
// This file is separate from the shop's own product pricing (database tables price_settings and spec_options). The two are
// NOT linked today; see the conflict list in the report that came with this change.

export const EFFECTIVE = { label: 'November 2026', iso: '2026-11' } as const

// ── Flags ────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Premium package line "Own-store listing with checkout (PrintHub)". Keep OFF until the books store is live. While it is
 * off, the line is removed and no text on the page mentions the PrintHub store.
 */
export const PREMIUM_OWN_STORE_LINE = false

// ── Owner confirmations ─────────────────────────────────────────────────────────────────────────────────────────────────────
// The owner confirmed these on 2026-11-21, "as written": binding prices per copy, the bulk-discount tiers on printing, the 50%
// deposit before production starts, and that the only contact is the WhatsApp number already configured in PrintHub
// (BRAND.whatsapp in src/lib/constants.ts). Nothing here is waiting on an answer.
export const CONFIRMED = [
  { key: 'binding', what: 'Cover & binding prices per copy (A5 500, 6x9 600, A4 800)' },
  { key: 'bulkTiers', what: 'Bulk-discount tiers on printing (100-299 5%, 300-499 10%, 500+ custom quote)' },
  { key: 'deposit', what: 'The 50% deposit before a production job starts' },
  { key: 'contact', what: 'Contact is the WhatsApp number already configured in PrintHub; no other number is stored here' },
] as const
export const CONFIRMED_ON = '2026-11-21'

// ── Book sizes, paper, colour ───────────────────────────────────────────────────────────────────────────────────────────────

export type Size = 'A5' | '6x9' | 'A4'
export type Paper = 'white' | 'cream'
export type ColourMode = 'bw' | 'colour'

export const SIZES: readonly Size[] = ['A5', '6x9', 'A4']
export const PAPERS: Record<Paper, string> = { white: 'White bond 80gsm', cream: 'Cream bond 80gsm' }
export const COLOUR_MODES: Record<ColourMode, string> = { bw: 'Black & white', colour: 'Colour' }

/** Inside pages, ₦ per page per copy. `null` means "on request" (not priced here). Colour is double the black & white rate. */
export const PAGE_RATES: Record<Paper, Record<Size, { bw: number; colour: number } | null>> = {
  white: {
    A5: { bw: 12, colour: 24 },
    '6x9': { bw: 15, colour: 30 },
    A4: { bw: 30, colour: 60 },
  },
  cream: {
    A5: { bw: 22, colour: 44 },
    '6x9': { bw: 25, colour: 50 },
    A4: null, // on request: the calculator blocks it and shows "contact us for A4 cream"
  },
}

/**
 * Cover & binding per copy: perfect binding, 250gsm laminated colour cover.
 * Confirmed by the owner on 2026-11-21.
 */
export const BINDING_PER_COPY: Record<Size, number> = { A5: 500, '6x9': 600, A4: 800 }
export const BINDING_DESCRIPTION = 'Perfect binding, 250gsm laminated colour cover'

/**
 * Bulk discount on printing, applied to the whole list total (pages and binding).
 * Confirmed by the owner on 2026-11-21.
 * `maxCopies: null` means no upper limit. `customQuote` tiers show the list total and no discounted figure.
 */
export const BULK_TIERS: readonly { minCopies: number; maxCopies: number | null; percent: number; customQuote?: boolean; label: string }[] = [
  { minCopies: 1, maxCopies: 99, percent: 0, label: 'Under 100 copies' },
  { minCopies: 100, maxCopies: 299, percent: 5, label: '100 to 299 copies' },
  { minCopies: 300, maxCopies: 499, percent: 10, label: '300 to 499 copies' },
  { minCopies: 500, maxCopies: null, percent: 0, customQuote: true, label: '500 copies and above' },
]

/** Input limits for the calculator (validation only, not prices). */
export const LIMITS = { minPages: 1, maxPages: 1000, minCopies: 1, maxCopies: 100000, maxWords: 2000000 } as const

/**
 * Rounding rule, shown on the page and used by the calculator: all inputs are whole numbers and all rates are whole naira,
 * so list totals are exact. The only rounding is the bulk-discount amount: it is rounded to the nearest whole naira
 * (halves round up), and the final total is the list total minus that rounded discount.
 */
export const ROUNDING_RULE = 'Amounts are in whole naira. The discount amount is rounded to the nearest naira (halves round up), and the final total is the list total minus that discount.'

// ── Publishing services ─────────────────────────────────────────────────────────────────────────────────────────────────────

export const ISBN_LEGAL_DEPOSIT = {
  name: 'ISBN & legal deposit',
  price: 30000,
  unit: 'per title',
  includes: ['ISBN assignment', 'Barcode', 'National Library registration', '3 legal-deposit copies'],
}

/** Editorial rates, ₦ per word. */
export const EDITORIAL = [
  { key: 'proofreading', name: 'Proofreading', perWord: 2 },
  { key: 'copyediting', name: 'Copyediting', perWord: 3 },
  { key: 'both', name: 'Copyedit + proofread', perWord: 5 },
] as const
export const EDITORIAL_EXAMPLE_WORDS = 50000

export const DESIGN_TYPESETTING = {
  interior: [
    { size: 'A5 or 6x9', perPage: 300 },
    { size: 'A4', perPage: 400 },
  ],
  interiorMinimum: 30000,
  ebook: { name: 'Ebook (EPUB) conversion', price: 30000 },
  covers: [
    { name: 'Cover, template-based', price: 25000, note: '' },
    { name: 'Cover, custom full wraparound', price: 60000, note: '2 revision rounds included' },
  ],
}

export interface ListingPackage {
  key: 'starter' | 'standard' | 'premium'
  name: string
  price: number
  /** `flag` marks a line that is shown only while that flag is on */
  features: { text: string; flag?: 'PREMIUM_OWN_STORE_LINE' }[]
}

export const LISTING_PACKAGES: readonly ListingPackage[] = [
  {
    key: 'starter', name: 'Starter', price: 60000,
    features: [
      { text: 'One platform (Amazon KDP or Selar)' },
      { text: "Account set-up in the author's name" },
      { text: 'Metadata and description' },
      { text: 'Upload and QA' },
    ],
  },
  {
    key: 'standard', name: 'Standard', price: 180000,
    features: [
      { text: 'KDP ebook and paperback' },
      { text: 'Selar listing' },
      { text: 'One ebook aggregator' },
      { text: 'Keywords and categories' },
      { text: 'Sales page' },
      { text: '5 launch graphics' },
    ],
  },
  {
    key: 'premium', name: 'Premium', price: 450000,
    features: [
      { text: 'Everything in Standard' },
      { text: 'Own-store listing with checkout (PrintHub)', flag: 'PREMIUM_OWN_STORE_LINE' },
      { text: 'Bookstore outreach' },
      { text: 'Facebook and Instagram ad set-up' },
      { text: 'Press release' },
      { text: '3 months management' },
    ],
  },
]

export const LISTING_ISBN_NOTE = 'ISBN is billed separately.'
export const MONTHLY_MANAGEMENT = { price: 30000, unit: 'per title per month', includes: 'Reporting, price and promo changes, metadata refresh' }
export const LISTING_ADDONS = [
  { name: 'Launch graphics (5)', price: 25000 },
  { name: 'Press release', price: 30000 },
  { name: 'Ad campaign set-up', price: 40000 },
  { name: 'Author sales page', price: 50000 },
] as const
export const LISTING_BUNDLE = { percent: 10, text: '10% off any listing package when the author also buys typesetting or printing from us.' }
export const LISTING_NOTES = [
  'Ad spend and platform commissions (KDP, Selar, aggregators) are paid to the platforms.',
  'The author owns all accounts and royalties.',
  'No guarantee of sales or rankings.',
]

/** The package's visible lines. Lines tied to a flag appear only when that flag is on (pass `flags` to test either state). */
export function packageFeatures(pkg: ListingPackage, flags: { PREMIUM_OWN_STORE_LINE: boolean } = { PREMIUM_OWN_STORE_LINE }): string[] {
  return pkg.features.filter(f => !f.flag || flags[f.flag]).map(f => f.text)
}

// ── Terms ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** The 50% deposit. Confirmed by the owner on 2026-11-21. */
export const DEPOSIT_PERCENT = 50

export const FORMULA = '(pages × rate per page) + binding = cost per copy; × copies = total'

export const TERMS: readonly string[] = [
  'Prices are per page per copy.',
  'The page count is rounded up to the next even number.',
  'The colour rate applies to each colour page. Books that mix colour and black & white pages are priced per page type and need a quotation.',
  'A proof copy is charged at the normal rate, and the print run starts after you approve it.',
  `Production jobs start on a ${DEPOSIT_PERCENT}% deposit, with the balance paid before delivery.`,
  'Prices are reviewed as paper costs change. The quotation confirms the final price and turnaround.',
]

/** What the owner's brief calls the three verified worked examples, at LIST price (before any bulk discount). */
export const WORKED_EXAMPLES = [
  { size: 'A5', paper: 'white', colour: 'bw', pages: 120, copies: 100 },
  { size: '6x9', paper: 'cream', colour: 'bw', pages: 200, copies: 100 },
  { size: 'A4', paper: 'white', colour: 'colour', pages: 100, copies: 50 },
] as const

// ── Contact ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// Contact line (confirmed 2026-11-21): no phone, email or address is stored here: the page uses the WhatsApp number already
// configured in PrintHub (BRAND.whatsapp in src/lib/constants.ts). Only the pre-filled message wording lives here.
export const WHATSAPP_MESSAGE = 'Hello, I would like a quote based on the PrintHub Price List (November 2026).'
