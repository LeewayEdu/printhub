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

test('amount mismatch holds the order for review and reports expected vs paid (alert fires only the first time)', async () => {
  const rows = [order()]
  const first = await confirmOrderPayment(fakeDb(rows), tx({ amountKobo: 100000 }))
  assert.equal(first.state, 'amount_mismatch'); assert.equal(rows[0].status, 'payment_review')
  assert.deepEqual(first.review, { expectedNaira: 13975, paidNaira: 1000, currency: 'NGN', firstTime: true })
  const second = await confirmOrderPayment(fakeDb(rows), tx({ amountKobo: 100000 }))
  assert.equal(second.review.firstTime, false)
})

test('a verified payment stores the amount and Paystack status; a test-mode transaction marks the order as a test', async () => {
  const rows = [order()]
  const r = await confirmOrderPayment(fakeDb(rows), tx({ domain: 'test' }))
  assert.equal(r.state, 'paid')
  assert.equal(rows[0].paid_amount, 13975); assert.equal(rows[0].paystack_status, 'success'); assert.equal(rows[0].is_test, true)
  const live = [order({ id: 'o2', paystack_reference: 'REFLIVE1' })]
  await confirmOrderPayment(fakeDb(live), tx({ reference: 'REFLIVE1', domain: 'live' }))
  assert.equal(live[0].is_test, undefined)   // never set for live payments
})
test('a payment_review order also records what was actually paid', async () => {
  const rows = [order()]
  await confirmOrderPayment(fakeDb(rows), tx({ amountKobo: 100000 }))
  assert.equal(rows[0].status, 'payment_review'); assert.equal(rows[0].paid_amount, 1000)
})
test('before the payment fields migration the code still works (missing columns are skipped)', async () => {
  const rows = [order()]
  const db = fakeDb(rows)
  const real = db.from
  db.from = t => { const b = real(t); const upd = b.update; b.update = p => { if ('paid_amount' in p) { return { eq: () => ({ in: () => ({ select: async () => ({ data: null, error: { code: '42703', message: 'column orders.paid_amount does not exist' } }) }) }) } } return upd(p) }; return b }
  const r = await confirmOrderPayment(db, tx())
  assert.equal(r.state, 'paid'); assert.equal(rows[0].status, 'paid'); assert.equal(rows[0].paid_amount, undefined)
})
