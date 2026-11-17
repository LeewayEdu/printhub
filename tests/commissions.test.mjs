// Run with:  node --test tests/commissions.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import { awardCommissionForOrder, commissionRate } from '../src/lib/commissions.ts'

// Small in-memory Supabase stand-in. `uniqueOrderId` mimics the unique index on commissions.order_id.
function fakeDb(tables, { uniqueOrderId = true } = {}) {
  return {
    from(name) {
      const rows = (tables[name] ||= [])
      const q = { filters: [], patch: null, limit: null }
      const match = r => q.filters.every(([k, v]) => r[k] === v)
      const exec = () => {
        let hit = rows.filter(match)
        if (q.patch) hit.forEach(r => Object.assign(r, q.patch))
        if (q.limit) hit = hit.slice(0, q.limit)
        return hit.map(r => ({ ...r }))
      }
      const b = {
        select() { return b }, update(p) { q.patch = p; return b }, eq(k, v) { q.filters.push([k, v]); return b },
        limit(n) { q.limit = n; return b },
        maybeSingle() { return Promise.resolve({ data: exec()[0] ?? null, error: null }) },
        single() { return Promise.resolve({ data: exec()[0] ?? null, error: null }) },
        insert(row) {
          if (name === 'commissions' && uniqueOrderId && rows.some(r => r.order_id === row.order_id)) return Promise.resolve({ error: { code: '23505', message: 'duplicate key' } })
          rows.push({ id: `${name}-${rows.length + 1}`, ...row }); return Promise.resolve({ error: null })
        },
        then(res, rej) { return Promise.resolve({ data: exec(), error: null }).then(res, rej) },
      }
      return b
    },
  }
}
const world = (extra = {}) => ({
  orders: [{ id: 'o1', user_id: 'cust', status: 'delivered', total_amount: 4425 }],
  profiles: [{ id: 'cust', referred_by: 'owner' }],
  affiliates: [{ id: 'aff', profile_id: 'owner', is_active: true, total_earnings: 0, pending_payout: 0 }],
  commissions: [], referrals: [], ...extra,
})

test('tiers: 10% for orders 1-5, 5% for 6-10, 3% after', () => {
  assert.deepEqual([0, 4, 5, 9, 10, 50].map(commissionRate), [0.10, 0.10, 0.05, 0.05, 0.03, 0.03])
})
test('a delivered referred order earns 10% (the BLESSING case: 4,425 -> 442.50)', async () => {
  const t = world(); const r = await awardCommissionForOrder(fakeDb(t), 'o1')
  assert.equal(r.state, 'awarded'); assert.equal(r.amount, 442.5)
  assert.equal(t.commissions.length, 1); assert.equal(t.affiliates[0].pending_payout, 442.5)
  assert.equal(t.referrals[0].referred_user_id, 'cust'); assert.equal(t.referrals[0].total_orders, 1)
})
test('awarding twice pays once', async () => {
  const t = world(); const db = fakeDb(t)
  await awardCommissionForOrder(db, 'o1')
  assert.equal((await awardCommissionForOrder(db, 'o1')).state, 'already_awarded')
  assert.equal(t.commissions.length, 1); assert.equal(t.affiliates[0].total_earnings, 442.5)
})
test('if two callers race, the unique index makes the loser a no-op', async () => {
  const t = world(); const db = fakeDb(t)
  // simulate the other caller inserting between our existence check and our insert
  const realFrom = db.from.bind(db); let injected = false
  db.from = name => { const b = realFrom(name); if (name === 'commissions' && !injected) { const ins = b.insert; b.insert = row => { injected = true; t.commissions.push({ id: 'x', order_id: row.order_id }); return ins(row) } } return b }
  assert.equal((await awardCommissionForOrder(db, 'o1')).state, 'already_awarded')
  assert.equal(t.commissions.length, 1); assert.equal(t.affiliates[0].total_earnings, 0)
})
test('the 6th order from the same customer earns 5%', async () => {
  const t = world({ commissions: Array.from({ length: 5 }, (_, i) => ({ id: `c${i}`, affiliate_id: 'aff', referred_customer: 'cust', order_id: `old${i}` })) })
  const r = await awardCommissionForOrder(fakeDb(t), 'o1'); assert.equal(r.rate, 0.05); assert.equal(r.amount, 221.25)
})
test('not delivered, no referrer, guest, inactive affiliate: nothing is paid', async () => {
  const cases = [
    [world({ orders: [{ id: 'o1', user_id: 'cust', status: 'paid', total_amount: 100 }] }), 'not_delivered'],
    [world({ profiles: [{ id: 'cust', referred_by: null }] }), 'no_referrer'],
    [world({ orders: [{ id: 'o1', user_id: null, status: 'delivered', total_amount: 100 }] }), 'guest_order'],
    [world({ affiliates: [{ id: 'aff', profile_id: 'owner', is_active: false }] }), 'inactive_affiliate'],
  ]
  for (const [t, state] of cases) { assert.equal((await awardCommissionForOrder(fakeDb(t), 'o1')).state, state); assert.equal(t.commissions.length, 0) }
})
test('bank-transfer orders earn the same way (no Paystack involved)', async () => {
  const t = world({ orders: [{ id: 'o1', user_id: 'cust', status: 'delivered', total_amount: 10000, paystack_reference: null, receipt_url: 'x' }] })
  assert.equal((await awardCommissionForOrder(fakeDb(t), 'o1')).amount, 1000)
})

test('a test order earns no commission', async () => {
  const w = world(); w.orders[0].is_test = true
  const r = await awardCommissionForOrder(fakeDb(w), 'o1')
  assert.equal(r.state, 'test_order'); assert.equal(w.commissions.length, 0)
})
