// Run with:  node --test tests/chat-prompt.test.mjs
// Fails if any amount of money is typed into the chatbot's prompt files. Prices must come
// from live data (chat-context.ts) or lib/constants, never from literals in the prompt.

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const FILES = ['src/lib/chat-prompt.ts', 'src/lib/chat-context.ts', 'src/app/api/chat/route.ts']

// ₦ followed by a digit, "N50,000"-style amounts, or "NGN 5000"
const LITERAL_AMOUNT = [/₦\s*\d/, /\bN\s?\d{1,3}(,\d{3})+\b/, /\bNGN\s?\d/i, /\b\d{1,3}(,\d{3})+\s?(naira|₦)/i]

for (const file of FILES) {
  test(`${file} has no hard-coded naira amounts`, () => {
    const src = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')
    const offending = src.split('\n')
      .map((line, i) => ({ line, n: i + 1 }))
      .filter(({ line }) => !line.trim().startsWith('//') && LITERAL_AMOUNT.some(re => re.test(line)))
    assert.deepEqual(offending.map(o => `${file}:${o.n}: ${o.line.trim()}`), [])
  })
}

test('the prompt file really is scanned (guard against an empty or moved file)', () => {
  const src = readFileSync(new URL('../src/lib/chat-prompt.ts', import.meta.url), 'utf8')
  assert.ok(src.includes('buildSystemPrompt'))
})
