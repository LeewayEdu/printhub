// Run with:  node --import ./scripts/alias-register.mjs --test tests/ledger-rules.test.mjs
// Ledger rules: bundle split, naira at the rate actually received, other authors' referral codes.
import test from 'node:test'
import assert from 'node:assert/strict'
import { fakeDb } from './_fakedb.mjs'
import { computeRoyalty, ledgerCsv, payoutDecision, summariseEntries, nairaShare } from '../src/lib/books/royalty.ts'
import { fulfilBooksForOrder, recordSettlement, reverseBooksForOrder } from '../src/lib/books/fulfil.ts'

const rule = { book_id: null, option_key: 'distribution', ebook_author_share_pct: 70, print_author_share_pct: 30, referral_share_pct: 85, hold_days: 30, minimum_payout: 5000 }
const UNIQ = { entitlements: [['order_item_id']], royalty_entries: [{ keys: ['order_item_id', 'part'], where: r => r.refund_of == null }, ['refund_of']] }
const mail = async () => true

test('a bundle is split in proportion to the two formats\' own prices', () => {
  const ebookPrice = 2500, printPrice = 5000, bundle = 6500
  const parts = computeRoyalty({ formatType: 'bundle', gross: bundle, quantity: 1, orderFee: 0, orderTotal: bundle, printCostPerCopy: 1000, rule, referral: false, bundleEbookRatio: ebookPrice / (ebookPrice + printPrice) })
  assert.deepEqual(parts.map(p => p.part), ['ebook', 'print'])
  assert.equal(parts[0].gross, 2166.67); assert.equal(parts[1].gross, 4333.33)
  assert.equal(Math.round((parts[0].gross + parts[1].gross) * 100) / 100, bundle)
  assert.equal(Math.round(parts[0].gross / parts[1].gross * 100) / 100, 0.5, 'ebook : print = 2500 : 5000')
})

const world = (o = {}, itemPrice = 6) => ({
  orders: [{ id: 'o1', user_id: 'u1', status: 'paid', total_amount: itemPrice, currency: 'USD', payment_fee: 0.3, email: 'a@b.com', ...o }],
  order_items: [{ id: 'i1', order_id: 'o1', item_type: 'book', book_id: 'b1', book_format_id: 'fe', price: itemPrice, quantity: 1 }],
  book_formats: [{ id: 'fe', book_id: 'b1', type: 'ebook', price_ngn: 2500, print_cost_ngn: null }],
  books: [{ id: 'b1', title: 'One', author_id: 'a1' }, { id: 'b2', title: 'Other', author_id: 'a2' }],
  authors: [{ id: 'a1', referral_code: 'ADA10' }, { id: 'a2', referral_code: 'BOLA7' }],
  royalty_rules: [rule], entitlements: [], royalty_entries: [],
})

test('a naira sale is recorded at rate 1 with the naira amount on the entry', async () => {
  const w = world({ currency: 'NGN', total_amount: 2500, payment_fee: 100 }, 2500), db = fakeDb(w, { unique: UNIQ })
  await fulfilBooksForOrder(db, 'o1', { mailer: mail })
  const e = w.royalty_entries[0]
  assert.equal(e.rate_to_ngn, 1); assert.equal(e.author_share_ngn, e.author_share); assert.equal(e.flag, null)
})
test('a USD sale waits for the naira Paystack settled: flagged, no naira amount, not payable', async () => {
  const w = world(), db = fakeDb(w, { unique: UNIQ })
  await fulfilBooksForOrder(db, 'o1', { mailer: mail })
  const e = w.royalty_entries[0]
  assert.equal(e.flag, 'awaiting_settlement'); assert.equal(e.rate_to_ngn, null); assert.equal(e.author_share_ngn, null); assert.match(e.settled_note, /waiting for the naira/)
  assert.equal(nairaShare({ ...e, currency: 'USD' }), null)
  assert.equal(payoutDecision([{ ...e, currency: 'USD', status: 'pending', payable_at: '2020-01-01' }], 1, new Date()).total, 0)
})
test('recording the settled naira converts the entries at the rate actually received and releases them', async () => {
  const w = world(), db = fakeDb(w, { unique: UNIQ })
  await fulfilBooksForOrder(db, 'o1', { mailer: mail })
  const before = w.royalty_entries[0].author_share
  assert.equal((await recordSettlement(db, 'o1', 0)).ok, false)
  const r = await recordSettlement(db, 'o1', 9000)       // 6 USD settled as 9,000 naira: 1,500 per dollar
  assert.deepEqual([r.ok, r.updated], [true, 1])
  const e = w.royalty_entries[0]
  assert.equal(e.rate_to_ngn, 1500); assert.equal(e.author_share_ngn, Math.round(before * 1500 * 100) / 100); assert.equal(e.flag, null)
  assert.equal(w.orders[0].settled_ngn, 9000)
  const paid = payoutDecision([{ ...e, currency: 'USD', status: 'pending', payable_at: '2020-01-01' }], 1, new Date())
  assert.equal(paid.total, e.author_share_ngn, 'paid in naira, at that rate')
})
test('settlement is refused for a naira order or an unpaid order', async () => {
  assert.equal((await recordSettlement(fakeDb(world({ currency: 'NGN' })), 'o1', 100)).ok, false)
  assert.equal((await recordSettlement(fakeDb(world({ status: 'pending' })), 'o1', 100)).ok, false)
})
test('a refund reverses the naira amount too', async () => {
  const w = world({ settled_ngn: 9000 }), db = fakeDb(w, { unique: UNIQ })
  await fulfilBooksForOrder(db, 'o1', { mailer: mail })
  const orig = w.royalty_entries[0]
  assert.equal(orig.rate_to_ngn, 1500)
  await reverseBooksForOrder(db, 'o1')
  assert.equal(w.royalty_entries[1].author_share_ngn, -orig.author_share_ngn)
})
test('reports and the CSV show the rate and the naira amount', () => {
  const rows = [{ id: 'e1', author_id: 'a1', book_id: 'b1', order_id: 'o1abcdefgh', part: 'ebook', currency: 'USD', source: 'store', gross: 6, payment_fee: 0.3, net: 5.7, author_share: 3.99, author_share_ngn: 5985, rate_to_ngn: 1500, company_share: 1.71, status: 'pending', payable_at: '2027-01-01', created_at: '2026-12-01T00:00:00Z' }]
  const csv = ledgerCsv(rows, new Date('2026-12-15'))
  assert.match(csv.split('\n')[0], /rate_to_ngn,author_share_ngn/)
  assert.match(csv, /"1500","5985"/)
  assert.equal(summariseEntries(rows, new Date())[0].author_share_ngn, 5985)
})

test('a referral code from a DIFFERENT author earns that author nothing, and gives this book no referral share', async () => {
  const w = world({ currency: 'NGN', total_amount: 2500, payment_fee: 0, author_ref_code: 'bola7' }, 2500), db = fakeDb(w, { unique: UNIQ })   // BOLA7 belongs to author a2
  await fulfilBooksForOrder(db, 'o1', { mailer: mail })
  assert.equal(w.royalty_entries.length, 1)
  const e = w.royalty_entries[0]
  assert.equal(e.author_id, 'a1', 'the entry belongs to the book\'s own author')
  assert.equal(e.source, 'store'); assert.equal(e.author_share, 1750, 'the normal 70% of net, not the 85% referral share')
  assert.ok(!w.royalty_entries.some(x => x.author_id === 'a2'), 'the other author receives nothing')
})
test('the author\'s OWN code (any letter case) earns the referral share on the ebook', async () => {
  const w = world({ currency: 'NGN', total_amount: 2500, payment_fee: 0, author_ref_code: 'ada10' }, 2500), db = fakeDb(w, { unique: UNIQ })
  await fulfilBooksForOrder(db, 'o1', { mailer: mail })
  assert.equal(w.royalty_entries[0].source, 'referral'); assert.equal(w.royalty_entries[0].author_share, 2125)
})
