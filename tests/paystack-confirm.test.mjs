// Run with:  node --test tests/paystack-confirm.test.mjs
// Checks the only code that marks Paystack orders paid, against an in-memory fake database.
import test from 'node:test'
import assert from 'node:assert/strict'
import { confirmOrderPayment } from '../src/lib/paystack.ts'

// Minimal chainable stand-in for the Supabase query builder (orders table only)
function fakeDb(rows) {
  return {
    from() {
      const q = { filters: [], inFilter: null, patch: null, wantSelect: false, lim: null }
      const run = () => {
        let hit = rows.filter(r => q.filters.every(([k, v]) => r[k] === v) && (!q.inFilter || q.inFilter[1].includes(r[q.inFilter[0]])))
        if (q.patch) { hit.forEach(r => Object.assign(r, q.patch)) }
        if (q.lim) hit = hit.slice(0, q.lim)
        return { data: hit.map(r => ({ ...r })), error: null }
      }
      const b = {
        select() { q.wantSelect = true; return b }, update(p) { q.patch = p; return b },
        eq(k, v) { q.filters.push([k, v]); return b }, in(k, v) { q.inFilter = [k, v]; return b },
        limit(n) { q.lim = n; return b }, then(res, rej) { return Promise.resolve(run()).then(res, rej) },
      }
      return b
    },
  }
}
const order = (o = {}) => ({ id: 'o1', status: 'pending', total_amount: 13975, user_id: 'u1', paystack_reference: 'REF123456', ...o })
const tx = (o = {}) => ({ reference: 'REF123456', status: 'success', amountKobo: 1397500, currency: 'NGN', ...o })

test('a matching successful payment marks the order paid', async () => {
  const rows = [order()]
  const r = await confirmOrderPayment(fakeDb(rows), tx())
  assert.equal(r.state, 'paid'); assert.equal(rows[0].status, 'paid')
})
test('confirming twice is idempotent (second call is a no-op)', async () => {
  const rows = [order()]
  assert.equal((await confirmOrderPayment(fakeDb(rows), tx())).state, 'paid')
  assert.equal((await confirmOrderPayment(fakeDb(rows), tx())).state, 'already_paid')
  assert.equal(rows[0].status, 'paid')
})
test('a payment smaller than the order total is NOT paid (held for review)', async () => {
  const rows = [order()]
  const r = await confirmOrderPayment(fakeDb(rows), tx({ amountKobo: 1000 }))
  assert.equal(r.state, 'amount_mismatch'); assert.equal(rows[0].status, 'payment_review')
})
test('a wrong currency is NOT paid', async () => {
  const rows = [order()]
  const r = await confirmOrderPayment(fakeDb(rows), tx({ currency: 'USD' }))
  assert.equal(r.state, 'amount_mismatch'); assert.notEqual(rows[0].status, 'paid')
})
test('a failed or abandoned transaction does not mark the order paid', async () => {
  const rows = [order()]
  const r = await confirmOrderPayment(fakeDb(rows), tx({ status: 'abandoned' }))
  assert.equal(r.state, 'not_successful'); assert.equal(rows[0].status, 'pending')
})
test('an unknown reference changes nothing', async () => {
  const rows = [order()]
  const r = await confirmOrderPayment(fakeDb(rows), tx({ reference: 'OTHER99999' }))
  assert.equal(r.state, 'order_not_found'); assert.equal(rows[0].status, 'pending')
})
test('two orders sharing a reference are refused', async () => {
  const rows = [order(), order({ id: 'o2' })]
  const r = await confirmOrderPayment(fakeDb(rows), tx())
  assert.equal(r.state, 'reference_conflict'); assert.ok(rows.every(x => x.status === 'pending'))
})
test('a review-held order can still become paid once the right amount is confirmed', async () => {
  const rows = [order({ status: 'payment_review' })]
  assert.equal((await confirmOrderPayment(fakeDb(rows), tx())).state, 'paid')
})
