// Run with:  node --import ./scripts/alias-register.mjs --test tests/shop-mobile-layout.test.mjs
// /shop must not scroll sideways on a phone: the product column can shrink below its content (minmax(0, 1fr)) so the
// scrollable category-chip row stays inside it. Found by the site crawl 2026-11-21 (page was about 3,000px wide at 375px).
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const src = readFileSync(new URL('../src/app/shop/ShopPageClient.tsx', import.meta.url), 'utf8')
test('the shop grid columns can shrink (minmax(0, 1fr)) on desktop and phone', () => {
  assert.match(src, /gridTemplateColumns: '240px minmax\(0, 1fr\)'/)
  assert.match(src, /\.shop-layout \{ grid-template-columns: minmax\(0, 1fr\) !important; \}/)
  assert.match(src, /\.shop-layout > div:last-child \{[^}]*min-width: 0 !important/)
})
test('the chip row keeps its own horizontal scroll', () => {
  assert.match(src, /\.cat-chips \{[^}]*overflow-x: auto/)
})
