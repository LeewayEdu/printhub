import { supabase } from '@/lib/supabase/client'

export interface PriceSettings {
  [category: string]: { [key: string]: number }
}

export interface PriceBreakdown {
  lines: { label: string; amount: number }[]
  subtotal: number
  vat: number
  total: number
  perUnit: number
}

// Cache rates in memory for session (avoid repeated fetches)
let _cache: PriceSettings | null = null
let _cacheTime = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export async function getRates(): Promise<PriceSettings> {
  if (_cache && Date.now() - _cacheTime < CACHE_TTL) return _cache
  const { data } = await supabase.from('price_settings').select('category, key, value')
  if (!data) return {}
  const settings: PriceSettings = {}
  for (const row of data) {
    if (!settings[row.category]) settings[row.category] = {}
    settings[row.category][row.key] = Number(row.value)
  }
  _cache = settings
  _cacheTime = Date.now()
  return settings
}

export function invalidateCache() {
  _cache = null
}

// ── CALCULATORS ───────────────────────────────────────────────

export function calcFlex(rates: PriceSettings, params: {
  widthFt: number
  heightFt: number
  quantity: number
  material: 'flex_440gsm' | 'flex_backlit' | 'flex_canvas'
  eyelets?: boolean
  rope?: boolean
}): PriceBreakdown {
  const r = rates.flex || {}
  const minSqft = r.min_sqft || 5
  const area = Math.max(params.widthFt * params.heightFt, minSqft)
  const totalArea = area * params.quantity

  const baseRate = r.rate_per_sqft || 500
  const matExtra = r[`material_${params.material.replace('flex_', '')}`] || 0
  const printCost = (baseRate + matExtra) * totalArea

  const lines: { label: string; amount: number }[] = [
    { label: `Print (${totalArea.toFixed(1)} sqft × ₦${(baseRate + matExtra).toLocaleString()})`, amount: printCost }
  ]

  if (params.eyelets) {
    const ec = (r.eyelets_per_unit || 500) * params.quantity
    lines.push({ label: `Eyelets (${params.quantity} pcs)`, amount: ec })
  }
  if (params.rope) {
    const rc = (r.rope_per_unit || 300) * params.quantity
    lines.push({ label: `Rope (${params.quantity} pcs)`, amount: rc })
  }

  return buildBreakdown(lines, params.quantity, rates.general?.vat_rate ?? 7.5)
}

export function calcBusinessCard(rates: PriceSettings, params: {
  quantity: number
  paperWeight: '300gsm' | '350gsm' | '400gsm'
  lamination: 'none' | 'gloss' | 'matt' | 'spot_uv' | 'aqueous'
}): PriceBreakdown {
  const r = rates.businesscard || {}
  const per100 = r.rate_per_100 || 4500
  const hundreds = params.quantity / 100

  const baseCost = per100 * hundreds
  const lines: { label: string; amount: number }[] = [
    { label: `${params.quantity} cards (${hundreds} × ₦${per100.toLocaleString()})`, amount: baseCost }
  ]

  const paperExtra = r[`paper_${params.paperWeight.replace('gsm', '')}gsm`] || 0
  if (paperExtra > 0) lines.push({ label: `${params.paperWeight} paper upgrade`, amount: paperExtra * hundreds })

  const lamCost = r[`lamination_${params.lamination}`] || 0
  if (lamCost > 0) lines.push({ label: `${params.lamination.replace('_', ' ')} lamination`, amount: lamCost * hundreds })

  return buildBreakdown(lines, params.quantity, rates.general?.vat_rate ?? 7.5)
}

export function calcFlyer(rates: PriceSettings, params: {
  size: 'A4' | 'A5' | 'A6'
  quantity: number
  sides: 'single' | 'double'
  printType: 'DI' | 'offset'
  paperType: 'bond' | 'art'
  lamination: 'none' | 'gloss' | 'matt'
}): PriceBreakdown {
  const r = rates.flyer || {}
  const hundreds = params.quantity / 100
  const sizeKey = params.size.toLowerCase()
  const typeKey = params.printType.toLowerCase()
  const rateKey = `${typeKey}_${sizeKey}_per_100`
  let baseRate = r[rateKey] || 1500
  const baseCost = baseRate * hundreds
  const lines: { label: string; amount: number }[] = [
    { label: `${params.printType} ${params.size} (${params.quantity} pcs)`, amount: baseCost }
  ]

  if (params.sides === 'double') {
    const extra = baseCost * ((r.double_sided_extra || 40) / 100)
    lines.push({ label: 'Double sided', amount: extra })
  }
  if (params.paperType === 'art') {
    const extra = baseCost * ((r.art_paper_extra || 20) / 100)
    lines.push({ label: 'Art paper', amount: extra })
  }
  const lamCost = r[`lamination_${params.lamination}`] || 0
  if (lamCost > 0) lines.push({ label: `${params.lamination} lamination`, amount: lamCost * hundreds })

  return buildBreakdown(lines, params.quantity, rates.general?.vat_rate ?? 7.5)
}

export function calcSticker(rates: PriceSettings, params: {
  widthFt: number
  heightFt: number
  quantity: number
  material: 'vinyl' | 'clear' | 'paper'
}): PriceBreakdown {
  const r = rates.sticker || {}
  const minSqft = r.min_sqft || 5
  const area = Math.max(params.widthFt * params.heightFt, minSqft)
  const totalArea = area * params.quantity
  const baseRate = params.material === 'paper' ? (r.paper_rate || 400) : (r.rate_per_sqft || 800)
  const matExtra = params.material === 'clear' ? (r.clear_extra || 200) : 0
  const printCost = (baseRate + matExtra) * totalArea
  const lines = [{ label: `${params.material} sticker (${totalArea.toFixed(1)} sqft)`, amount: printCost }]
  return buildBreakdown(lines, params.quantity, rates.general?.vat_rate ?? 7.5)
}

export function calcApparel(rates: PriceSettings, params: {
  item: 'tshirt' | 'polo' | 'hoodie' | 'cap'
  printMethod: 'dtf' | 'embroidery'
  quantity: number
}): PriceBreakdown {
  const r = rates.apparel || {}
  const blankCost = r[`${params.item}_blank`] || 1500
  const printCost = r[`${params.printMethod}_per_piece`] || 2500
  const totalPerPiece = blankCost + printCost
  const lines = [
    { label: `${params.item} blank × ${params.quantity}`, amount: blankCost * params.quantity },
    { label: `${params.printMethod.toUpperCase()} print × ${params.quantity}`, amount: printCost * params.quantity },
  ]
  return buildBreakdown(lines, params.quantity, rates.general?.vat_rate ?? 7.5)
}

// ── HELPERS ───────────────────────────────────────────────────

function buildBreakdown(
  lines: { label: string; amount: number }[],
  quantity: number,
  vatRate: number
): PriceBreakdown {
  const subtotal = lines.reduce((s, l) => s + l.amount, 0)
  const vat = Math.round(subtotal * (vatRate / 100))
  const total = subtotal + vat
  return {
    lines,
    subtotal: Math.round(subtotal),
    vat,
    total,
    perUnit: quantity > 0 ? Math.round(total / quantity) : 0,
  }
}

// ── MAP PRODUCT CATEGORY TO CALCULATOR ───────────────────────
export function getCategoryEngine(category: string): string | null {
  const map: Record<string, string> = {
    'Banners & Large Format': 'flex',
    'Stickers & Labels': 'sticker',
    'Business Cards': 'businesscard',
    'Flyers & Leaflets': 'flyer',
    'Branded Apparel': 'apparel',
    'Shirts & Uniforms': 'apparel',
  }
  return map[category] || null
}