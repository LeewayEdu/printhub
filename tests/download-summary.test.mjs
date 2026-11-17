// Run with:  node --import ./scripts/alias-register.mjs --test tests/download-summary.test.mjs
// Admin order screen: ebook download count and last download time per entitlement. Counts only.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fakeDb } from './_fakedb.mjs'
import { ebookDownloadsForOrder } from '../src/lib/books/download-summary.ts'

const read = p => readFileSync(new URL(p, import.meta.url), 'utf8')
const world = () => ({
  entitlements: [
    { id: 'e1', order_id: 'o1', book_id: 'b1', download_count: 0, revoked_at: null },
    { id: 'e2', order_id: 'o1', book_id: 'b2', download_count: 2, revoked_at: null },
    { id: 'e3', order_id: 'o2', book_id: 'b1', download_count: 5, revoked_at: null },
  ],
  books: [{ id: 'b1', title: 'One' }, { id: 'b2', title: 'Two' }],
  download_log: [
    { entitlement_id: 'e2', downloaded_at: '2026-05-01T10:00:00Z', ip_hash: 'secret-hash', user_agent: 'Mozilla' },
    { entitlement_id: 'e2', downloaded_at: '2026-05-03T09:30:00Z', ip_hash: 'secret-hash', user_agent: 'Mozilla' },
    { entitlement_id: 'e3', downloaded_at: '2026-05-09T09:30:00Z' },
  ],
})

test('shows the count and the latest download time per ebook, for this order only', async () => {
  const rows = await ebookDownloadsForOrder(fakeDb(world()), 'o1')
  assert.deepEqual(rows.map(r => [r.title, r.downloads, r.lastDownloadedAt]), [['One', 0, null], ['Two', 2, '2026-05-03T09:30:00Z']])
})
test('an order without ebooks returns nothing, and a withdrawn entitlement is marked', async () => {
  assert.deepEqual(await ebookDownloadsForOrder(fakeDb(world()), 'o-none'), [])
  const w = world(); w.entitlements[1].revoked_at = '2026-06-01T00:00:00Z'
  assert.equal((await ebookDownloadsForOrder(fakeDb(w), 'o1'))[1].revoked, true)
})
test('only counts and times come back: no IP hash, browser details or buyer details', async () => {
  const rows = await ebookDownloadsForOrder(fakeDb(world()), 'o1')
  assert.deepEqual(Object.keys(rows[1]).sort(), ['downloads', 'entitlementId', 'lastDownloadedAt', 'revoked', 'title'])
  assert.ok(!/secret-hash|Mozilla/.test(JSON.stringify(rows)))
})
test('the route is admin-only and read-only; the screen shows it only inside the admin orders page', () => {
  const route = read('../src/app/api/admin/orders/downloads/route.ts')
  assert.match(route, /requireAdmin\(req\)/); assert.match(route, /isResponse\(auth\)/)
  assert.ok(!/export async function (POST|PUT|PATCH|DELETE)/.test(route))
  assert.match(read('../src/app/dashboard/admin/orders/page.tsx'), /<EbookDownloads orderId=\{order\.id\} \/>/)
  assert.ok(!/downloads/.test(read('../src/app/dashboard/orders/page.tsx')), 'the customer order page does not call it')
})
test('the ebook size limit stays at 30 MB, set in the database', () => {
  assert.match(read('../books-1b-migration.sql'), /max_ebook_mb integer not null default 30/)
})
