// Run with:  node --test tests/reconcile.test.mjs
// Uses a FAKE Paystack response and a fake database. Nothing here talks to Paystack or Supabase.
import test from 'node:test'
import assert from 'node:assert/strict'
import { runReconciliation, findUnmatchedPayments } from '../src/lib/reconcile.ts'

process.env.PAYSTACK_SECRET_KEY = 'sk_test_fake_for_unit_test'

const tx = (reference, o = {}) => ({ reference, status: 'success', amount: 500000, currency: 'NGN', paid_at: '2026-11-15T10:00:00Z', customer: { email: 'a@b.com' }, ...o })

function fakePaystack(pages) {
  const calls = []
  const fn = async (url, init) => {
    calls.push({ url, method: init?.method })
    const page = Number(new URL(url).searchParams.get('page'))
    return { ok: true, status: 200, json: async () => ({ status: true, data: pages[page - 1] || [], meta: { pageCount: pages.length } }) }
  }
  fn.calls = calls
  return fn
}
const fakeDb = known => ({ from: () => ({ select: () => ({ in: async (_c, refs) => ({ data: known.filter(r => refs.includes(r)).map(r => ({ paystack_reference: r })), error: null }) }) }) })

test('reports a successful PrintHub payment that has no order, and alerts', async () => {
  const sent = []
  const ps = fakePaystack([[tx('PRINTHUB-111'), tx('PRINTHUB-222')]])
  const r = await runReconciliation(fakeDb(['PRINTHUB-111']), { fetchImpl: ps, alert: async (s, l) => { sent.push([s, l]); return true } })
  assert.equal(r.ok, true)
  assert.deepEqual(r.unmatched.map(t => t.reference), ['PRINTHUB-222'])
  assert.equal(sent.length, 1)
  assert.match(sent[0][0], /1 Paystack payment with no order/)
})
test('everything matched: no alert', async () => {
  const sent = []
  const r = await runReconciliation(fakeDb(['PRINTHUB-111']), { fetchImpl: fakePaystack([[tx('PRINTHUB-111')]]), alert: async () => { sent.push(1); return true } })
  assert.equal(r.unmatched.length, 0); assert.equal(sent.length, 0)
})
test('payments with another reference format are ignored, failed ones are not counted', async () => {
  const r = await runReconciliation(fakeDb([]), { fetchImpl: fakePaystack([[tx('OTHER-1'), tx('PRINTHUB-9', { status: 'failed' })]]), alert: async () => true })
  assert.equal(r.unmatched.length, 0); assert.equal(r.skippedOther, 1)
})
test('is read-only against Paystack: only GET requests, and pages are followed', async () => {
  const ps = fakePaystack([[tx('PRINTHUB-1')], [tx('PRINTHUB-2')]])
  const r = await findUnmatchedPayments(fakeDb([]), 'sk_test_fake', ps)
  assert.equal(r.unmatched.length, 2)
  assert.ok(ps.calls.length === 2 && ps.calls.every(c => c.method === 'GET'))
})
test('a Paystack failure is reported, not silently treated as "all good"', async () => {
  const sent = []
  const bad = async () => ({ ok: false, status: 401, json: async () => ({ message: 'Invalid key' }) })
  const r = await runReconciliation(fakeDb([]), { fetchImpl: bad, alert: async s => { sent.push(s); return true } })
  assert.equal(r.ok, false); assert.match(sent[0], /could not run/)
})
