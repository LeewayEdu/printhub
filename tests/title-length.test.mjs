// Run with:  node --import ./scripts/alias-register.mjs --test tests/title-length.test.mjs
// Page <title> stays at 60 characters or less once the layout adds " | PrintHub"; short titles are untouched.
import test from 'node:test'
import assert from 'node:assert/strict'
import { shortenTitle, pageMetadata, MAX_TITLE } from '../src/lib/seo-meta.ts'

const LONG = [
  'Customized Shawarma Wrapping Paper – Branded Food-Grade Shawarma & Fast Food Wraps',
  'Plastic Table Stands – Custom Tabletop Display & Promotional Sign Holders',
  'Business Card Printing – Custom Corporate & Personal Business Cards',
  'Roll-Up Banner Printing – Portable Pull-Up Advertising Display Stand',
  'Banner Printing – Indoor & Outdoor Promotional Banners',
  'Magazine Printing – Custom Magazine & Periodical Printing | PrintHub',
  'A Very Long Product Name Without Any Dash That Keeps Going On And On Past The Limit',
]

test('long titles fit in 60 characters with the PrintHub suffix and keep the product name', () => {
  for (const t of LONG) {
    const s = shortenTitle(t)
    assert.ok(`${s} | PrintHub`.length <= MAX_TITLE, `"${s}" is ${s.length + 11} with suffix`)
    assert.ok(s.length > 0)
  }
  assert.equal(shortenTitle(LONG[2]), 'Business Card Printing – Custom Corporate')
  assert.ok(shortenTitle(LONG[3]).startsWith('Roll-Up Banner Printing'))
  assert.ok(shortenTitle(LONG[1]).startsWith('Plastic Table Stands'))
  assert.ok(shortenTitle(LONG[5]).startsWith('Magazine Printing'))
})

test('titles that already fit are unchanged', () => {
  for (const t of ['Print Products', 'Price List: Book Publishing & Printing', 'Election Campaign Printing — Posters & Shirts']) {
    assert.equal(shortenTitle(t), t)
  }
})

test('a long name with no dash is cut at a whole word', () => {
  const s = shortenTitle(LONG[6])
  assert.ok(LONG[6].startsWith(s))
  assert.ok(!/\s$/.test(s))
})

test('pageMetadata shortens the <title> but keeps the full wording for social cards', () => {
  const m = pageMetadata({ title: LONG[2], description: 'x'.repeat(130), path: '/products/x' })
  assert.equal(m.title, 'Business Card Printing – Custom Corporate')
  assert.match(String(m.openGraph.title), /Custom Corporate & Personal Business Cards \| PrintHub$/)
})
