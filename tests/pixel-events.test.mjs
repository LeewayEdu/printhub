// Run with:  node --import ./scripts/alias-register.mjs --test tests/pixel-events.test.mjs
// Purchase / Lead / AddToCart pixel events: sent once, only after success, never with personal data.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { purchaseEventFor, trackPurchaseOnce, trackLead, leadSucceeded, trackAddToCart } from '../src/lib/pixel-events.ts'

const paid = { id: 'ord-1', status: 'paid', is_test: false, paystack_reference: 'ref', paystack_status: 'success', paid_amount: 25000, currency: 'NGN' }

function fakeBrowser({ withPixel = true } = {}) {
  const calls = [], store = new Map()
  globalThis.window = {
    localStorage: { getItem: k => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)) },
    fbq: withPixel ? (...a) => calls.push(a) : undefined,
  }
  return { calls, store }
}
test.afterEach(() => { delete globalThis.window })

test('a server-confirmed paid order is a Purchase with the paid amount, NGN and the order id', () => {
  assert.deepEqual(purchaseEventFor(paid), { orderId: 'ord-1', params: { value: 25000, currency: 'NGN' } })
  assert.equal(purchaseEventFor({ ...paid, paid_amount: '25000.50' }).params.value, 25000.5)
})

test('pending, bank transfer, review, failed, test, incomplete and non-naira orders are never a Purchase', () => {
  for (const o of [
    { ...paid, status: 'pending' },
    { ...paid, status: 'payment_review' },
    { ...paid, status: 'cancelled' },
    { ...paid, paystack_reference: null },                 // bank transfer marked paid by hand
    { ...paid, paystack_status: 'abandoned' },
    { ...paid, paystack_status: null },
    { ...paid, is_test: true },
    { ...paid, paid_amount: null },
    { ...paid, paid_amount: 0 },
    { ...paid, currency: 'USD' },
    { ...paid, id: null }, null, undefined,
  ]) assert.equal(purchaseEventFor(o), null, JSON.stringify(o))
})

test('Purchase fires once with the order id as event id; refresh and revisit send nothing more', () => {
  const { calls, store } = fakeBrowser()
  assert.equal(trackPurchaseOnce(paid), true)
  assert.deepEqual(calls, [['track', 'Purchase', { value: 25000, currency: 'NGN' }, { eventID: 'ord-1' }]])
  assert.equal(store.get('printhub-pixel-purchase-ord-1'), '1')
  trackPurchaseOnce(paid); trackPurchaseOnce({ ...paid })      // same page again, a re-render
  assert.equal(calls.length, 1)
  // a fresh page load in the same browser (new module state is simulated by the stored guard)
  assert.equal(trackPurchaseOnce(paid), false)
  assert.equal(calls.length, 1)
})

test('no event for pending or test orders, and nothing is marked', () => {
  const { calls, store } = fakeBrowser()
  assert.equal(trackPurchaseOnce({ ...paid, status: 'pending' }), false)
  assert.equal(trackPurchaseOnce({ ...paid, is_test: true }), false)
  assert.equal(calls.length, 0)
  assert.equal(store.size, 0)
})

test('when the pixel script is not there, nothing is sent and the order is not marked (so a later visit can still count)', async () => {
  const { calls, store } = fakeBrowser({ withPixel: false })
  trackPurchaseOnce(paid, { waitMs: 30, stepMs: 10 })
  await new Promise(r => setTimeout(r, 80))
  assert.equal(calls.length, 0); assert.equal(store.size, 0)
})

test('Purchase waits for a pixel that loads a moment later, then fires once', async () => {
  const { calls } = fakeBrowser({ withPixel: false })
  trackPurchaseOnce(paid, { waitMs: 500, stepMs: 10 })
  setTimeout(() => { globalThis.window.fbq = (...a) => calls.push(a) }, 40)
  await new Promise(r => setTimeout(r, 150))
  assert.equal(calls.length, 1)
})

test('payloads carry no personal fields', () => {
  const { calls } = fakeBrowser()
  trackPurchaseOnce({ ...paid, email: 'a@b.c', phone: '0803', customer_name: 'X', delivery_address: 'Y' })
  trackLead('chatbot'); trackAddToCart('Business Cards', 12000)
  const all = JSON.stringify(calls)
  assert.doesNotMatch(all, /a@b\.c|0803|"X"|"Y"|email|phone|address|customer/i)
  assert.deepEqual(calls[1], ['track', 'Lead', { content_category: 'chatbot' }])
  assert.deepEqual(calls[2], ['track', 'AddToCart', { content_name: 'Business Cards', content_type: 'product', value: 12000, currency: 'NGN' }])
})

test('Lead is counted only when the server answered ok', async () => {
  assert.equal(await leadSucceeded({ ok: true, json: async () => ({ ok: true }) }), true)
  assert.equal(await leadSucceeded({ ok: true, json: async () => ({ error: 'x' }) }), false)
  assert.equal(await leadSucceeded({ ok: false, status: 429, json: async () => ({ ok: true }) }), false)
  assert.equal(await leadSucceeded({ ok: false, status: 400, json: async () => ({}) }), false)
  assert.equal(await leadSucceeded({ ok: true, json: async () => { throw new Error('bad') } }), false)
})

test('call sites: Lead only after a confirmed response; Purchase on the success page; AddToCart in the cart; routes untouched', () => {
  const r = p => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
  for (const f of ['src/components/case-studies/CaseCta.tsx', 'src/components/shop/ProformaRequest.tsx', 'src/app/products/[slug]/ProductPageClient.tsx'])
    assert.match(r(f), /leadSucceeded\(res\)\) (trackLead|.*trackLead)\(/, f)
  assert.match(r('src/components/layout/ChatWidget.tsx'), /!leadHp\.trim\(\) && await leadSucceeded\(res\)\) trackLead\('chatbot'\)/)
  assert.match(r('src/app/checkout/success/page.tsx'), /trackPurchaseOnce\(order\)/)
  assert.match(r('src/store/cartStore.ts'), /trackAddToCart\(name, newItem\.price\)/)
  assert.doesNotMatch(r('src/app/api/leads/route.ts'), /fbq|pixel/i)
})
