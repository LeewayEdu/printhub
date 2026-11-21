// Run with:  node --import ./scripts/alias-register.mjs --test tests/table-stand-pricing.test.mjs
// Plastic Table Stands: ₦4,000 per piece, minimum order 10 pieces, price by quantity (owner answer 2026-11-21).
// The data model already expresses this (fixed price x quantity, moq 10), so the test pins it.
import test from 'node:test'
import assert from 'node:assert/strict'
import { fixedPriceTotal } from '../src/lib/priceCalc.ts'

const stand = { display_price: 4000, price: 4000 }

test('₦4,000 per piece: the minimum of 10 is ₦40,000 and 12 pieces are ₦48,000', () => {
  assert.equal(fixedPriceTotal(stand, 10), 40000)
  assert.equal(fixedPriceTotal(stand, 12), 48000)
  assert.equal(fixedPriceTotal(stand, 25), 100000)
})

test('the price grows in a straight line with quantity (no pack price)', () => {
  for (const q of [10, 11, 20, 50, 100]) assert.equal(fixedPriceTotal(stand, q), 4000 * q)
})
