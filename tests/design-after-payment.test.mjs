// Run with:  node --import ./scripts/alias-register.mjs --test tests/design-after-payment.test.mjs
// Design file after payment: checkout without a file, production blocked until a file exists,
// and the 24h / 72h reminder job (fake database and fake mailer: nothing is sent or written for real).
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { orderAwaitingDesign, itemAwaitingDesign, productionBlocked, selectDueReminders } from '../src/lib/design-status.ts'
import { runDesignReminders } from '../src/lib/design-reminders.ts'

const H = 3600 * 1000
const NOW = new Date('2026-11-20T12:00:00Z')
const ago = h => new Date(NOW.getTime() - h * H).toISOString()

// ---- checkout allowed without a file -------------------------------------------------------
test('the cart no longer blocks checkout when a design file is missing', () => {
  const src = readFileSync(new URL('../src/app/cart/page.tsx', import.meta.url), 'utf8')
  assert.ok(!/canCheckout/.test(src), 'cart must not gate on canCheckout')
  assert.ok(/const handleCheckout = \(\) => router\.push\('\/checkout'\)/.test(src), 'checkout button must always go to /checkout')
  assert.ok(/upload your design after payment/i.test(src), 'friendly notice is present')
})
test('an order made from a cart line with "I have my file" and no file is awaiting a design', () => {
  // the same fields /api/orders/create writes for such a line
  const row = { has_own_design: true, design_file_url: null, design_link: null }
  assert.equal(itemAwaitingDesign(row), true)
  assert.equal(orderAwaitingDesign([row]), true)
})
test('items that do not need a file are never "awaiting"', () => {
  assert.equal(itemAwaitingDesign({ has_own_design: false }), false)                    // PrintHub designs it
  assert.equal(itemAwaitingDesign({ has_own_design: null }), false)                     // no design question
  assert.equal(itemAwaitingDesign({ has_own_design: true, design_file_url: 'u' }), false)
  assert.equal(itemAwaitingDesign({ has_own_design: true, design_link: 'https://x.y' }), false)
})

// ---- production blocked until a file exists ----------------------------------------------
test('production cannot start while a file is missing, and can once it is attached', () => {
  const waiting = [{ has_own_design: true }]
  for (const s of ['processing', 'shipped', 'delivered']) assert.equal(productionBlocked(waiting, s), true, s)
  for (const s of ['paid', 'cancelled', 'refunded', 'pending']) assert.equal(productionBlocked(waiting, s), false, s)
  assert.equal(productionBlocked([{ has_own_design: true, design_link: 'https://drive.google.com/x' }], 'processing'), false)
  assert.equal(productionBlocked([{ has_own_design: true }, { has_own_design: true, design_file_url: 'f' }], 'processing'), true, 'one missing item is enough')
})

// ---- reminder selection ---------------------------------------------------------------------
const cand = (o = {}) => ({ id: 'o1', status: 'paid', created_at: ago(30), email: 'a@b.com', items: [{ has_own_design: true }], ...o })
test('reminder selection: right orders, right moment', () => {
  const sent = new Set()
  assert.deepEqual(selectDueReminders([cand({ created_at: ago(10) })], sent, NOW), [], 'too early')
  assert.deepEqual(selectDueReminders([cand({ created_at: ago(30) })], sent, NOW), [{ orderId: 'o1', kind: '24h' }])
  assert.deepEqual(selectDueReminders([cand({ created_at: ago(80) })], new Set(['o1:24h']), NOW), [{ orderId: 'o1', kind: '72h' }])
  assert.deepEqual(selectDueReminders([cand({ created_at: ago(30) })], new Set(['o1:24h']), NOW), [], '72h not due yet')
  assert.deepEqual(selectDueReminders([cand({ created_at: ago(80) })], new Set(['o1:24h', 'o1:72h']), NOW), [], 'both already sent')
  assert.equal(selectDueReminders([cand({ created_at: ago(200) })], sent, NOW).length, 1, 'never both kinds in one run')
})
test('reminder selection skips orders that should not be nagged', () => {
  const none = o => assert.deepEqual(selectDueReminders([cand(o)], new Set(), NOW), [])
  none({ status: 'pending' }); none({ status: 'cancelled' }); none({ status: 'payment_review' })
  none({ email: '' }); none({ items: [{ has_own_design: true, design_file_url: 'f' }] }); none({ items: [{ has_own_design: false }] })
})
test('a bank transfer is timed from when it was verified, not when it was created', () => {
  assert.deepEqual(selectDueReminders([cand({ created_at: ago(100), verified_at: ago(5) })], new Set(), NOW), [])
})

// ---- the job itself, with a fake database and mailer ---------------------------------------
function fakeDb(tables) {
  let seq = 0
  return {
    from(name) {
      const rows = (tables[name] ||= [])
      const q = { filters: [], ins: [], del: false, ins1: null }
      const match = r => q.filters.every(([k, v]) => r[k] === v) && q.ins.every(([k, vs]) => vs.includes(r[k]))
      const run = () => {
        if (q.ins1) { const row = { id: `${name}-${++seq}`, ...q.ins1 }; rows.push(row); return { data: row, error: null } }
        if (q.del) { const keep = rows.filter(r => !match(r)); rows.length = 0; rows.push(...keep); return { data: null, error: null } }
        return { data: rows.filter(match).map(r => ({ ...r })), error: null }
      }
      const b = {
        select() { return b }, eq(k, v) { q.filters.push([k, v]); return b }, in(k, vs) { q.ins.push([k, vs]); return b },
        limit() { return b }, delete() { q.del = true; return b }, insert(r) { q.ins1 = r; return b },
        single() { return Promise.resolve(run()) },
        then(res, rej) { return Promise.resolve(run()).then(res, rej) },
      }
      return b
    },
  }
}
const world = () => ({
  orders: [
    { id: 'a', status: 'paid', created_at: ago(30), email: 'a@x.com', first_name: 'Ada' },          // due 24h
    { id: 'b', status: 'paid', created_at: ago(30), email: 'b@x.com', first_name: 'Bo' },           // has a file
    { id: 'c', status: 'paid', created_at: ago(30), email: '', first_name: 'Cy' },                  // no email
    { id: 'd', status: 'pending', created_at: ago(30), email: 'd@x.com', first_name: 'Di' },        // not paid
    { id: 'e', status: 'paid', created_at: ago(30), email: 'e@x.com', first_name: 'Ed', is_test: true }, // test order
    { id: 'f', status: 'paid', created_at: ago(5), email: 'f@x.com', first_name: 'Fay' },           // too early
  ],
  order_items: ['a', 'c', 'd', 'e', 'f'].map(id => ({ order_id: id, has_own_design: true, design_file_url: null, design_link: null }))
    .concat([{ order_id: 'b', has_own_design: true, design_file_url: 'https://f', design_link: null }]),
  admin_audit_logs: [],
})
const mailerLog = () => { const sent = []; const m = async (to, subject) => { sent.push({ to, subject }); return true }; m.sent = sent; return m }

test('the job emails only the right order, and a second run does not send it again', async () => {
  const w = world(), db = fakeDb(w), mailer = mailerLog()
  const r1 = await runDesignReminders(db, { now: NOW, mailer })
  assert.deepEqual(r1.sent, [{ orderId: 'a', kind: '24h' }])
  assert.deepEqual(mailer.sent.map(s => s.to), ['a@x.com'])
  const r2 = await runDesignReminders(db, { now: NOW, mailer })
  assert.equal(r2.sent.length, 0); assert.equal(mailer.sent.length, 1, 'no double send')
})
test('72 hours later the second reminder goes out once, then never again', async () => {
  const w = world(), db = fakeDb(w), mailer = mailerLog()
  await runDesignReminders(db, { now: NOW, mailer })
  const later = new Date(NOW.getTime() + 50 * H)               // order a is now ~80h old
  const r = await runDesignReminders(db, { now: later, mailer })
  assert.ok(r.sent.some(s => s.orderId === 'a' && s.kind === '72h'))
  const again = await runDesignReminders(db, { now: later, mailer })
  assert.equal(again.sent.filter(s => s.orderId === 'a').length, 0)
  assert.equal(mailer.sent.filter(s => s.to === 'a@x.com').length, 2)
})
test('a failed email is not recorded as sent, so it is retried next run', async () => {
  const w = world(), db = fakeDb(w)
  const r1 = await runDesignReminders(db, { now: NOW, mailer: async () => false })
  assert.equal(r1.failed, 1); assert.equal(w.admin_audit_logs.length, 0)
  const mailer = mailerLog()
  const r2 = await runDesignReminders(db, { now: NOW, mailer })
  assert.equal(r2.sent.length, 1)
})
test('once the customer attaches a file the reminders stop', async () => {
  const w = world(), db = fakeDb(w), mailer = mailerLog()
  w.order_items.find(i => i.order_id === 'a').design_link = 'https://drive.google.com/x'
  const r = await runDesignReminders(db, { now: NOW, mailer })
  assert.equal(r.sent.length, 0)
})
