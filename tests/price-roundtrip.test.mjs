// Run with:  node --test tests/price-roundtrip.test.mjs
// Proves the server's price recomputation (used to reject tampered carts) gives exactly what the
// browser calculator gives. For every calculator-priced product it builds random carts the way a
// customer would, takes the browser total, rebuilds the price on the "server" from the cart's
// summary only, and requires them to match within ₦1. Reads the public catalogue; skipped if it
// cannot be reached.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import { calculate, buildSpecSummary, recomputePrintTotal, fixedPriceTotal, PAGE_STEPPER_CONFIG, DEFAULT_PAGE_STEPPER } from '../src/lib/priceCalc.ts'

const env = {}
try { fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n').forEach(l => { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].replace(/^"|"$/g, '') }) } catch {}
const url = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

test('fixed-price products price as stored price x quantity, never from option rates', () => {
  assert.equal(fixedPriceTotal({ display_price: 15000 }, 1), 15000)
  assert.equal(fixedPriceTotal({ display_price: 15000 }, 3), 45000)
  assert.equal(fixedPriceTotal({ price: 60000 }, 2), 120000)
})

test('server recomputation equals the browser calculator for random carts', { skip: !url || !key }, async () => {
  const { createClient } = createRequire(import.meta.url)('@supabase/supabase-js')
  const s = createClient(url, key)
  const prods = (await s.from('products').select('*').eq('is_active', true)).data.filter(p => !p.is_fixed_price)
  const specs = (await s.from('spec_options').select('*').eq('is_active', true).order('sort_order')).data
  const tiers = (await s.from('qty_tiers').select('*').order('sort_order')).data
  const models = Object.fromEntries((await s.from('categories').select('slug,price_model')).data.map(c => [c.slug, c.price_model]))
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  let checked = 0
  const bad = []
  for (const p of prods) {
    const cat = p.product_type || p.category, priceModel = models[cat] || 'unit'
    const groups = {}; specs.filter(o => o.category === cat && !o.is_addon).forEach(o => { (groups[o.spec_group] ||= []).push(o) })
    const addonOpts = specs.filter(o => o.category === cat && o.is_addon)
    const t = tiers.filter(x => x.category === cat)
    const isArea = priceModel === 'area' || priceModel === 'area_sqin', isBook = priceModel === 'per_page'
    const pc = PAGE_STEPPER_CONFIG[cat] || DEFAULT_PAGE_STEPPER
    for (let k = 0; k < 40; k++) {
      const sel = {}; for (const [g, o] of Object.entries(groups)) sel[g] = o[Math.floor(rnd() * o.length)]
      const moq = Math.max(Number(p.moq) || 1, 1), inc = Math.max(Number(p.increment) || 1, 1), qty = moq + inc * Math.floor(rnd() * 6)
      const minW = Number(p.min_width) || 0.1, minH = Number(p.min_height) || 0.1
      const w = isArea ? Math.max(minW, 1 + Math.floor(rnd() * 12)) : 1, h = isArea ? Math.max(minH, 1 + Math.floor(rnd() * 8)) : 1
      const pages = isBook ? pc.min + pc.step * Math.floor(rnd() * 10) : 0
      const adds = addonOpts.filter(() => rnd() < 0.4).map(o => ({ option: o, qty: 1 + Math.floor(rnd() * 4) }))
      const client = calculate({ category: cat, priceModel, specs: sel, addons: adds, qty, widthFt: w, heightFt: h, minWidth: minW, minHeight: minH, pages, tiers: t, minOrderAmount: Number(p.min_order_amount) || 0 })
      const summary = buildSpecSummary(sel, qty, isArea ? w : undefined, isArea ? h : undefined, isBook ? pages : undefined, adds)
      const r = recomputePrintTotal({ category: cat, priceModel, groups, addons: addonOpts, tiers: t, minWidth: p.min_width, minHeight: p.min_height, minOrderAmount: p.min_order_amount, specs: summary })
      checked++
      if ('error' in r || Math.abs(r.total - client.total) > 1) bad.push(`${p.name.trim().slice(0, 30)}: client ${client.total} server ${'error' in r ? r.error : r.total}`)
    }
  }
  assert.ok(checked > 500, `only ${checked} carts checked`)
  assert.deepEqual(bad.slice(0, 5), [])
})
