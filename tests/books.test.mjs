// Run with:  node --import ./scripts/alias-register.mjs --test tests/books.test.mjs
// C-Chu Books: publishing rule, book pricing in both currencies, entitlements, downloads, watermark,
// storage and RLS rules (read from the migration file), royalty ledger, refunds, sitemap.
// Everything uses in-memory fakes: no database, storage or Paystack is contacted.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { inflateSync } from 'node:zlib'
import { join } from 'node:path'
import { PDFDocument } from 'pdf-lib'
import { zipSync, unzipSync, strFromU8, strToU8 } from 'fflate'
import { fakeDb } from './_fakedb.mjs'
import { publishBlockers } from '../src/lib/books/rules.ts'
import { priceBookLines } from '../src/lib/books/pricing.ts'
import { authorizeDownload, issueSignedUrl, SIGNED_URL_SECONDS, stampedPath, isPublicBucketPath, DEFAULT_MAX_DOWNLOADS } from '../src/lib/books/download.ts'
import { stampPdf, stampEpub } from '../src/lib/books/stamp.ts'
import { computeRoyalty, pickRule, summariseEntries, payoutDecision, effectiveStatus } from '../src/lib/books/royalty.ts'
import { fulfilBooksForOrder, reverseBooksForOrder } from '../src/lib/books/fulfil.ts'
import { bookSitemapPaths, queryBooks } from '../src/lib/books/catalogue.ts'
import { objectPath, pathBelongsToBook, sniffMatches, validateDeclared } from '../src/lib/books/uploads.ts'
import { PUBLIC_FORMAT_SELECT, PRIVATE_FORMAT_COLUMNS } from '../src/lib/books/types.ts'
import { confirmOrderPayment } from '../src/lib/paystack.ts'
import { awardCommissionForOrder } from '../src/lib/commissions.ts'
import { FIXTURE_BOOKS } from '../src/lib/books/fixtures.ts'

const SQL = readFileSync(new URL('../books-migration.sql', import.meta.url), 'utf8')

// ── publishing ──────────────────────────────────────────────────────────────────────────────
const readyBook = (o = {}) => ({ title: 'T', slug: 't', cover_url: 'c', author_id: 'a', rights_confirmed: true, rights_confirmed_by: 'admin1', formats: [{ type: 'ebook', active: true, price_ngn: 2000, ebook_pdf_path: 'ebooks/x/y.pdf' }], ...o })
test('publishing is refused without rights_confirmed, with a clear reason', () => {
  const r = publishBlockers(readyBook({ rights_confirmed: false }))
  assert.ok(r.some(x => /rights are not confirmed/i.test(x)))
  assert.deepEqual(publishBlockers(readyBook()), [])
})
test('publishing also needs a cover, a price and an ebook file', () => {
  assert.ok(publishBlockers(readyBook({ cover_url: null })).some(x => /cover/i.test(x)))
  assert.ok(publishBlockers(readyBook({ formats: [] })).some(x => /active format/i.test(x)))
  assert.ok(publishBlockers(readyBook({ formats: [{ type: 'ebook', active: true, price_ngn: 100 }] })).some(x => /ebook file/i.test(x)))
})
test('the database itself refuses to publish without rights (CHECK constraint in the migration)', () => {
  assert.match(SQL, /constraint books_rights_before_publish check \(status <> 'published' or rights_confirmed = true\)/)
  assert.match(SQL, /rights_confirmed\s+boolean not null default false/)
})

// ── price check for books, both currencies ──────────────────────────────────────────────────
const fmtRows = () => ([
  { id: 'fe', book_id: 'b1', type: 'ebook', price_ngn: 2500, price_usd: 6, stock: null, active: true, books: { id: 'b1', title: 'One', status: 'published' } },
  { id: 'fp', book_id: 'b1', type: 'print', price_ngn: 5000, price_usd: null, stock: 3, active: true, books: { id: 'b1', title: 'One', status: 'published' } },
  { id: 'fd', book_id: 'b2', type: 'ebook', price_ngn: 1000, price_usd: 3, stock: null, active: true, books: { id: 'b2', title: 'Draft', status: 'draft' } },
])
const dbFor = () => fakeDb({ book_formats: fmtRows() })
const line = (o = {}) => ({ index: 0, bookFormatId: 'fe', quantity: 1, claimed: 2500, ...o })
test('NGN: the price comes from book_formats, a tampered price is refused', async () => {
  const ok = await priceBookLines(dbFor(), [line()], 'NGN', false)
  assert.equal(ok.ok, true); assert.equal(ok.total, 2500)
  const bad = await priceBookLines(dbFor(), [line({ claimed: 100 })], 'NGN', false)
  assert.equal(bad.ok, false); assert.equal(bad.error, 'price_mismatch')
})
test('print copies: price x quantity, stock enforced, bad quantities refused', async () => {
  const ok = await priceBookLines(dbFor(), [line({ bookFormatId: 'fp', quantity: 2, claimed: 10000 })], 'NGN', false)
  assert.equal(ok.ok, true); assert.equal(ok.hasPhysical, true)
  assert.equal((await priceBookLines(dbFor(), [line({ bookFormatId: 'fp', quantity: 5, claimed: 25000 })], 'NGN', false)).error, 'out_of_stock')
  assert.equal((await priceBookLines(dbFor(), [line({ quantity: 2, claimed: 5000 })], 'NGN', false)).error, 'bad_quantity')   // an ebook is bought once
})
test('USD: refused while the flag is off, accepted when on for an ebook with price_usd, never for print', async () => {
  assert.equal((await priceBookLines(dbFor(), [line({ claimed: 6 })], 'USD', false)).error, 'currency_not_available')
  const on = await priceBookLines(dbFor(), [line({ claimed: 6 })], 'USD', true)
  assert.equal(on.ok, true); assert.equal(on.total, 6)
  assert.equal((await priceBookLines(dbFor(), [line({ claimed: 5.5 })], 'USD', true)).error, 'price_mismatch')
  assert.equal((await priceBookLines(dbFor(), [line({ bookFormatId: 'fp', claimed: 5000 })], 'USD', true)).error, 'currency_not_available')
})
test('an unpublished or unknown book cannot be bought', async () => {
  assert.equal((await priceBookLines(dbFor(), [line({ bookFormatId: 'fd', claimed: 1000 })], 'NGN', false)).error, 'book_not_found')
  assert.equal((await priceBookLines(dbFor(), [line({ bookFormatId: 'nope' })], 'NGN', false)).error, 'book_not_found')
})

// ── Paystack verification checks the currency and amount, and keeps the real fee ───────────────
test('verification: a USD order is confirmed only by a USD payment of the right amount; the fee is stored', async () => {
  const rows = [{ id: 'o1', status: 'pending', total_amount: 6, currency: 'USD', user_id: 'u', paystack_reference: 'REFUSD1' }]
  const wrong = await confirmOrderPayment(fakeDb({ orders: rows }), { reference: 'REFUSD1', status: 'success', amountKobo: 600000, currency: 'NGN' })
  assert.equal(wrong.state, 'amount_mismatch')            // 6,000 naira is not 6 dollars
  const rows2 = [{ ...rows[0], status: 'pending' }]
  const good = await confirmOrderPayment(fakeDb({ orders: rows2 }), { reference: 'REFUSD1', status: 'success', amountKobo: 600, currency: 'USD', feeKobo: 25 })
  assert.equal(good.state, 'paid'); assert.equal(rows2[0].payment_fee, 0.25)
})

// ── entitlements only after a verified payment ────────────────────────────────────────────────────
const world = (orderOverrides = {}) => ({
  orders: [{ id: 'o1', user_id: 'u1', status: 'pending', total_amount: 2500, currency: 'NGN', payment_fee: 100, email: 'a@b.com', first_name: 'Ada', ...orderOverrides }],
  order_items: [{ id: 'i1', order_id: 'o1', item_type: 'book', book_id: 'b1', book_format_id: 'fe', price: 2500, quantity: 1 }],
  book_formats: [{ id: 'fe', book_id: 'b1', type: 'ebook', price_ngn: 2500, print_cost_ngn: null }, { id: 'fp', book_id: 'b1', type: 'print', price_ngn: 5000, print_cost_ngn: 1500 }],
  books: [{ id: 'b1', title: 'One', author_id: 'a1' }],
  authors: [{ id: 'a1', referral_code: 'ADA10' }],
  royalty_rules: [{ id: 'r0', book_id: null, ebook_author_share_pct: 50, print_author_share_pct: 30, referral_share_pct: 70, hold_days: 30, minimum_payout: 5000 }],
  entitlements: [], royalty_entries: [], download_log: [],
})
const UNIQUE = { entitlements: [['order_item_id']], royalty_entries: [{ keys: ['order_item_id', 'part'], where: r => r.refund_of == null }, ['refund_of']] }
const mail = () => { const sent = []; const m = async (to, s) => { sent.push({ to, s }); return true }; m.sent = sent; return m }

test('no entitlement and no royalty entry for an order that is not paid', async () => {
  const w = world(), m = mail()
  const r = await fulfilBooksForOrder(fakeDb(w, { unique: UNIQUE }), 'o1', { mailer: m })
  assert.equal(r.state, 'not_paid'); assert.equal(w.entitlements.length, 0); assert.equal(w.royalty_entries.length, 0); assert.equal(m.sent.length, 0)
})
test('after verified payment: one entitlement (limit 5), one ledger entry, one email; repeating changes nothing', async () => {
  const w = world({ status: 'paid' }), m = mail(), db = fakeDb(w, { unique: UNIQUE })
  const r1 = await fulfilBooksForOrder(db, 'o1', { mailer: m })
  assert.equal(r1.state, 'done'); assert.equal(r1.granted, 1); assert.equal(r1.ledger, 1)
  assert.equal(w.entitlements[0].max_downloads, DEFAULT_MAX_DOWNLOADS); assert.equal(DEFAULT_MAX_DOWNLOADS, 5)
  const r2 = await fulfilBooksForOrder(db, 'o1', { mailer: m })
  assert.equal(r2.granted, 0); assert.equal(w.entitlements.length, 1); assert.equal(w.royalty_entries.length, 1); assert.equal(m.sent.length, 1)
})
test('entitlements and ledger entries can only be written by server code (static checks)', () => {
  const walk = d => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p] })
  const src = walk(new URL('../src', import.meta.url).pathname).filter(f => /\.(ts|tsx)$/.test(f))
  for (const f of src) {
    const text = readFileSync(f, 'utf8')
    if (/books\/fulfil/.test(text)) assert.ok(/src\/app\/api\//.test(f) || /fulfil\.ts$/.test(f), `${f} imports fulfil outside a server route`)
    if (/from\('entitlements'\)\.(insert|update|delete)|from\('royalty_entries'\)\.(insert|update|delete)/.test(text)) assert.ok(/src\/lib\/books\/|src\/app\/api\//.test(f), `${f} writes books tables from the wrong place`)
  }
  assert.ok(!/create policy[^;]*entitlements[^;]*for (insert|update|delete|all)/i.test(SQL), 'customers must have no write policy on entitlements')
})

// ── download limit, expiry, revocation ───────────────────────────────────────────────────────────────────
test('download rules: limit, revocation and unknown entitlement', () => {
  assert.equal(authorizeDownload({ revoked_at: null, download_count: 4, max_downloads: 5 }).ok, true)
  assert.deepEqual(authorizeDownload({ revoked_at: null, download_count: 5, max_downloads: 5 }), { ok: false, reason: 'limit_reached' })
  assert.deepEqual(authorizeDownload({ revoked_at: '2026-01-01', download_count: 0, max_downloads: 5 }), { ok: false, reason: 'revoked' })
  assert.deepEqual(authorizeDownload(null), { ok: false, reason: 'not_found' })
})
test('the signed link lasts about 10 minutes, comes from the PRIVATE bucket, and is never a public URL', async () => {
  const calls = []
  const storage = { storage: { from: bucket => ({ createSignedUrl: async (path, secs) => { calls.push({ bucket, path, secs }); return { data: { signedUrl: `https://x/sign/${path}?token=t` }, error: null } } }) } }
  const url = await issueSignedUrl(storage, 'watermarked/abc.pdf')
  assert.equal(SIGNED_URL_SECONDS, 600)
  assert.deepEqual(calls, [{ bucket: 'book-files', path: 'watermarked/abc.pdf', secs: 600 }])
  assert.ok(url.includes('token=') && !url.includes('/public/'))
})
test('private paths are random and unguessable; ebook files are never in a public bucket', () => {
  const a = objectPath('11111111-1111-1111-1111-111111111111', 'ebook_pdf', 'Book.PDF')
  const b = objectPath('11111111-1111-1111-1111-111111111111', 'ebook_pdf', 'Book.PDF')
  assert.notEqual(a, b)
  assert.match(a, /^ebooks\/11111111-1111-1111-1111-111111111111\/[0-9a-f-]{36}\.pdf$/)
  assert.match(stampedPath('2d1f6e0a-1111-4222-8333-444455556666', 'pdf'), /^watermarked\/[0-9a-f-]{36}\.pdf$/)
  assert.equal(isPublicBucketPath(a), false); assert.equal(isPublicBucketPath('watermarked/x.pdf'), false)
  assert.match(SQL, /insert into storage\.buckets \(id, name, public\) values \('book-files', 'book-files', false\)/)
  assert.match(SQL, /update storage\.buckets set public = false where id = 'book-files'/)
  assert.ok(!/create policy[^;]*storage\.objects[^;]*book-files/i.test(SQL), 'no storage policy opens the private bucket')
})
test('private columns are never in the public select lists', () => {
  for (const c of PRIVATE_FORMAT_COLUMNS) assert.ok(!PUBLIC_FORMAT_SELECT.includes(c), c)
  const grant = SQL.match(/grant select \(([^)]+)\) on public\.book_formats to anon, authenticated/)[1]
  for (const c of PRIVATE_FORMAT_COLUMNS) assert.ok(!grant.includes(c), `${c} must not be granted`)
  const catalogue = readFileSync(new URL('../src/lib/books/catalogue.ts', import.meta.url), 'utf8')
  assert.ok(!/ebook_pdf_path|ebook_epub_path|print_cost_ngn/.test(catalogue))
})
test('upload checks: declared type and size, real first bytes, and the path must belong to the book', () => {
  assert.equal(validateDeclared('ebook_pdf', 'a.pdf', 1000, 'application/pdf'), null)
  assert.ok(validateDeclared('ebook_pdf', 'a.exe', 1000, 'application/pdf'))
  assert.ok(validateDeclared('cover', 'a.png', 6 * 1024 * 1024, 'image/png'))
  assert.equal(sniffMatches('ebook_pdf', strToU8('%PDF-1.7 ...')), true)
  assert.equal(sniffMatches('ebook_pdf', strToU8('MZ\x90\x00 not a pdf')), false)
  assert.equal(sniffMatches('ebook_epub', new Uint8Array([0x50, 0x4b, 0x03, 0x04])), true)
  const id = '11111111-1111-1111-1111-111111111111'
  assert.equal(pathBelongsToBook(objectPath(id, 'ebook_epub', 'x.epub'), id, 'ebook_epub'), true)
  assert.equal(pathBelongsToBook('ebooks/other/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.pdf', id, 'ebook_pdf'), false)
})

// ── watermark ──────────────────────────────────────────────────────────────────────────────────────────────
test('PDF: every page is stamped with the buyer, and the original is untouched', async () => {
  const src = await PDFDocument.create(); src.addPage([300, 400]); src.addPage([300, 400])
  const original = await src.save()
  const stamped = await stampPdf(original, 'Ada Obi <ada@example.com>')
  const doc = await PDFDocument.load(stamped)
  assert.equal(doc.getPageCount(), 2)
  assert.match(doc.getSubject(), /^Licensed to Ada Obi/)
  const hex = Buffer.from('Licensed to Ada Obi <ada@example.com>').toString('hex').toUpperCase()
  let found = 0
  for (const [, obj] of doc.context.enumerateIndirectObjects()) {
    const bytes = obj.contents
    if (!bytes) continue
    let text = Buffer.from(bytes).toString('latin1')
    try { text = inflateSync(Buffer.from(bytes)).toString('latin1') } catch { /* not compressed */ }
    if (text.toUpperCase().includes(hex)) found++
  }
  assert.equal(found, 2, 'one stamp per page')
  assert.equal((await PDFDocument.load(original)).getSubject(), undefined)
})
test('EPUB: a licence page, manifest and spine entries and metadata are added; mimetype stays first and stored', () => {
  const epub = zipSync({
    mimetype: [strToU8('application/epub+zip'), { level: 0 }],
    'META-INF/container.xml': strToU8('<container><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>'),
    'OEBPS/content.opf': strToU8('<package><metadata><dc:title>T</dc:title></metadata><manifest><item id="c1" href="c1.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="c1"/></spine></package>'),
    'OEBPS/c1.xhtml': strToU8('<html><body>hi</body></html>'),
  })
  const out = stampEpub(epub, 'Ada Obi <ada@example.com>')
  const files = unzipSync(out)
  assert.ok(files['OEBPS/cchu-licence.xhtml'])
  assert.match(strFromU8(files['OEBPS/cchu-licence.xhtml']), /licensed to Ada Obi/)
  const opf = strFromU8(files['OEBPS/content.opf'])
  assert.match(opf, /id="cchu-licence"/); assert.match(opf, /idref="cchu-licence"/); assert.match(opf, /cchu:licensed-to/)
  assert.equal(Object.keys(files)[0], 'mimetype')
  assert.equal(strFromU8(files['mimetype']), 'application/epub+zip')
})
test('the stamp label cannot break a PDF: non-latin characters are reduced to plain text', async () => {
  const src = await PDFDocument.create(); src.addPage()
  const out = await stampPdf(await src.save(), 'Chinedu Okafor 😀 <é@x.com>')
  assert.equal((await PDFDocument.load(out)).getPageCount(), 1)
})

// ── RLS and policies (read from the migration) ──────────────────────────────────────────────────────────────
test('RLS is on for every books table, and customers can only read their own entitlements', () => {
  for (const t of ['authors', 'books', 'book_formats', 'entitlements', 'download_log', 'royalty_rules', 'royalty_entries', 'royalty_payouts', 'books_settings']) {
    assert.match(SQL, new RegExp(`alter table public\\.${t}\\s+enable row level security`), t)
  }
  assert.match(SQL, /create policy "Customers read own entitlements" on public\.entitlements for select to authenticated using \(user_id = auth\.uid\(\)\)/)
  // no policy gives customers access to the ledger, the log, payouts or settings
  for (const t of ['download_log', 'royalty_rules', 'royalty_entries', 'royalty_payouts', 'books_settings']) {
    const policies = [...SQL.matchAll(new RegExp(`create policy "[^"]+" on public\\.${t}[^;]*;`, 'g'))].map(m => m[0])
    assert.ok(policies.length > 0 && policies.every(p => /public\.is_admin\(\)/.test(p)), `${t} must be admin-only`)
  }
  assert.match(SQL, /revoke all on public\.book_formats from anon, authenticated/)
})

// ── royalty ledger ──────────────────────────────────────────────────────────────────────────────────────────────
const rule = { book_id: null, ebook_author_share_pct: 50, print_author_share_pct: 30, referral_share_pct: 70, hold_days: 30, minimum_payout: 5000 }
test('ledger: ebook store sale (share on net after the fee)', () => {
  const [e] = computeRoyalty({ formatType: 'ebook', gross: 2500, quantity: 1, orderFee: 100, orderTotal: 2500, printCostPerCopy: null, rule, referral: false })
  assert.deepEqual([e.gross, e.payment_fee, e.net, e.author_share, e.company_share, e.source], [2500, 100, 2400, 1200, 1200, 'store'])
})
test('ledger: referral sale uses the referral share instead of the normal one', () => {
  const [e] = computeRoyalty({ formatType: 'ebook', gross: 2500, quantity: 1, orderFee: 100, orderTotal: 2500, printCostPerCopy: null, rule, referral: true })
  assert.equal(e.source, 'referral'); assert.equal(e.author_share, 1680)          // 70% of 2400
})
test('ledger: print sale (share on price minus print cost minus fee)', () => {
  const [e] = computeRoyalty({ formatType: 'print', gross: 10000, quantity: 2, orderFee: 200, orderTotal: 10000, printCostPerCopy: 1500, rule, referral: false })
  assert.equal(e.net, 9800); assert.equal(e.author_share, 2040)                   // 30% of (9800 - 3000)
  assert.equal(e.author_share + e.company_share, e.net)
})
test('ledger: a bundle writes an ebook part and a print part in proportion to the two prices', () => {
  const parts = computeRoyalty({ formatType: 'bundle', gross: 6500, quantity: 1, orderFee: 0, orderTotal: 6500, printCostPerCopy: 1500, rule, referral: false, bundleEbookRatio: 2500 / 7500 })
  assert.deepEqual(parts.map(p => p.part), ['ebook', 'print']); assert.equal(parts[0].gross + parts[1].gross, 6500)
})
test('ledger: no rule means author share 0 and a visible note, never an invented percentage', () => {
  const [e] = computeRoyalty({ formatType: 'ebook', gross: 1000, quantity: 1, orderFee: 0, orderTotal: 1000, printCostPerCopy: null, rule: null, referral: false })
  assert.equal(e.author_share, 0); assert.match(e.note, /no royalty rule/)
  assert.equal(pickRule([rule], 'b1').book_id, null)
  assert.equal(pickRule([rule, { ...rule, book_id: 'b1', ebook_author_share_pct: 60 }], 'b1').ebook_author_share_pct, 60)
})
test('ledger written from a paid order: referral code on the order switches the source; entries start pending, payable after the hold days', async () => {
  const w = world({ status: 'paid', author_ref_code: 'ada10' }), db = fakeDb(w, { unique: UNIQUE })
  const now = new Date('2026-12-01T00:00:00Z')
  await fulfilBooksForOrder(db, 'o1', { mailer: mail(), now })
  const e = w.royalty_entries[0]
  assert.equal(e.source, 'referral'); assert.equal(e.status, 'pending')
  assert.equal(e.payable_at.slice(0, 10), '2026-12-31')   // 1 Dec + 30 days
  assert.equal(effectiveStatus(e, new Date('2026-12-15')), 'pending'); assert.equal(effectiveStatus(e, new Date('2027-01-05')), 'payable')
})
test('test orders write no royalty entries (but the buyer can still test the download)', async () => {
  const w = world({ status: 'paid', is_test: true }), db = fakeDb(w, { unique: UNIQUE })
  const r = await fulfilBooksForOrder(db, 'o1', { mailer: mail() })
  assert.equal(r.granted, 1); assert.equal(w.royalty_entries.length, 0)
})
test('refund: access is withdrawn and the ledger nets to zero (unpaid), or a negative payable entry is created (already paid)', async () => {
  const w = world({ status: 'paid' }), db = fakeDb(w, { unique: UNIQUE })
  await fulfilBooksForOrder(db, 'o1', { mailer: mail() })
  const r = await reverseBooksForOrder(db, 'o1')
  assert.equal(r.revoked, 1); assert.equal(r.reversed, 1)
  assert.ok(w.entitlements[0].revoked_at)
  const [orig, neg] = w.royalty_entries
  assert.equal(orig.status, 'reversed'); assert.equal(neg.status, 'reversed'); assert.equal(neg.author_share, -orig.author_share); assert.equal(neg.refund_of, orig.id)
  assert.equal((await reverseBooksForOrder(db, 'o1')).reversed, 0, 'second refund call does nothing')
  const summary = summariseEntries(w.royalty_entries, new Date())
  assert.equal(summary.length === 0 || summary[0].author_share === 0, true)

  const w2 = world({ status: 'paid' }), db2 = fakeDb(w2, { unique: UNIQUE })
  await fulfilBooksForOrder(db2, 'o1', { mailer: mail() })
  w2.royalty_entries[0].status = 'paid'
  await reverseBooksForOrder(db2, 'o1')
  assert.equal(w2.royalty_entries[0].status, 'paid'); assert.equal(w2.royalty_entries[1].status, 'payable'); assert.ok(w2.royalty_entries[1].author_share < 0)
})
test('payouts: only due entries count, and the minimum payout is enforced', () => {
  const now = new Date('2027-02-01'), row = (o = {}) => ({ id: 'x', status: 'pending', payable_at: '2027-01-01', author_share: 3000, ...o })
  assert.equal(payoutDecision([row()], 5000, now).meetsMinimum, false)
  assert.equal(payoutDecision([row(), row({ id: 'y' })], 5000, now).total, 6000)
  assert.equal(payoutDecision([row(), row({ id: 'y' })], 5000, now).meetsMinimum, true)
  assert.equal(payoutDecision([row({ payable_at: '2027-03-01' })], 100, now).total, 0, 'still on hold')
  assert.equal(payoutDecision([row({ payout_id: 'p1' })], 100, now).total, 0, 'already in a payout')
})

// ── affiliates ─────────────────────────────────────────────────────────────────────────────────────────────────────
const commWorld = (extra = {}) => ({
  orders: [{ id: 'o1', user_id: 'cust', status: 'delivered', total_amount: 10000, ...extra }],
  profiles: [{ id: 'cust', referred_by: 'owner' }], affiliates: [{ id: 'aff', profile_id: 'owner', is_active: true, total_earnings: 0, pending_payout: 0 }],
  commissions: [], referrals: [], order_items: [], books_settings: [{ id: true, book_affiliate_rate: 0 }],
})
test('affiliate: book lines are outside the 10/5/3 tiers; the book rate defaults to 0', async () => {
  const w = commWorld(); w.order_items = [{ order_id: 'o1', item_type: 'book', price: 10000 }]
  assert.equal((await awardCommissionForOrder(fakeDb(w, { unique: { commissions: [['order_id']] } }), 'o1')).state, 'no_commission_base')
  const m = commWorld(); m.order_items = [{ order_id: 'o1', item_type: 'book', price: 4000 }]   // 6000 of products + 4000 of books
  const r = await awardCommissionForOrder(fakeDb(m, { unique: { commissions: [['order_id']] } }), 'o1')
  assert.equal(r.state, 'awarded'); assert.equal(m.commissions[0].amount, 600)                    // 10% of 6000, books earn 0
  const k = commWorld(); k.order_items = [{ order_id: 'o1', item_type: 'book', price: 4000 }]; k.books_settings[0].book_affiliate_rate = 5
  await awardCommissionForOrder(fakeDb(k, { unique: { commissions: [['order_id']] } }), 'o1')
  assert.equal(k.commissions[0].amount, 800)                                                       // 600 + 5% of 4000
})
test('affiliate: USD orders earn no (naira) commission in this phase', async () => {
  const w = commWorld({ currency: 'USD' })
  assert.equal((await awardCommissionForOrder(fakeDb(w), 'o1')).state, 'usd_order')
})

// ── catalogue and sitemap ───────────────────────────────────────────────────────────────────────────────────────────
test('sitemap lists published books and their authors only', () => {
  const draft = { ...FIXTURE_BOOKS[1], id: 'd', slug: 'a-draft', status: 'draft' }
  const paths = bookSitemapPaths([...FIXTURE_BOOKS, draft]).map(p => p.path)
  assert.ok(paths.includes('/books/sample-book-one') && paths.includes('/authors/sample-author'))
  assert.ok(!paths.includes('/books/a-draft'))
  assert.equal(queryBooks([...FIXTURE_BOOKS, draft], {}).total, 2)
})
test('storefront search, category filter, sort and pagination', () => {
  assert.equal(queryBooks(FIXTURE_BOOKS, { q: 'two' }).total, 1)
  assert.equal(queryBooks(FIXTURE_BOOKS, { category: 'fiction' }).total, 1)
  assert.equal(queryBooks(FIXTURE_BOOKS, { sort: 'price-asc' }).items[0].slug, 'sample-book-two')
  const many = Array.from({ length: 30 }, (_, i) => ({ ...FIXTURE_BOOKS[1], id: `b${i}`, slug: `s${i}`, title: `T${i}` }))
  const p = queryBooks(many, { page: 99, pageSize: 12 })
  assert.equal(p.pages, 3); assert.equal(p.page, 3); assert.equal(p.items.length, 6)
})
