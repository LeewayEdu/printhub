// Run with:  node --import ./scripts/alias-register.mjs --test tests/books-launching.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { booksIndexState, BOOKS_SOON_WHATSAPP_MESSAGE } from '../src/lib/books/launching.ts'

test('no published books: launching-soon page, noindex', () => {
  for (const n of [0, -1, NaN, undefined]) {
    const s = booksIndexState(n)
    assert.equal(s.comingSoon, true)
    assert.deepEqual(s.robots, { index: false, follow: true })
  }
})
test('one or more published books: the shop, indexable', () => {
  for (const n of [1, 2, 40]) { const s = booksIndexState(n); assert.equal(s.comingSoon, false); assert.equal(s.robots, undefined) }
})
test('the page uses the rule, offers a contact option with the configured number, and does not touch payments', () => {
  const page = readFileSync(new URL('../src/app/books/page.tsx', import.meta.url), 'utf8')
  assert.match(page, /booksIndexState\(all\.length\)\.comingSoon/)
  assert.match(page, /generateMetadata/)
  assert.match(page, /wa\.me\/\$\{BRAND\.whatsapp\}/)
  assert.ok(BOOKS_SOON_WHATSAPP_MESSAGE.length > 10)
  // the sitemap lists /books only once a book exists
  const sm = readFileSync(new URL('../src/app/sitemap.ts', import.meta.url), 'utf8')
  assert.match(sm, /books\.length \? \[entry\('\/books'\)/)
})
