// Rules for badges and homepage product sections. Change a number here and
// every card and section follows.

/** A product may only be called a "Best Seller" once it has sold this many. */
export const BESTSELLER_MIN_SOLD = 10

/** A product counts as "NEW" for this many days after it was created. */
export const NEW_PRODUCT_DAYS = 30

/** The Bestsellers section hides itself unless at least this many products qualify. */
export const MIN_BESTSELLERS_TO_SHOW = 4

type BadgeSource = { badge?: string | null; total_orders?: number | null; created_at?: string | null }

export function isNewProduct(p: BadgeSource, now: number = Date.now()): boolean {
  if (!p.created_at) return false
  const created = new Date(p.created_at).getTime()
  return !isNaN(created) && now - created <= NEW_PRODUCT_DAYS * 86_400_000
}

export function isBestseller(p: BadgeSource): boolean {
  return (Number(p.total_orders) || 0) >= BESTSELLER_MIN_SOLD
}

/**
 * The badge text a card is allowed to show. Admin-entered badges are kept, except
 * "Best Seller" and "New", which must be backed by real sales / creation date.
 */
export function visibleBadge(p: BadgeSource): string | null {
  const badge = p.badge?.trim()
  if (!badge) return null
  const key = badge.toLowerCase().replace(/[\s_-]+/g, ' ')
  if (key === 'best seller' || key === 'bestseller') return isBestseller(p) ? badge : null
  if (key === 'new') return isNewProduct(p) ? badge : null
  return badge
}
