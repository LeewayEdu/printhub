// Run with:  node --import ./scripts/alias-register.mjs --test tests/delivery-required.test.mjs
// Every order with a physical item (printed product or print book) must name a delivery option; the fee comes
// from the delivery table. Digital-only orders skip delivery. Free pickup is a valid choice.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fakeDb } from './_fakedb.mjs'
import { priceOrder, resolveDelivery } from '../src/lib/order-pricing.ts'

const tables = () => ({
  book_formats: [
    { id: 'fe', book_id: 'b1', type: 'ebook', price_ngn: 2500, price_usd: null, stock: null, active: true, books: { id: 'b1', title: 'One', status: 'published' } },
    { id: 'fp', book_id: 'b1', type: 'print', price_ngn: 5000, price_usd: null, stock: 10, active: true, books: { id: 'b1', title: 'One', status: 'published' } },
  ],
  delivery_settings: [
    { id: 'pickup', name: 'Karu office', type: 'pickup', price: 0, is_active: true },
    { id: 'abuja', name: 'Abuja', type: 'local', price: 1500, is_active: true },
    { id: 'old', name: 'Retired option', type: 'local', price: 100, is_active: false },
  ],
})
const ebook = { kind: 'book', bookFormatId: 'fe', quantity: 1, price: 2500, name: 'One (Ebook)' }
const print = { kind: 'book', bookFormatId: 'fp', quantity: 1, price: 5000, name: 'One (Print)' }
const product = { productId: 'p1', name: 'Business cards', price: 13975, specs: { Quantity: '100' } }

test('a physical order (print book) without a delivery option is rejected', async () => {
  const r = await priceOrder(fakeDb(tables()), { items: [print], total: 5000 })
  assert.equal(r.ok, false); assert.equal(r.error, 'invalid_delivery'); assert.match(r.detail, /delivery option/i)
})
test('a printed PRODUCT order without a delivery option is rejected before any price is loaded', async () => {
  const r = await priceOrder(fakeDb(tables()), { items: [product], total: 13975 })
  assert.equal(r.ok, false); assert.equal(r.error, 'invalid_delivery')
})
test('an ebook-only order passes with no delivery option, and ignores one if sent', async () => {
  const a = await priceOrder(fakeDb(tables()), { items: [ebook], total: 2500 })
  assert.equal(a.ok, true); assert.equal(a.deliveryFee, 0); assert.equal(a.total, 2500); assert.equal(a.delivery, null)
  const b = await priceOrder(fakeDb(tables()), { items: [ebook], deliveryId: 'abuja', total: 2500 })
  assert.equal(b.ok, true); assert.equal(b.deliveryFee, 0, 'a digital order never pays for delivery')
})
test('a mixed order (ebook + print book) requires a delivery option, and then charges the table fee', async () => {
  const missing = await priceOrder(fakeDb(tables()), { items: [ebook, print], total: 7500 })
  assert.equal(missing.ok, false); assert.equal(missing.error, 'invalid_delivery')
  const ok = await priceOrder(fakeDb(tables()), { items: [ebook, print], deliveryId: 'abuja', total: 9000 })
  assert.equal(ok.ok, true); assert.equal(ok.deliveryFee, 1500); assert.equal(ok.total, 9000)
})
test('free pickup is a valid choice and costs nothing', async () => {
  const r = await priceOrder(fakeDb(tables()), { items: [print], deliveryId: 'pickup', total: 5000 })
  assert.equal(r.ok, true); assert.equal(r.deliveryFee, 0); assert.equal(r.delivery.type, 'pickup')
})
test('a tampered delivery fee is rejected (claiming free delivery to Abuja)', async () => {
  const r = await priceOrder(fakeDb(tables()), { items: [print], deliveryId: 'abuja', total: 5000 })
  assert.equal(r.ok, false); assert.equal(r.error, 'price_mismatch')
  const honest = await priceOrder(fakeDb(tables()), { items: [print], deliveryId: 'abuja', total: 6500 })
  assert.equal(honest.ok, true); assert.equal(honest.deliveryFee, 1500)
})
test('an unknown or retired delivery option is rejected', async () => {
  for (const id of ['nope', 'old']) {
    const r = await priceOrder(fakeDb(tables()), { items: [print], deliveryId: id, total: 5100 })
    assert.equal(r.ok, false); assert.equal(r.error, 'invalid_delivery', id)
  }
})
test('resolveDelivery: the rule in one place', async () => {
  const db = fakeDb(tables())
  assert.deepEqual(await resolveDelivery(db, false, undefined), { ok: true, delivery: null, fee: 0 })
  assert.equal((await resolveDelivery(db, true, undefined)).ok, false)
  assert.equal((await resolveDelivery(db, true, '')).ok, false)
  assert.equal((await resolveDelivery(db, true, 'abuja')).fee, 1500)
})
test('the browser also refuses to place a physical order without a delivery choice, and the server derives pickup vs home from the priced row', () => {
  const checkout = readFileSync(new URL('../src/app/checkout/page.tsx', import.meta.url), 'utf8')
  assert.match(checkout, /if \(!digitalOnly && !selectedDelivery\) throw new Error\('Please choose a delivery option/)
  assert.match(checkout, /if \(!digitalOnly && !selectedDelivery\) \{ toast\.error\('Please select a delivery option first'\)/)
  const route = readFileSync(new URL('../src/app/api/orders/create/route.ts', import.meta.url), 'utf8')
  assert.match(route, /priced\.delivery\?\.type === 'pickup' \? 'pickup' : 'home'/)
  assert.ok(!/d\.type === 'pickup'/.test(route), 'shipping method must not come from the browser')
})
