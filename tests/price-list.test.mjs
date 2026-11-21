// Run with:  node --import ./scripts/alias-register.mjs --test tests/price-list.test.mjs
// Price List: book-print calculator, editorial example, flag behaviour and data sanity.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { calcPrint, editorialCost, roundPagesUp, bulkTier, parseCount, naira } from '../src/lib/price-list-calc.ts'
import {
  WORKED_EXAMPLES, LISTING_PACKAGES, packageFeatures, PREMIUM_OWN_STORE_LINE, EDITORIAL, EDITORIAL_EXAMPLE_WORDS,
  PAGE_RATES, BINDING_PER_COPY, EFFECTIVE, CONFIRMED, TERMS,
} from '../src/lib/price-list.ts'

const [ex1, ex2, ex3] = WORKED_EXAMPLES
const run = (o, over = {}) => calcPrint({ ...o, ...over })

test('verified examples at list price', () => {
  const a = run(ex1), b = run(ex2), c = run(ex3)
  assert.ok(a.ok && b.ok && c.ok)
  assert.equal(a.perCopy, 1940); assert.equal(a.listTotal, 194000)   // 120x12=1,440 + 500
  assert.equal(b.perCopy, 5600); assert.equal(b.listTotal, 560000)   // 200x25=5,000 + 600
  assert.equal(c.perCopy, 6800); assert.equal(c.listTotal, 340000)   // 100x60=6,000 + 800
})

test('examples with discounts applied', () => {
  const a = run(ex1)                       // 100 copies: 5% off
  assert.equal(a.discountPercent, 5); assert.equal(a.discountAmount, 9700); assert.equal(a.finalTotal, 184300)
  const b = run(ex2)                       // 100 copies: 5% off
  assert.equal(b.discountPercent, 5); assert.equal(b.discountAmount, 28000); assert.equal(b.finalTotal, 532000)
  const c = run(ex3)                       // 50 copies: no discount
  assert.equal(c.discountPercent, 0); assert.equal(c.discountAmount, 0); assert.equal(c.finalTotal, 340000)
  const c300 = run(ex3, { copies: 300 })   // 6,800 x 300 = 2,040,000, 10% = 204,000
  assert.equal(c300.listTotal, 2040000); assert.equal(c300.discountPercent, 10)
  assert.equal(c300.discountAmount, 204000); assert.equal(c300.finalTotal, 1836000)
})

test('odd page count rounds up to the next even number and says so', () => {
  const r = run(ex1, { pages: 121 })
  assert.equal(r.pagesEntered, 121); assert.equal(r.pagesBilled, 122); assert.equal(r.pagesRounded, true)
  assert.equal(r.perCopy, 122 * 12 + 500)
  const even = run(ex1, { pages: 120 })
  assert.equal(even.pagesRounded, false)
  assert.equal(roundPagesUp(1), 2); assert.equal(roundPagesUp(2), 2); assert.equal(roundPagesUp(999), 1000)
})

test('A4 cream is blocked with a contact message', () => {
  for (const colour of ['bw', 'colour']) {
    const r = calcPrint({ size: 'A4', paper: 'cream', colour, pages: 100, copies: 100 })
    assert.equal(r.ok, false); assert.equal(r.a4Cream, true)
    assert.match(r.errors.paper, /contact us for A4 cream/i)
  }
  assert.equal(PAGE_RATES.cream.A4, null)
})

test('bulk tiers at 99, 100, 299, 300, 499 and 500 copies', () => {
  const at = n => run(ex1, { copies: n })   // list per copy 1,940
  const r99 = at(99);   assert.equal(r99.discountPercent, 0);  assert.equal(r99.finalTotal, 1940 * 99)
  const r100 = at(100); assert.equal(r100.discountPercent, 5); assert.equal(r100.discountAmount, 9700); assert.equal(r100.finalTotal, 184300)
  const r299 = at(299); assert.equal(r299.discountPercent, 5); assert.equal(r299.listTotal, 580060)
  assert.equal(r299.discountAmount, 29003); assert.equal(r299.finalTotal, 551057)
  const r300 = at(300); assert.equal(r300.discountPercent, 10); assert.equal(r300.listTotal, 582000)
  assert.equal(r300.discountAmount, 58200); assert.equal(r300.finalTotal, 523800)
  const r499 = at(499); assert.equal(r499.discountPercent, 10); assert.equal(r499.listTotal, 968060)
  assert.equal(r499.discountAmount, 96806); assert.equal(r499.finalTotal, 871254)
  const r500 = at(500)   // custom quote: list total only, no discounted figure
  assert.equal(r500.customQuote, true); assert.equal(r500.listTotal, 970000)
  assert.equal(r500.finalTotal, null); assert.equal(r500.discountAmount, 0); assert.equal(r500.discountPercent, 0)
  assert.equal(bulkTier(1).percent, 0); assert.equal(bulkTier(100000).customQuote, true)
})

test('discount applies to pages and binding together; rounding is to the nearest naira, halves up', () => {
  // 1 page -> 2 billed pages, A5 white bw: 2x12 + 500 = 524 per copy; 100 copies = 52,400; 5% = 2,620
  const r = calcPrint({ size: 'A5', paper: 'white', colour: 'bw', pages: 1, copies: 100 })
  assert.equal(r.listTotal, 52400); assert.equal(r.discountAmount, 2620)
  // a case that lands on .5: list total 10 naira x 5% = 0.5 -> not reachable with real rates, so test the rule directly
  assert.equal(Math.round((10 * 5) / 100), 1)
  assert.ok(Number.isInteger(r.finalTotal))
})

test('validation: positive whole numbers and sensible maximums', () => {
  const bad = o => calcPrint({ ...ex1, ...o })
  for (const pages of [0, -4, 12.5, NaN]) assert.ok(bad({ pages }).errors.pages, `pages ${pages}`)
  for (const copies of [0, -1, 2.5, NaN]) assert.ok(bad({ copies }).errors.copies, `copies ${copies}`)
  assert.ok(bad({ pages: 1001 }).errors.pages); assert.ok(bad({ copies: 100001 }).errors.copies)
  assert.equal(bad({ pages: 1000, copies: 100000 }).ok, true)
  assert.ok(bad({ size: 'B5' }).errors.size); assert.ok(bad({ paper: 'glossy' }).errors.paper); assert.ok(bad({ colour: 'mixed' }).errors.colour)
  assert.equal(parseCount('120'), 120); assert.equal(parseCount(' 120 '), 120)
  for (const t of ['', 'abc', '12.5', '-3', '1e3', '1,000']) assert.ok(Number.isNaN(parseCount(t)), t)
})

test('every size and paper combination uses the list rates', () => {
  for (const paper of ['white', 'cream']) for (const size of ['A5', '6x9', 'A4']) for (const colour of ['bw', 'colour']) {
    const rates = PAGE_RATES[paper][size]
    const r = calcPrint({ size, paper, colour, pages: 100, copies: 1 })
    if (!rates) { assert.equal(r.ok, false); continue }
    assert.equal(r.perCopy, 100 * rates[colour] + BINDING_PER_COPY[size])
    if (colour === 'colour') assert.equal(rates.colour, rates.bw * 2, `${paper} ${size} colour is double`)
  }
})

test('editorial: 50,000 words = 100,000 / 150,000 / 250,000', () => {
  assert.equal(EDITORIAL_EXAMPLE_WORDS, 50000)
  const e = editorialCost(50000)
  assert.deepEqual(e, { proofreading: 100000, copyediting: 150000, both: 250000 })
  assert.deepEqual(EDITORIAL.map(x => x.perWord), [2, 3, 5])
  assert.equal(editorialCost(0), null); assert.equal(editorialCost(1.5), null); assert.equal(editorialCost(-5), null)
})

test('Premium own-store line is hidden by default and never mentions the PrintHub store', () => {
  assert.equal(PREMIUM_OWN_STORE_LINE, false)
  const premium = LISTING_PACKAGES.find(p => p.key === 'premium')
  const off = packageFeatures(premium)
  assert.ok(!off.some(t => /printhub|own-store|checkout/i.test(t)))
  assert.deepEqual(off, ['Everything in Standard', 'Bookstore outreach', 'Facebook and Instagram ad set-up', 'Press release', '3 months management'])
  const on = packageFeatures(premium, { PREMIUM_OWN_STORE_LINE: true })
  assert.ok(on.includes('Own-store listing with checkout (PrintHub)')); assert.equal(on.length, off.length + 1)
  for (const p of LISTING_PACKAGES.filter(p => p.key !== 'premium')) assert.deepEqual(packageFeatures(p), p.features.map(f => f.text))
})

test('data sanity: prices, date, owner-confirmed list', () => {
  assert.deepEqual(LISTING_PACKAGES.map(p => p.price), [60000, 180000, 450000])
  assert.equal(EFFECTIVE.label, 'November 2026')
  assert.deepEqual(CONFIRMED.map(u => u.key), ['binding', 'bulkTiers', 'deposit', 'contact'])
  assert.ok(TERMS.some(t => /50%/.test(t)))
  assert.equal(naira(1234567), '₦1,234,567'); assert.equal(naira(194000), '₦194,000')
})

test('price-list files contain no phone number, email address or attribution', () => {
  const files = ['../src/lib/price-list.ts', '../src/lib/price-list-calc.ts']
  for (const f of files) {
    const t = readFileSync(new URL(f, import.meta.url), 'utf8')
    assert.ok(!/\+?234\d{9,}|\b0[789]\d{9}\b|@[a-z0-9-]+\.[a-z]{2,}/i.test(t), `${f}: no contact details`)
    assert.ok(!/claude|anthropic|co-authored/i.test(t), `${f}: no attribution`)
  }
})
