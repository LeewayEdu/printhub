// Run with:  node --import ./scripts/alias-register.mjs --test tests/notify-auth.test.mjs
// /api/notify sends email from the shop's address, so it must not be open to anyone.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { identifyNotifyCaller, notifySecret, escapeHtml, shortOrderId } from '../src/lib/notify-auth.ts'

const H = obj => ({ get: n => obj[n.toLowerCase()] ?? null })

test('no credentials is refused', () => {
  assert.deepEqual(identifyNotifyCaller(H({}), { NOTIFY_SECRET: 's3cret-value' }), { mode: 'none' })
})

test('the shared secret is accepted for server callers, a wrong one is not', () => {
  assert.equal(identifyNotifyCaller(H({ 'x-notify-secret': 's3cret-value' }), { NOTIFY_SECRET: 's3cret-value' }).mode, 'secret')
  assert.equal(identifyNotifyCaller(H({ 'x-notify-secret': 'nope' }), { NOTIFY_SECRET: 's3cret-value' }).mode, 'none')
  assert.equal(identifyNotifyCaller(H({ 'x-notify-secret': 's3cret-valuX' }), { NOTIFY_SECRET: 's3cret-value' }).mode, 'none')
})

test('with no secret configured nothing matches, not even an empty header', () => {
  assert.equal(identifyNotifyCaller(H({ 'x-notify-secret': '' }), {}).mode, 'none')
  assert.equal(identifyNotifyCaller(H({ 'x-notify-secret': 'anything' }), {}).mode, 'none')
})

test('CRON_SECRET is the fallback secret; NOTIFY_SECRET wins when both are set', () => {
  assert.equal(notifySecret({ CRON_SECRET: 'c' }), 'c')
  assert.equal(notifySecret({ CRON_SECRET: 'c', NOTIFY_SECRET: 'n' }), 'n')
  assert.equal(identifyNotifyCaller(H({ 'x-notify-secret': 'c' }), { CRON_SECRET: 'c' }).mode, 'secret')
})

test('a bearer token is a user caller (the route then checks the order belongs to them); the secret as a bearer is not', () => {
  assert.deepEqual(identifyNotifyCaller(H({ authorization: 'Bearer abc.def' }), { NOTIFY_SECRET: 's' }), { mode: 'user', token: 'abc.def' })
  assert.equal(identifyNotifyCaller(H({ authorization: 'Bearer s' }), { NOTIFY_SECRET: 's' }).mode, 'none')
  assert.equal(identifyNotifyCaller(H({ authorization: 'Basic abc' }), {}).mode, 'none')
})

test('email text is escaped and short ids are upper case', () => {
  assert.equal(escapeHtml('<img src=x onerror=1> & "q"'), '&lt;img src=x onerror=1&gt; &amp; &quot;q&quot;')
  assert.equal(shortOrderId('32275a86-f94f-4958-9d8d-7a9bece0c9e8'), '32275A86')
})

test('the route, the webhook and the checkout page use it', () => {
  const read = p => readFileSync(new URL(p, import.meta.url), 'utf8')
  assert.match(read('../src/app/api/notify/route.ts'), /identifyNotifyCaller\(req\.headers\)/)
  assert.match(read('../src/app/api/notify/route.ts'), /caller\.mode === 'none'\) return NextResponse\.json\(\{ error: 'Unauthorized' \}, \{ status: 401 \}\)/)
  assert.match(read('../src/app/api/webhooks/paystack/route.ts'), /'x-notify-secret': notifySecret\(\)/)
  assert.match(read('../src/app/checkout/page.tsx'), /fetch\('\/api\/notify'[\s\S]{0,400}Authorization: `Bearer/)
})
