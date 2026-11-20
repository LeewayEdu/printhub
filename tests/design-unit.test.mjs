// Run with:  node --import ./scripts/alias-register.mjs --test tests/design-unit.test.mjs
// The unit word next to a design quantity: never a bare number, correct singular and plural.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { designUnitWord, designUnitText, isUnitWord, DEFAULT_DESIGN_UNIT } from '../src/lib/design-unit.ts'

const QTY = [1, 2, 3]

test('empty labels fall back to "designs" (singular for 1)', () => {
  for (const label of [undefined, null, '', '   ']) {
    assert.deepEqual(QTY.map(n => designUnitText(label, n)), ['1 design', '2 designs', '3 designs'])
  }
  assert.equal(DEFAULT_DESIGN_UNIT, 'designs')
})

test('numeric and range-like labels never appear as a unit (the live bad values: "1", "2", "1-2")', () => {
  for (const label of ['1', '2', '1-2', '1 - 2', '10', '1.5', '-', '--', '/', 12]) {
    for (const n of QTY) {
      const text = designUnitText(label, n)
      assert.equal(text, n === 1 ? '1 design' : `${n} designs`, `label ${JSON.stringify(label)} qty ${n}`)
      assert.ok(!/\d\s+\d/.test(text), `no bare number as a unit: ${text}`)
    }
  }
})

test('normal labels are used, singular for 1 and plural otherwise (plural or singular input)', () => {
  assert.deepEqual(QTY.map(n => designUnitText('sides', n)), ['1 side', '2 sides', '3 sides'])
  assert.deepEqual(QTY.map(n => designUnitText('side', n)), ['1 side', '2 sides', '3 sides'])
  assert.deepEqual(QTY.map(n => designUnitText('Designs', n)), ['1 Design', '2 Designs', '3 Designs'])
  assert.deepEqual(QTY.map(n => designUnitText('  card faces ', n)), ['1 card face', '2 card faces', '3 card faces'])
  assert.equal(designUnitWord('glass', 1), 'glass')   // double s is not stripped
  assert.equal(designUnitWord('sides', 2), 'sides')
})

test('the header word is plural at the usual minimum of 2', () => {
  assert.equal(designUnitWord('1', 2), 'designs')
  assert.equal(designUnitWord(undefined, 2), 'designs')
  assert.equal(designUnitWord('sides', 2), 'sides')
})

test('isUnitWord needs a letter', () => {
  for (const ok of ['sides', 'Designs', 'a', 'side 1']) assert.equal(isUnitWord(ok), true, ok)
  for (const bad of ['', ' ', '1', '1-2', '--', null, undefined, 3]) assert.equal(isUnitWord(bad), false, String(bad))
})

test('the design block renders the unit only through the helper (no raw label in the page text)', () => {
  const src = readFileSync(new URL('../src/components/shop/DesignPricingFlow.tsx', import.meta.url), 'utf8')
  assert.match(src, /designUnitWord\(unitLabel, minUnits\)/)
  assert.match(src, /designUnitText\(unitLabel, designUnits\)/)
  assert.ok(!/\{unitLabel\}/.test(src), 'unitLabel must not be rendered directly')
  assert.ok(!/design_unit_label \|\| 'units'/.test(src), 'old "units" fallback removed')
})

test('the arithmetic is unchanged: units x rate (3 x 3,000 = 9,000; minimum 2 = 6,000)', () => {
  const src = readFileSync(new URL('../src/components/shop/DesignPricingFlow.tsx', import.meta.url), 'utf8')
  assert.match(src, /unitRate \* Math\.max\(designUnits, minUnits\)/)
  assert.equal(3 * 3000, 9000); assert.equal(2 * 3000, 6000)
})
