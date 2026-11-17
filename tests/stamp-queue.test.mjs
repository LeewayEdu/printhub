// Run with:  node --import ./scripts/alias-register.mjs --test tests/stamp-queue.test.mjs
// Background stamping: queued after verified payment, made by a secret-protected job, served only when ready.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fakeDb } from './_fakedb.mjs'
import { downloadReadiness, maxEbookBytes, processStampQueue, triggerStampJob, MAX_STAMP_ATTEMPTS, MAX_EBOOK_MB_DEFAULT, PREPARING_MESSAGE } from '../src/lib/books/stamp-queue.ts'
import { fulfilBooksForOrder } from '../src/lib/books/fulfil.ts'
import { validateDeclared } from '../src/lib/books/uploads.ts'

const read = p => readFileSync(new URL(p, import.meta.url), 'utf8')
const ago = (ms, now) => new Date(now.getTime() - ms).toISOString()

test('the customer-facing wording is exact', () => assert.equal(PREPARING_MESSAGE, 'Preparing your copy, check back in a few minutes.'))

// ── queued after verified payment ──────────────────────────────────────────────────────────────────────
const paidWorld = (status = 'paid') => ({
  orders: [{ id: 'o1', user_id: 'u1', status, total_amount: 2500, currency: 'NGN', payment_fee: 0, email: 'a@b.com', first_name: 'Ada' }],
  order_items: [{ id: 'i1', order_id: 'o1', item_type: 'book', book_id: 'b1', book_format_id: 'fe', price: 2500, quantity: 1 }],
  book_formats: [{ id: 'fe', book_id: 'b1', type: 'ebook', price_ngn: 2500, ebook_pdf_path: 'ebooks/b1/x.pdf', ebook_epub_path: 'ebooks/b1/x.epub' }],
  books: [{ id: 'b1', title: 'One', author_id: 'a1' }], authors: [{ id: 'a1' }], royalty_rules: [], entitlements: [], royalty_entries: [],
})
const UNIQ = { entitlements: [['order_item_id']], royalty_entries: [{ keys: ['order_item_id', 'part'], where: r => r.refund_of == null }] }

test('after verified payment the stamping job is triggered once; an unpaid order triggers nothing', async () => {
  let calls = 0
  const trigger = async () => { calls++ }
  await fulfilBooksForOrder(fakeDb(paidWorld('pending'), { unique: UNIQ }), 'o1', { mailer: async () => true, trigger })
  assert.equal(calls, 0)
  const w = paidWorld(), db = fakeDb(w, { unique: UNIQ })
  await fulfilBooksForOrder(db, 'o1', { mailer: async () => true, trigger })
  assert.equal(calls, 1)
  await fulfilBooksForOrder(db, 'o1', { mailer: async () => true, trigger })      // repeated confirmation: nothing new granted
  assert.equal(calls, 1)
  assert.equal(w.entitlements.length, 1)
})

// ── what the download route does ──────────────────────────────────────────────────────────────────────────────
test('download readiness: serve only a stored copy under watermarked/, otherwise "preparing"', () => {
  assert.deepEqual(downloadReadiness({ stamp_status: 'ready', stamped_pdf_path: 'watermarked/e1.pdf' }, 'pdf'), { state: 'ready', path: 'watermarked/e1.pdf' })
  assert.equal(downloadReadiness({ stamp_status: 'ready', stamped_pdf_path: 'watermarked/e1.pdf' }, 'epub').state, 'preparing', 'no stored EPUB yet')
  assert.equal(downloadReadiness({ stamp_status: 'pending' }, 'pdf').state, 'preparing')
  assert.equal(downloadReadiness({ stamp_status: 'processing' }, 'pdf').state, 'preparing')
  assert.equal(downloadReadiness({ stamp_status: 'failed', stamp_attempts: 1 }, 'pdf').state, 'preparing', 'will be retried')
  assert.equal(downloadReadiness({ stamp_status: 'failed', stamp_attempts: MAX_STAMP_ATTEMPTS }, 'pdf').state, 'failed')
  assert.equal(downloadReadiness({ stamp_status: 'ready', stamped_pdf_path: 'ebooks/original.pdf' }, 'pdf').state, 'preparing', 'an original file path is never served')
  assert.equal(downloadReadiness({}, 'pdf').state, 'preparing')
})
test('the download route no longer stamps anything: it answers 202 "preparing" and starts the job', () => {
  const route = read('../src/app/api/books/download/route.ts')
  assert.ok(!/getOrCreateStamped|stampPdf|stampEpub/.test(route))
  assert.match(route, /status: 202/); assert.match(route, /PREPARING_MESSAGE/); assert.match(route, /triggerStampJob\(ent\.id\)/)
  assert.match(route, /downloadReadiness\(ent, type\)/)
})

// ── the job ─────────────────────────────────────────────────────────────────────────────────────────────────────
const queueWorld = () => ({
  entitlements: [
    { id: 'e1', user_id: 'u1', book_id: 'b1', book_format_id: 'fe', stamp_status: 'pending', stamp_attempts: 0, granted_at: '2026-01-01' },
    { id: 'e2', user_id: 'u2', book_id: 'b1', book_format_id: 'fe', stamp_status: 'pending', stamp_attempts: 0, revoked_at: '2026-01-02' },
    { id: 'e3', user_id: 'u3', book_id: 'b1', book_format_id: 'fe', stamp_status: 'ready', stamped_pdf_path: 'watermarked/e3.pdf' },
  ],
  book_formats: [{ id: 'fe', book_id: 'b1', type: 'ebook', ebook_pdf_path: 'ebooks/b1/x.pdf', ebook_epub_path: 'ebooks/b1/x.epub' }],
  profiles: [{ id: 'u1', first_name: 'Ada', last_name: 'Obi', email: 'ada@x.com' }],
})
const okStamp = calls => async (_db, id, type, src, label) => { calls.push({ id, type, src, label }); return `watermarked/${id}.${type}` }

test('the job stamps queued copies (PDF and EPUB), skips revoked and finished ones, and records where they are', async () => {
  const w = queueWorld(), calls = []
  const r = await processStampQueue(fakeDb(w), { stamp: okStamp(calls) })
  assert.deepEqual([r.claimed, r.ready, r.failed], [1, 1, 0])
  assert.deepEqual(calls.map(c => c.type), ['pdf', 'epub']); assert.equal(calls[0].label, 'Ada Obi <ada@x.com>')
  const e1 = w.entitlements[0]
  assert.equal(e1.stamp_status, 'ready'); assert.equal(e1.stamped_pdf_path, 'watermarked/e1.pdf'); assert.equal(e1.stamped_epub_path, 'watermarked/e1.epub')
  assert.equal(w.entitlements[1].stamp_status, 'pending', 'revoked entitlements are left alone')
})
test('running the job again does no work (idempotent), and two runs at once claim an entitlement only once', async () => {
  const w = queueWorld(), calls = []
  await processStampQueue(fakeDb(w), { stamp: okStamp(calls) })
  const again = await processStampQueue(fakeDb(w), { stamp: okStamp(calls) })
  assert.equal(again.claimed, 0); assert.equal(calls.length, 2)
  const w2 = queueWorld(), c2 = [], db2 = fakeDb(w2)
  const [a, b] = await Promise.all([processStampQueue(db2, { stamp: okStamp(c2) }), processStampQueue(db2, { stamp: okStamp(c2) })])
  assert.equal(a.claimed + b.claimed, 1)
  assert.equal(c2.filter(c => c.type === 'pdf').length, 1)
})
test('a failure is counted and retried, and stops after the maximum attempts', async () => {
  const w = queueWorld(), db = fakeDb(w), bad = async () => null
  for (let i = 1; i <= MAX_STAMP_ATTEMPTS; i++) {
    const r = await processStampQueue(db, { stamp: bad })
    assert.equal(r.failed, 1, `attempt ${i}`); assert.equal(w.entitlements[0].stamp_attempts, i)
  }
  assert.equal(w.entitlements[0].stamp_status, 'failed'); assert.match(w.entitlements[0].stamp_error, /could not be stamped/)
  assert.equal((await processStampQueue(db, { stamp: okStamp([]) })).claimed, 0, 'no more attempts')
  assert.equal(downloadReadiness(w.entitlements[0], 'pdf').state, 'failed')
})
test('an entitlement stuck in "processing" is picked up again only after the stale time', async () => {
  const now = new Date('2026-06-01T12:00:00Z'), w = queueWorld()
  Object.assign(w.entitlements[0], { stamp_status: 'processing', stamp_started_at: ago(60_000, now) })
  assert.equal((await processStampQueue(fakeDb(w), { now, stamp: okStamp([]) })).claimed, 0, 'someone is on it')
  w.entitlements[0].stamp_started_at = ago(30 * 60_000, now)
  assert.equal((await processStampQueue(fakeDb(w), { now, stamp: okStamp([]) })).ready, 1)
})
test('one entitlement can be processed on demand', async () => {
  const w = queueWorld(), calls = []
  const r = await processStampQueue(fakeDb(w), { entitlementId: 'e1', stamp: okStamp(calls) })
  assert.equal(r.ready, 1)
})

// ── trigger and job route ─────────────────────────────────────────────────────────────────────────────────────────────
test('the trigger never waits for the job: it returns after the request is dispatched', async () => {
  const realFetch = global.fetch, seen = []
  process.env.CRON_SECRET = 'test-secret-value'
  global.fetch = (url, init) => { seen.push({ url: String(url), auth: init?.headers?.Authorization }); return new Promise(() => {}) }   // never answers
  const t0 = Date.now(), ok = await triggerStampJob('11111111-1111-1111-1111-111111111111')
  global.fetch = realFetch; delete process.env.CRON_SECRET
  assert.equal(ok, true); assert.ok(Date.now() - t0 < 4000, 'returns even though the job route never answers')
  assert.match(seen[0].url, /\/api\/cron\/books-stamp\?entitlement=11111111/); assert.equal(seen[0].auth, 'Bearer test-secret-value')
  assert.equal(await triggerStampJob(), false, 'without CRON_SECRET nothing is sent')
})
test('the job route is secret-protected like the other jobs, and the daily sweep runs it', () => {
  const route = read('../src/app/api/cron/books-stamp/route.ts')
  assert.match(route, /const ok = !!secret && /); assert.match(route, /timingSafeEqual/); assert.match(route, /status: 401/)
  assert.match(read('../src/app/api/cron/design-reminders/route.ts'), /processStampQueue\(db/)
})

// ── size limit ──────────────────────────────────────────────────────────────────────────────────────────────────────────
test('ebook size limit comes from config, with a proposed default of 30 MB', () => {
  assert.equal(MAX_EBOOK_MB_DEFAULT, 30)
  assert.equal(maxEbookBytes(null), 30 * 1024 * 1024)
  assert.equal(maxEbookBytes({ max_ebook_mb: 50 }), 50 * 1024 * 1024)
  assert.equal(maxEbookBytes({ max_ebook_mb: 0 }), 30 * 1024 * 1024, 'nonsense falls back to the default')
  assert.match(read('../books-1b-migration.sql'), /max_ebook_mb integer not null default 30/)
})
test('uploads over the configured limit are refused; images are unaffected', () => {
  const MB = 1024 * 1024
  assert.match(validateDeclared('ebook_pdf', 'a.pdf', 31 * MB, 'application/pdf', maxEbookBytes(null)), /too large/)
  assert.equal(validateDeclared('ebook_pdf', 'a.pdf', 31 * MB, 'application/pdf', maxEbookBytes({ max_ebook_mb: 50 })), null)
  assert.match(validateDeclared('ebook_epub', 'a.epub', 40 * MB, 'application/epub+zip', maxEbookBytes(null)), /too large/)
  assert.equal(validateDeclared('cover', 'c.png', 4 * MB, 'image/png', 1), null)
  assert.match(read('../src/app/api/admin/books/upload-url/route.ts'), /maxEbookBytes\(settings\)/)
  assert.match(read('../src/app/api/admin/books/upload-confirm/route.ts'), /limitFor\(b\.kind, maxEbookBytes\(settings\)\)/)
})
