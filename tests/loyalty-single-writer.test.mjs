// Run with:  node --import ./scripts/alias-register.mjs --test tests/loyalty-single-writer.test.mjs
// Loyalty points must be credited by one writer only: the database trigger on_order_delivered (2%).
// The admin screen used to also call award_loyalty_on_delivery, which made it 4%.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

function walk(dir) {
  return readdirSync(dir).flatMap(n => {
    const p = join(dir, n)
    return statSync(p).isDirectory() ? walk(p) : [p]
  })
}

test('no app code calls the second loyalty writer', () => {
  const hits = walk(new URL('../src', import.meta.url).pathname)
    .filter(f => /\.(ts|tsx)$/.test(f))
    .filter(f => /rpc\(\s*['"]award_loyalty_on_delivery['"]/.test(readFileSync(f, 'utf8')))
  assert.deepEqual(hits, [])
})

test('the delivered action still awards the affiliate commission', () => {
  const src = readFileSync(new URL('../src/store/adminOrdersStore.ts', import.meta.url), 'utf8')
  assert.match(src, /\/api\/admin\/orders\/award/)
})
