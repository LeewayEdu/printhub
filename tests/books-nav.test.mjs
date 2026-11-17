// Run with:  node --import ./scripts/alias-register.mjs --test tests/books-nav.test.mjs
// The Books menu and footer links are behind BOOKS_NAV_ENABLED (default false).
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const load = async (value) => {
  if (value === undefined) delete process.env.NEXT_PUBLIC_BOOKS_NAV_ENABLED; else process.env.NEXT_PUBLIC_BOOKS_NAV_ENABLED = value
  return import(`../src/lib/constants.ts?flag=${String(value)}`)
}

test('by default there is no Books link in the menu', async () => {
  const c = await load(undefined)
  assert.equal(c.BOOKS_NAV_ENABLED, false)
  assert.ok(!c.NAV_LINKS.some(l => /books/i.test(l.label) || l.href === '/books'))
})
test('"false" and anything other than "true" keep it off', async () => {
  assert.equal((await load('false')).BOOKS_NAV_ENABLED, false)
  assert.equal((await load('1')).BOOKS_NAV_ENABLED, false)
})
test('with the flag on, "Books" appears once in the menu, and every existing link is still there', async () => {
  const on = await load('true'), off = await load('false')
  assert.equal(on.NAV_LINKS.filter(l => l.href === '/books').length, 1)
  assert.deepEqual(on.NAV_LINKS.filter(l => l.href !== '/books'), off.NAV_LINKS)
})
test('the flag is wired from BOOKS_NAV_ENABLED (default false) and the footer uses it', () => {
  const cfg = readFileSync(new URL('../next.config.js', import.meta.url), 'utf8')
  assert.match(cfg, /NEXT_PUBLIC_BOOKS_NAV_ENABLED: process\.env\.BOOKS_NAV_ENABLED === 'true' \? 'true' : 'false'/)
  const footer = readFileSync(new URL('../src/components/layout/Footer.tsx', import.meta.url), 'utf8')
  assert.match(footer, /BOOKS_NAV_ENABLED \? \[\{ label: 'Books', href: '\/books' \}\] : \[\]/)
})
