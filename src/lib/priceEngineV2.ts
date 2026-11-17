import { supabase } from '@/lib/supabase/client'

import { calculate, getDefaultSelection, buildSpecSummary } from './priceCalc'
import type { SpecOption, QtyTier, SpecSelection, AddonSelection, CalcResult } from './priceCalc'
export { calculate, getDefaultSelection, buildSpecSummary }
export type { SpecOption, QtyTier, SpecSelection, AddonSelection, CalcResult }

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
