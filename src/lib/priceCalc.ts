// VAT rate (%) applied by calculate(); prices shown on the site are VAT inclusive.
export const VAT_RATE = 7.5

// Pure price calculation: no imports, no data fetching, so the browser and the server
// run exactly the same code. Data loading lives in priceEngineV2.ts (browser) and
// pricing-server.ts (server).

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
  note?: string | null   // short guidance shown under the selected option, e.g. "Best for 20+ pcs"
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
  minimumApplied: boolean
}

// ── CORE CALCULATOR ───────────────────────────────────────────

export function calculate(params: {
  category: string
  priceModel: string
  specs: SpecSelection
  addons?: AddonSelection[]
  qty: number
  widthFt?: number
  heightFt?: number
  minWidth?: number    // product-specific minimum width (ft or in)
  minHeight?: number   // product-specific minimum height (ft or in)
  pages?: number
  tiers: QtyTier[]
  vatRate?: number
  minOrderAmount?: number  // floor for the final charged price (null/0 = no floor)
}): CalcResult {

  const {
    specs, qty, widthFt = 1, heightFt = 1, pages = 0,
    tiers, vatRate = VAT_RATE, addons = [], priceModel,
    minWidth = 0, minHeight = 0, minOrderAmount = 0,
  } = params

  // Clamp dimensions to product minimums before calculating
  const effectiveWidth = Math.max(widthFt, minWidth)
  const effectiveHeight = Math.max(heightFt, minHeight)
  const area = effectiveWidth * effectiveHeight

  // Large format (sqft): also enforce a 5 sqft floor so tiny typos
  // don't produce unrealistically cheap banner quotes.
  // Stickers/labels (sqin): only enforce the product minimum — a
  // 2×2 inch sticker is genuinely that small.
  const effectiveArea = priceModel === 'area_sqin'
    ? Math.max(area, 1)
    : Math.max(area, minWidth * minHeight || 5)

  let subtotal = 0

  const selectedOptions = Object.values(specs)

  const baseOption = selectedOptions.find(s => s.modifier_type === 'base_rate')
  const baseRate = baseOption ? Number(baseOption.price_modifier) : 0

  // ── Calculate by category price model ─────────────────────

  // Area-based sqft (₦/sqft) — banners, signage, large format
  if (priceModel === 'area' && baseRate > 0) {
    subtotal += baseRate * effectiveArea * qty
  }

  // Area-based sq.in (₦/sq.in) — labels, stickers
  // widthFt/heightFt hold INCH values when priceModel === 'area_sqin'
  if (priceModel === 'area_sqin' && baseRate > 0) {
    subtotal += baseRate * effectiveArea * qty
  }

  // Per 100 units — cards, flyers, sheet printing
  if (priceModel === 'per_100' && baseRate > 0) {
    subtotal += baseRate * (qty / 100)
  }

  // Fixed — services (design, etc.)
  if (priceModel === 'fixed' && baseRate > 0) {
    subtotal += baseRate * qty
  }

  // Per piece — apparel, souvenirs, promo merch
  if (priceModel === 'per_piece' && baseRate > 0) {
    subtotal += baseRate * qty
  }

  // fixed_per_piece (blank item cost — apparel, souvenirs)
  const blankOptions = selectedOptions.filter(s => s.modifier_type === 'fixed_per_piece')
  for (const opt of blankOptions) subtotal += Number(opt.price_modifier) * qty

  // print_per_piece (branding cost)
  const printOptions = selectedOptions.filter(s => s.modifier_type === 'print_per_piece')
  for (const opt of printOptions) subtotal += Number(opt.price_modifier) * qty

  // fixed_per_100 (lamination, finishing — flat amount per 100)
  const per100Options = selectedOptions.filter(s => s.modifier_type === 'fixed_per_100')
  for (const opt of per100Options) subtotal += Number(opt.price_modifier) * (qty / 100)

  // per_sqft_extra (material upgrades on large format products — ₦/sqft)
  const sqftExtraOptions = selectedOptions.filter(s => s.modifier_type === 'per_sqft_extra')
  for (const opt of sqftExtraOptions) subtotal += Number(opt.price_modifier) * effectiveArea * qty

  // per_sqin_extra (material/finish upgrades on sticker/label products — ₦/sq.in)
  // Use this modifier_type for stickers_labels material upgrades instead of per_sqft_extra
  const sqinExtraOptions = selectedOptions.filter(s => s.modifier_type === 'per_sqin_extra')
  for (const opt of sqinExtraOptions) subtotal += Number(opt.price_modifier) * effectiveArea * qty

  // per_page (books/magazines/journals — ₦ per page per copy)
  const perPageOptions = selectedOptions.filter(s => s.modifier_type === 'per_page')
  for (const opt of perPageOptions) subtotal += Number(opt.price_modifier) * pages * qty

  // fixed_per_unit (binding, cover — ₦ per finished copy regardless of pages)
  const perUnitOptions = selectedOptions.filter(s => s.modifier_type === 'fixed_per_unit')
  for (const opt of perUnitOptions) subtotal += Number(opt.price_modifier) * qty

  // fixed_flat (one-time fee per order — e.g. design setup, pole pockets)
  const flatOptions = selectedOptions.filter(s => s.modifier_type === 'fixed_flat' && Number(s.price_modifier) !== 0)
  for (const opt of flatOptions) subtotal += Number(opt.price_modifier)

  // percentage modifiers — applied LAST to the running subtotal, compounding in sort_order
  // This is what makes lamination/finish scale correctly with paper size:
  // e.g. A5 base is already cheaper than A4, so 25% lamination is automatically cheaper too
  const pctOptions = selectedOptions.filter(s => s.modifier_type === 'percentage' && Number(s.price_modifier) !== 0)
  for (const opt of pctOptions) subtotal += subtotal * (Number(opt.price_modifier) / 100)

  // ADD-ONS — per-piece: addon.qty is the count per piece (e.g. 4 eyelets per banner),
  // so total addon cost = addon_qty × unit_price × order_qty.
  // Previously this was not multiplied by qty, meaning 2 banners cost the same addon
  // as 1 — fixed here.
  for (const a of addons) {
    if (a.qty > 0) subtotal += Number(a.option.price_modifier) * a.qty * qty
  }

  // ── Quantity tier discount ────────────────────────────────
  const tier = tiers.find(t => qty >= t.min_qty && (t.max_qty === null || qty <= t.max_qty))
  const discountPct = tier?.discount_pct || 0
  const discountAmount = Math.round(subtotal * (discountPct / 100))
  subtotal = subtotal - discountAmount

  // ── VAT ───────────────────────────────────────────────────
  const vat = Math.round(subtotal * (vatRate / 100))
  const rawTotal = Math.round(subtotal + vat)

  // ── Minimum order amount floor ────────────────────────────
  const minimumApplied = minOrderAmount > 0 && rawTotal < minOrderAmount
  const total = minimumApplied ? minOrderAmount : rawTotal

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
    minimumApplied,
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

// ── PAGE STEPPER CONFIG ───────────────────────────────────────
// Minimum pages / leaves for per-page products (also used for the "from" price).
export const PAGE_STEPPER_CONFIG: Record<string, { step: number; min: number; max?: number; default: number; label: string }> = {
  'jotter-printing': { step: 50, min: 50, max: 200, default: 50, label: 'leaves' },
}
export const DEFAULT_PAGE_STEPPER = { step: 4, min: 8, max: undefined as number | undefined, default: 100, label: 'pages' }


// ── "FROM" PRICE ──────────────────────────────────────────────
// The single definition of a "From ₦X" price: the total (VAT inclusive) of the cheapest
// valid configuration at the product's minimum quantity and minimum size. It runs the
// same calculate() the product page uses, over every combination of one option per
// group (add-ons are optional and left at zero; "own design file" means no design fee).

export interface FromPriceInput {
  category: string
  priceModel: string
  groups: Record<string, SpecOption[]>
  tiers: QtyTier[]
  moq?: number | null
  minWidth?: number | null
  minHeight?: number | null
  minOrderAmount?: number | null
}

function baseParams(i: FromPriceInput, qty: number) {
  const pages = (PAGE_STEPPER_CONFIG[i.category] || DEFAULT_PAGE_STEPPER).min
  const minWidth = Number(i.minWidth) || 0.1
  const minHeight = Number(i.minHeight) || 0.1
  return {
    category: i.category, priceModel: i.priceModel, qty,
    widthFt: Math.max(minWidth, 1), heightFt: Math.max(minHeight, 1), minWidth, minHeight, pages,
    tiers: i.tiers, minOrderAmount: Number(i.minOrderAmount) || 0,
  }
}

/** Price of the default selection at minimum quantity: what the product page shows first. */
export function defaultConfigurationTotal(i: FromPriceInput): number {
  const qty = Math.max(Number(i.moq) || 1, 1)
  return calculate({ ...baseParams(i, qty), specs: getDefaultSelection(i.groups) }).total
}

/** Cheapest valid configuration at minimum quantity. Returns 0 if the category has no priced options. */
export function lowestConfigurationTotal(i: FromPriceInput): number {
  const qty = Math.max(Number(i.moq) || 1, 1)
  const entries = Object.entries(i.groups).filter(([, opts]) => opts.length > 0)
  if (entries.length === 0) return 0
  const params = baseParams(i, qty)
  const combos = entries.reduce((n, [, o]) => n * o.length, 1)
  let best = Infinity
  const consider = (sel: SpecSelection) => {
    // A configuration is only valid with ONE base rate. Two (an option in another group wrongly
    // typed 'base_rate') makes calculate() pick whichever comes first and return nonsense.
    if (Object.values(sel).filter(o => o.modifier_type === 'base_rate').length > 1) return
    const t = calculate({ ...params, specs: sel }).total
    if (t > 0 && t < best) best = t
  }
  if (combos <= 20000) {
    const walk = (idx: number, sel: SpecSelection) => {
      if (idx === entries.length) { consider(sel); return }
      const [g, opts] = entries[idx]
      for (const o of opts) walk(idx + 1, { ...sel, [g]: o })
    }
    walk(0, {})
  } else {
    // very large option sets: improve one group at a time starting from the defaults
    let sel = getDefaultSelection(i.groups)
    for (const [g, opts] of entries) {
      let bestOpt = sel[g]; let bestT = Infinity
      for (const o of opts) { const t = calculate({ ...params, specs: { ...sel, [g]: o } }).total; if (t > 0 && t < bestT) { bestT = t; bestOpt = o } }
      sel = { ...sel, [g]: bestOpt }
    }
    consider(sel)
  }
  return Number.isFinite(best) ? best : 0
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
      // Several add-ons can share one group: keep them all in one readable entry so the server
      // can rebuild the exact price ("Eyelets ×4; Pole pockets ×2"), instead of overwriting.
      const entry = `${a.option.option_label} ×${a.qty}`
      summary[label] = summary[label] ? `${summary[label]}; ${entry}` : entry
    }
  }
  return summary
}

// ── FIXED-PRICE PRODUCTS ──────────────────────────────────────
// A product flagged is_fixed_price has ONE stored price per piece. It is never priced from option
// rates (those belong to the category's other, calculator-priced products).
// ASSUMPTION: the stored price is per piece and final (the same figure shop cards show).
export function fixedUnitPrice(p: { display_price?: number | null; price?: number | null }): number {
  return Number(p.display_price || p.price) || 0
}
export function fixedPriceTotal(p: { display_price?: number | null; price?: number | null }, qty: number): number {
  return Math.round(fixedUnitPrice(p) * Math.max(Number(qty) || 1, 1))
}

// ── SERVER RECOMPUTE OF A CART LINE ───────────────────────────
// A cart line only stores the human-readable summary of the options (buildSpecSummary). This
// turns that summary back into a selection and runs the same calculate() the browser ran, so the
// server can check the price the browser claims. Returns an error string when the summary does not
// match the catalogue (unknown option, bad quantity).

const groupLabel = (g: string) => g.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

export interface RecomputeInput {
  category: string
  priceModel: string
  groups: Record<string, SpecOption[]>   // non add-on options by spec group
  addons: SpecOption[]
  tiers: QtyTier[]
  minWidth?: number | null
  minHeight?: number | null
  minOrderAmount?: number | null
  specs: Record<string, string>
}

export function recomputePrintTotal(i: RecomputeInput): { total: number; qty: number } | { error: string } {
  const qty = Number(String(i.specs.Quantity ?? '').replace(/[^\d.]/g, ''))
  if (!(qty > 0) || qty > 1_000_000) return { error: 'invalid quantity' }

  const selection: SpecSelection = {}
  for (const [g, opts] of Object.entries(i.groups)) {
    const label = groupLabel(g)
    const want = i.specs[label]
    if (want === undefined) { const d = getDefaultSelection({ [g]: opts })[g]; if (d) selection[g] = d; continue }
    const opt = opts.find(o => o.option_label === want) || opts.find(o => o.option_label.trim() === String(want).trim())
    if (!opt) return { error: `unknown option "${want}" for ${label}` }
    selection[g] = opt
  }

  const addons: AddonSelection[] = []
  for (const a of i.addons) {
    const raw = i.specs[groupLabel(a.spec_group)]
    for (const part of raw ? raw.split('; ') : []) {
      const m = part.match(/^(.*) ×(\d+)$/)
      if (m && (m[1] === a.option_label || m[1].trim() === a.option_label.trim())) addons.push({ option: a, qty: Number(m[2]) })
    }
  }

  const dims = String(i.specs.Dimensions ?? '').match(/([\d.]+)\s*ft\s*×\s*([\d.]+)\s*ft/)
  const pages = Number(i.specs.Pages) || 0
  const minWidth = Number(i.minWidth) || 0.1
  const minHeight = Number(i.minHeight) || 0.1
  const r = calculate({
    category: i.category, priceModel: i.priceModel, specs: selection, addons, qty,
    widthFt: dims ? Number(dims[1]) : 1, heightFt: dims ? Number(dims[2]) : 1, minWidth, minHeight, pages,
    tiers: i.tiers, minOrderAmount: Number(i.minOrderAmount) || 0,
  })
  return { total: r.total, qty }
}
