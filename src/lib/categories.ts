import { supabase } from '@/lib/supabase/client'
import { CATEGORIES as STATIC_CATEGORIES } from '@/lib/constants'

export interface CategoryRow {
  id: string
  label: string
  icon: string
  price_model: string  // area | per_100 | per_piece | per_page | fixed | unit
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
  let query = supabase.from('categories').select('*').order('sort_order')
  const { data } = await query
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

export async function getCategoryPriceModel(label: string): Promise<string> {
  const cats = await getCategories(true)
  return cats.find(c => c.label === label)?.price_model || 'unit'
}