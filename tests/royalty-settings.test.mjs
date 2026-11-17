// Run with:  node --import ./scripts/alias-register.mjs --test tests/royalty-settings.test.mjs
// Royalty options (distribution default, package override), referral on ebooks only, "needs print cost" flags.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fakeDb } from './_fakedb.mjs'
import { computeRoyalty, pickRule, payoutDecision } from '../src/lib/books/royalty.ts'
import { fulfilBooksForOrder, recalcFlaggedForBook } from '../src/lib/books/fulfil.ts'

const SEED = readFileSync(new URL('../books-royalty-seed.sql', import.meta.url), 'utf8')
const MIG = readFileSync(new URL('../books-1b-migration.sql', import.meta.url), 'utf8')
const distribution = { book_id: null, option_key: 'distribution', ebook_author_share_pct: 70, print_author_share_pct: 30, referral_share_pct: 85, hold_days: 30, minimum_payout: 5000 }
const pkg = { book_id: null, option_key: 'package', ebook_author_share_pct: 80, print_author_share_pct: 40, referral_share_pct: 85, hold_days: 30, minimum_payout: 5000 }
const base = { quantity: 1, orderFee: 0, orderTotal: 1, printCostPerCopy: null, referral: false }
const part = (o) => computeRoyalty({ ...base, ...o })[0]

test('the seed holds the chosen figures in the database, and never overwrites an existing rule', () => {
  assert.match(SEED, /'distribution', 'Distribution-only author', 70, 30, 85, 30, 5000/)
  assert.match(SEED, /'package', 'C-Chu publishing package', 80, 40, 85, 30, 5000/)
  assert.equal((SEED.match(/where not exists/g) || []).length, 2)
  assert.match(MIG, /add column if not exists option_key/); assert.match(MIG, /royalty_option text not null default 'distribution'/)
})
test('no print cost is invented anywhere: the seed leaves them as placeholders', () => {
  const live = SEED.split('\n').filter(l => !l.trim().startsWith('--')).join('\n')
  assert.ok(!/print_cost_ngn/.test(live), 'no live statement sets a print cost')
})

test('rule choice: own override, then the book\'s option, and a missing option is NOT silently replaced', () => {
  const rules = [distribution, pkg, { ...distribution, book_id: 'b9', ebook_author_share_pct: 60 }]
  assert.equal(pickRule(rules, 'b1', 'distribution').ebook_author_share_pct, 70)
  assert.equal(pickRule(rules, 'b1', 'package').ebook_author_share_pct, 80)
  assert.equal(pickRule(rules, 'b9', 'package').ebook_author_share_pct, 60, 'a per-book override wins')
  assert.equal(pickRule([distribution], 'b1', 'package'), null, 'package rule missing: no silent fallback')
  assert.ok(pickRule([{ ...distribution, option_key: null }], 'b1'), 'a default created before option keys existed still counts as distribution')
})

test('distribution author: ebook 70% of net', () => {
  const e = part({ formatType: 'ebook', gross: 2500, orderFee: 100, orderTotal: 2500, rule: distribution })
  assert.deepEqual([e.net, e.author_share, e.company_share], [2400, 1680, 720])
})
test('distribution author: print 30% of (price - print cost - fee)', () => {
  const e = part({ formatType: 'print', gross: 5000, orderFee: 100, orderTotal: 5000, printCostPerCopy: 1500, rule: distribution })
  assert.equal(e.author_share, 0.3 * (4900 - 1500)); assert.equal(e.flag, null)
})
test('package book: ebook 80%, print 40%', () => {
  assert.equal(part({ formatType: 'ebook', gross: 1000, orderTotal: 1000, rule: pkg }).author_share, 800)
  assert.equal(part({ formatType: 'print', gross: 5000, orderTotal: 5000, printCostPerCopy: 1000, rule: pkg }).author_share, 1600)
})
test('own link or code: 85% on EBOOKS; print keeps its normal share', () => {
  const e = part({ formatType: 'ebook', gross: 1000, orderTotal: 1000, rule: distribution, referral: true })
  assert.equal(e.author_share, 850); assert.equal(e.source, 'referral')
  const p = part({ formatType: 'print', gross: 5000, orderTotal: 5000, printCostPerCopy: 1000, rule: distribution, referral: true })
  assert.equal(p.author_share, 1200); assert.equal(p.source, 'store')
})
test('a bundle: the ebook part earns the referral share, the print part does not', () => {
  const [eb, pr] = computeRoyalty({ ...base, formatType: 'bundle', gross: 6000, orderTotal: 6000, printCostPerCopy: 1000, rule: distribution, referral: true, bundleEbookRatio: 1 / 3 })
  assert.equal(eb.source, 'referral'); assert.equal(pr.source, 'store')
})

test('missing print cost: the entry is flagged "needs print cost", not guessed', () => {
  const e = part({ formatType: 'print', gross: 5000, orderTotal: 5000, printCostPerCopy: null, rule: distribution })
  assert.equal(e.flag, 'needs_print_cost'); assert.equal(e.author_share, 0); assert.equal(e.company_share, e.net); assert.match(e.note, /needs print cost/)
  const [eb, pr] = computeRoyalty({ ...base, formatType: 'bundle', gross: 6000, orderTotal: 6000, printCostPerCopy: null, rule: distribution, bundleEbookRatio: 0.4 })
  assert.equal(eb.flag, null); assert.ok(eb.author_share > 0); assert.equal(pr.flag, 'needs_print_cost')
  assert.equal(part({ formatType: 'ebook', gross: 1000, orderTotal: 1000, rule: distribution }).flag, null, 'ebooks never need a print cost')
})
test('flagged entries are held back from payouts', () => {
  const now = new Date('2027-03-01'), row = (o = {}) => ({ id: 'x', status: 'pending', payable_at: '2027-01-01', author_share: 6000, ...o })
  assert.equal(payoutDecision([row({ flag: 'needs_print_cost' })], 5000, now).total, 0)
  assert.equal(payoutDecision([row()], 5000, now).meetsMinimum, true)
})

const world = (cost) => ({
  orders: [{ id: 'o1', user_id: 'u1', status: 'paid', total_amount: 10000, currency: 'NGN', payment_fee: 0, email: 'a@b.com' }],
  order_items: [{ id: 'i1', order_id: 'o1', item_type: 'book', book_id: 'b1', book_format_id: 'fp', price: 10000, quantity: 2 }],
  book_formats: [{ id: 'fp', book_id: 'b1', type: 'print', price_ngn: 5000, print_cost_ngn: cost }],
  books: [{ id: 'b1', title: 'One', author_id: 'a1', royalty_option: 'package' }], authors: [{ id: 'a1', referral_code: 'A1' }],
  royalty_rules: [distribution, pkg], entitlements: [], royalty_entries: [],
})
const UNIQ = { royalty_entries: [{ keys: ['order_item_id', 'part'], where: r => r.refund_of == null }] }
test('a print order with no cost is flagged; adding the cost recalculates it with the book\'s own option (package 40%)', async () => {
  const w = world(null), db = fakeDb(w, { unique: UNIQ })
  await fulfilBooksForOrder(db, 'o1', { mailer: async () => true })
  assert.equal(w.royalty_entries[0].flag, 'needs_print_cost'); assert.equal(w.royalty_entries[0].author_share, 0)
  assert.deepEqual(await recalcFlaggedForBook(db, 'b1'), { updated: 0, stillMissing: 1 }, 'cost still missing: stays flagged')
  w.book_formats[0].print_cost_ngn = 1500
  assert.deepEqual(await recalcFlaggedForBook(db, 'b1'), { updated: 1, stillMissing: 0 })
  const e = w.royalty_entries[0]
  assert.equal(e.flag, null); assert.equal(e.author_share, 0.4 * (10000 - 3000)); assert.equal(e.author_share + e.company_share, e.net)
})
test('recalculation never touches an entry that is already paid out', async () => {
  const w = world(1500), db = fakeDb(w, { unique: UNIQ })
  w.royalty_entries.push({ id: 'e1', book_id: 'b1', order_item_id: 'i1', book_format_id: 'fp', flag: 'needs_print_cost', status: 'paid', net: 10000, author_share: 0, company_share: 10000 })
  assert.deepEqual(await recalcFlaggedForBook(db, 'b1'), { updated: 0, stillMissing: 0 })
  assert.equal(w.royalty_entries[0].author_share, 0)
})
test('a package book whose package rule is not set gets a flagged "no royalty rule" entry, not the distribution rule', async () => {
  const w = world(1500); w.royalty_rules = [distribution]
  await fulfilBooksForOrder(fakeDb(w, { unique: UNIQ }), 'o1', { mailer: async () => true })
  assert.equal(w.royalty_entries[0].author_share, 0); assert.match(w.royalty_entries[0].note, /no royalty rule/)
})
