// src/app/sitemap.ts
// Generated from the database at request time (cached for an hour) and served
// at /sitemap.xml. Every query mirrors the visibility rule of the page it
// links to, so the sitemap only lists URLs that return 200.
// Google Search Console: submit https://printhub.cchumedia.com/sitemap.xml

import { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'
import { SITE_URL } from '@/lib/site-url'
import { bookSitemapPaths, loadPublishedBooks } from '@/lib/books/catalogue'
import { CASE_STUDIES } from '@/lib/case-studies'
import { caseSitemapPaths } from '@/lib/case-studies-seo'

export const revalidate = 3600

// Static pages that exist as routes. No lastmod: they have no database record.
const STATIC_PATHS = [
  '', '/shop', '/about', '/contact', '/how-it-works', '/starter-kits',
  '/book-publishing', '/price-list', '/election-campaign', '/affiliate', '/privacy', '/terms',
]

type Row = { slug: string | null; updated_at?: string | null; created_at?: string | null }

function entry(path: string, lastmod?: string | null): MetadataRoute.Sitemap[number] {
  const d = lastmod ? new Date(lastmod) : null
  return {
    url: `${SITE_URL}${path}`,
    ...(d && !isNaN(d.getTime()) ? { lastModified: d } : {}),
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries = STATIC_PATHS.map(p => entry(p))
  // Case studies: only when a case is published AND consent has been given (see lib/case-studies.ts)
  const caseEntries = caseSitemapPaths(CASE_STUDIES).map(p => entry(p))

  // C-Chu Books: published books and their (published) authors only; /books is listed once a book exists
  const books = await loadPublishedBooks().catch(() => [])
  const bookEntries = books.length ? [entry('/books'), ...bookSitemapPaths(books).map(b => entry(b.path, b.lastmod))] : []

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return [...staticEntries, ...bookEntries, ...caseEntries]

  const db = createClient(url, key, { auth: { persistSession: false } })
  const safe = async <T,>(q: PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> => {
    try {
      const { data, error } = await q
      return error ? [] : data || []
    } catch {
      return []
    }
  }

  const [products, categories, industries, campaigns] = await Promise.all([
    safe<Row & { product_type: string | null }>(
      db.from('products').select('slug, updated_at, product_type').eq('is_active', true).not('slug', 'is', null)),
    // categories has no updated_at column, so created_at is the best available date
    safe<Row>(db.from('categories').select('slug, created_at').eq('is_active', true).not('slug', 'is', null)),
    safe<Row>(db.from('industries').select('slug, updated_at').eq('is_active', true).not('slug', 'is', null)),
    safe<Row>(db.from('campaigns').select('slug, updated_at, created_at').eq('is_active', true).not('slug', 'is', null)),
  ])

  // Only list categories that actually have active products (empty ones are thin pages).
  const liveTypes = new Set(products.map(p => p.product_type).filter(Boolean))

  return [
    ...staticEntries,
    ...products.map(p => entry(`/products/${p.slug}`, p.updated_at)),
    ...categories.filter(c => liveTypes.has(c.slug)).map(c => entry(`/categories/${c.slug}`, c.created_at)),
    ...industries.map(i => entry(`/industries/${i.slug}`, i.updated_at)),
    ...campaigns.map(c => entry(`/campaigns/${c.slug}`, c.updated_at || c.created_at)),
    ...bookEntries,
    ...caseEntries,
  ]
}
