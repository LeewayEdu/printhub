// Real review figures for product cards. A product only has a rating when it has approved
// rows in product_reviews; the editable products.rating / review_count columns are ignored
// (one product had rating 4.5 with 0 reviews). Same source as the product page.

type DbLike = { from: (table: string) => any }

export async function withApprovedReviews<T extends { id: string }>(db: DbLike, products: T[]): Promise<(T & { rating: number; review_count: number })[]> {
  const stats: Record<string, { sum: number; n: number }> = {}
  try {
    const { data } = await db.from('product_reviews').select('product_id, rating').eq('is_approved', true)
    for (const r of (data || []) as { product_id: string; rating: number }[]) {
      const n = Number(r.rating)
      if (n >= 1 && n <= 5) {
        const s = (stats[r.product_id] ||= { sum: 0, n: 0 })
        s.sum += n; s.n += 1
      }
    }
  } catch { /* no reviews readable: show none */ }
  return products.map(p => {
    const s = stats[p.id]
    return { ...p, rating: s ? Math.round((s.sum / s.n) * 10) / 10 : 0, review_count: s ? s.n : 0 }
  })
}
