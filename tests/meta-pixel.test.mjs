// Run with:  node --import ./scripts/alias-register.mjs --test tests/meta-pixel.test.mjs
// The Meta Pixel loads for every visitor with no consent banner. Staff pages are excluded. Event payloads carry no personal data.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync, readdirSync } from 'node:fs'

const read = p => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const pixel = read('src/components/analytics/MetaPixel.tsx')

test('the consent banner and its stored-choice helpers are gone', () => {
  assert.equal(existsSync(new URL('../src/components/analytics/ConsentBanner.tsx', import.meta.url)), false)
  assert.equal(existsSync(new URL('../src/components/analytics/consent.ts', import.meta.url)), false)
  assert.doesNotMatch(read('src/app/layout.tsx'), /ConsentBanner/)
  assert.doesNotMatch(pixel, /consent/i)
  assert.doesNotMatch(pixel, /localStorage/)
})

test('the pixel loads without any choice from the visitor, and PageView stays', () => {
  assert.match(pixel, /if \(!META_PIXEL_ID \|\| isTrackingExcluded\(pathname\)\) return null/)
  assert.match(pixel, /fbq\('init', '\$\{META_PIXEL_ID\}'\)/)
  assert.match(pixel, /fbq\('track', 'PageView'\)/)
  assert.match(pixel, /fbPageview\(\)/)
  assert.match(read('src/app/layout.tsx'), /<MetaPixel \/>/)
})

test('admin and dashboard-admin pages are excluded', async () => {
  const src = pixel.slice(pixel.indexOf('export function isTrackingExcluded'), pixel.indexOf('// Fires PageView'))
  const fn = new Function(`${src.replace('export function', 'function').replace(/: string \| null/, '').replace(/\): boolean/, ')')}; return isTrackingExcluded`)()
  for (const p of ['/admin', '/admin/x', '/dashboard/admin', '/dashboard/admin/orders']) assert.equal(fn(p), true, p)
  for (const p of ['/', '/products/a', '/checkout', '/dashboard', '/dashboard/orders', '/administer', '/shop']) assert.equal(fn(p), false, p)
})

test('pixel events carry no email, phone or name fields', () => {
  const files = ['src/app/products/[slug]/ProductPageClient.tsx', 'src/app/auth/page.tsx', 'src/app/checkout/page.tsx']
  for (const f of files) {
    for (const m of read(f).matchAll(/fbTrack\([^\n]*\)/g)) {
      assert.doesNotMatch(m[0], /email|phone|full_?name|first_?name|last_?name|\bname:\s*(user|form|profile)/i, `${f}: ${m[0]}`)
    }
  }
})
