import { supabase } from '@/lib/supabase/client'

// ── TYPES ─────────────────────────────────────────────────────

export interface SpecOption {
  id: string
  category: string
  spec_group: string
  option_label: string
  price_modifier: number
  modifier_type: string
  is_active: boolean
  sort_order: number
  is_default?: boolean
  is_addon?: boolean
}

export interface QtyTier {
  id: string
  category: string
  min_qty: number
  max_qty: number | null
  discount_pct: number
  label: string
}

export interface SpecSelection {
  [spec_group: string]: SpecOption
}

export interface AddonSelection {
  option: SpecOption
  qty: number
}

export interface CalcResult {
  total: number
  minPrice: number
  discountPct: number
  discountAmount: number
  tierLabel: string | null
  summaryText: string
}

// ── CACHE ─────────────────────────────────────────────────────

interface Cache {
  specs: Record<string, SpecOption[]>
  tiers: Record<string, QtyTier[]>
  time: number
}

let _cache: Cache | null = null
const CACHE_TTL = 5 * 60 * 1000

async function getCache(): Promise<Cache> {
  if (_cache && Date.now() - _cache.time < CACHE_TTL) return _cache

  const [{ data: specs }, { data: tiers }] = await Promise.all([
    supabase.from('spec_options').select('*').eq('is_active', true).order('sort_order'),
    supabase.from('qty_tiers').select('*').order('sort_order'),
  ])

  const specMap: Record<string, SpecOption[]> = {}
  for (const s of specs || []) {
    if (!specMap[s.category]) specMap[s.category] = []
    specMap[s.category].push(s)
  }

  const tierMap: Record<string, QtyTier[]> = {}
  for (const t of tiers || []) {
    if (!tierMap[t.category]) tierMap[t.category] = []
    tierMap[t.category].push(t)
  }

  _cache = { specs: specMap, tiers: tierMap, time: Date.now() }
  return _cache
}

export function invalidateCache() { _cache = null }

// ── SPEC GROUPS FOR A CATEGORY (excludes add-ons) ─────────────

export async function getSpecGroups(category: string): Promise<Record<string, SpecOption[]>> {
  const cache = await getCache()
  const specs = (cache.specs[category] || []).filter(s => !s.is_addon)
  const groups: Record<string, SpecOption[]> = {}
  for (const s of specs) {
    if (!groups[s.spec_group]) groups[s.spec_group] = []
    groups[s.spec_group].push(s)
  }
  return groups
}

// ── ADD-ON OPTIONS FOR A CATEGORY ─────────────────────────────
// Each add-on has its own selectable quantity, independent of the
// main product quantity (e.g. "Eyelets" — customer picks 2, 4, 6, 8...)

export async function getAddonOptions(category: string): Promise<SpecOption[]> {
  const cache = await getCache()
  return (cache.specs[category] || []).filter(s => s.is_addon)
}

export async function getQtyTiers(category: string): Promise<QtyTier[]> {
  const cache = await getCache()
  return cache.tiers[category] || []
}

// ── CORE CALCULATOR ───────────────────────────────────────────

export function calculate(params: {
  category: string
  priceModel: string           // 'area' | 'per_100' | 'per_piece' | 'per_page' | 'fixed' | 'unit'
  specs: SpecSelection          // user's selected spec options (single-select groups)
  addons?: AddonSelection[]     // add-ons with independent quantities
  qty: number
  widthFt?: number              // for area-based products
  heightFt?: number
  pages?: number                // for books/magazines
  tiers: QtyTier[]
  vatRate?: number
}): CalcResult {

  const { specs, qty, widthFt = 1, heightFt = 1, pages = 0, tiers, vatRate = 7.5, addons = [], priceModel } = params

  const area = widthFt * heightFt
  const minArea = 5  // minimum sqft for area-based products
  const effectiveArea = Math.max(area, minArea)

  let subtotal = 0

  const selectedOptions = Object.values(specs)

  const baseOption = selectedOptions.find(s => s.modifier_type === 'base_rate')
  const baseRate = baseOption ? Number(baseOption.price_modifier) : 0

  // ── Calculate by category price model ─────────────────────

  if (priceModel === 'area' && baseRate > 0) {
    subtotal += baseRate * effectiveArea * qty
  }

  if (priceModel === 'per_100' && baseRate > 0) {
    subtotal += baseRate * (qty / 100)
  }

  if (priceModel === 'fixed' && baseRate > 0) {
    subtotal += baseRate * qty
  }

  if (priceModel === 'per_piece' && baseRate > 0) {
    subtotal += baseRate * qty
  }

  // fixed_per_piece (blank item cost — apparel, souvenirs)
  const blankOptions = selectedOptions.filter(s => s.modifier_type === 'fixed_per_piece')
  for (const opt of blankOptions) subtotal += Number(opt.price_modifier) * qty

  // print_per_piece (branding cost)
  const printOptions = selectedOptions.filter(s => s.modifier_type === 'print_per_piece')
  for (const opt of printOptions) subtotal += Number(opt.price_modifier) * qty

  // fixed_per_100 (lamination, finishing)
  const per100Options = selectedOptions.filter(s => s.modifier_type === 'fixed_per_100')
  for (const opt of per100Options) subtotal += Number(opt.price_modifier) * (qty / 100)

  // per_sqft_extra (material upgrades on area products)
  const sqftExtraOptions = selectedOptions.filter(s => s.modifier_type === 'per_sqft_extra')
  for (const opt of sqftExtraOptions) subtotal += Number(opt.price_modifier) * effectiveArea * qty

  // per_page (books/magazines/journals)
  const perPageOptions = selectedOptions.filter(s => s.modifier_type === 'per_page')
  for (const opt of perPageOptions) subtotal += Number(opt.price_modifier) * pages * qty

  // fixed_per_unit (binding, cover, per finished item)
  const perUnitOptions = selectedOptions.filter(s => s.modifier_type === 'fixed_per_unit')
  for (const opt of perUnitOptions) subtotal += Number(opt.price_modifier) * qty

  // fixed_flat (one-time fees — non add-on)
  const flatOptions = selectedOptions.filter(s => s.modifier_type === 'fixed_flat' && Number(s.price_modifier) !== 0)
  for (const opt of flatOptions) subtotal += Number(opt.price_modifier)

  // percentage modifiers (applied to current subtotal)
  const pctOptions = selectedOptions.filter(s => s.modifier_type === 'percentage' && Number(s.price_modifier) !== 0)
  for (const opt of pctOptions) subtotal += subtotal * (Number(opt.price_modifier) / 100)

  // ADD-ONS — independent quantity, price × addon qty
  for (const a of addons) {
    if (a.qty > 0) subtotal += Number(a.option.price_modifier) * a.qty
  }

  // ── Quantity tier discount ────────────────────────────────
  const tier = tiers.find(t => qty >= t.min_qty && (t.max_qty === null || qty <= t.max_qty))
  const discountPct = tier?.discount_pct || 0
  const discountAmount = Math.round(subtotal * (discountPct / 100))
  subtotal = subtotal - discountAmount

  // ── VAT ───────────────────────────────────────────────────
  const vat = Math.round(subtotal * (vatRate / 100))
  const total = Math.round(subtotal + vat)

  // ── Summary text for order ────────────────────────────────
  const specLabels = selectedOptions
    .filter(s => s.modifier_type !== 'base_rate')
    .map(s => s.option_label)
  const addonLabels = addons.filter(a => a.qty > 0).map(a => `${a.option.option_label} ×${a.qty}`)
  const allLabels = [...specLabels, ...addonLabels].join(', ')
  const summaryText = `${qty} ${params.category}${allLabels ? ` — ${allLabels}` : ''}`

  return {
    total,
    minPrice: total,
    discountPct,
    discountAmount,
    tierLabel: tier?.label || null,
    summaryText,
  }
}

// ── DEFAULT SELECTION ─────────────────────────────────────────

export function getDefaultSelection(groups: Record<string, SpecOption[]>): SpecSelection {
  const selection: SpecSelection = {}
  for (const [group, options] of Object.entries(groups)) {
    if (options.length === 0) continue
    const defaultOpt = options.find((o: any) => o.is_default) || options[0]
    selection[group] = defaultOpt
  }
  return selection
}

// ── SPEC SUMMARY FOR ORDER ────────────────────────────────────

export function buildSpecSummary(
  specs: SpecSelection,
  qty: number,
  widthFt?: number,
  heightFt?: number,
  pages?: number,
  addons?: AddonSelection[]
): Record<string, string> {
  const summary: Record<string, string> = { Quantity: String(qty) }
  if (widthFt && heightFt) summary['Dimensions'] = `${widthFt}ft × ${heightFt}ft`
  if (pages) summary['Pages'] = String(pages)
  for (const [group, option] of Object.entries(specs)) {
    const label = group.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    summary[label] = option.option_label
  }
  for (const a of addons || []) {
    if (a.qty > 0) {
      const label = a.option.spec_group.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      summary[label] = `${a.option.option_label} ×${a.qty}`
    }
  }
  return summary
}