import { supabase } from '@/lib/supabase/client'
import { CATEGORIES as STATIC_CATEGORIES } from '@/lib/constants'

export interface CategoryRow {
  id: string
  label: string
  slug?: string        // added — stable key used by product_type and spec_options.category
  icon: string
  price_model: string  // area | area_sqin | per_100 | per_piece | per_page | fixed | unit
  sort_order: number
  is_active: boolean
}

let _cache: CategoryRow[] | null = null
let _time = 0
const TTL = 5 * 60 * 1000

// Fallback if the categories table is empty or unreachable
function staticFallback(): CategoryRow[] {
  return STATIC_CATEGORIES.map((c, i) => ({
    id: c.id, label: c.label, icon: c.icon, price_model: 'unit', sort_order: i, is_active: true,
  }))
}

export async function getCategories(includeInactive = false): Promise<CategoryRow[]> {
  if (_cache && Date.now() - _time < TTL) {
    return includeInactive ? _cache : _cache.filter(c => c.is_active)
  }
  const { data } = await supabase.from('categories').select('*').order('sort_order')
  if (data && data.length) {
    _cache = data as CategoryRow[]
    _time = Date.now()
    return includeInactive ? _cache : _cache.filter(c => c.is_active)
  }
  return staticFallback()
}

export function invalidateCategoriesCache() { _cache = null }

export async function getCategoryLabels(): Promise<string[]> {
  return (await getCategories()).map(c => c.label)
}

// ── getCategoryPriceModel ──────────────────────────────────────
// The calculator passes product_type (a slug e.g. 'sheet_printing') as the
// category key. Older products without product_type fall back to passing the
// category label (e.g. 'Sheet Printing'). We need to handle both.
//
// Lookup order:
//   1. Match by slug  — new pricing categories (product_type = slug)
//   2. Match by label — legacy products / old categories without a slug
//   3. Fallback: 'unit' (no special calculation)
export async function getCategoryPriceModel(categoryKey: string): Promise<string> {
  const cats = await getCategories(true)
  const match =
    cats.find(c => c.slug === categoryKey) ||      // slug match first (new system)
    cats.find(c => c.label === categoryKey)         // label match fallback (legacy)
  return match?.price_model || 'unit'
}