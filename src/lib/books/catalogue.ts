// Read-only catalogue queries for the public storefront. Server only. It reads with explicit PUBLIC
// column lists, so file paths and print cost can never end up in a page or an API response.
// If the books tables do not exist yet (migration not run) every function returns empty, so the rest
// of the site is unaffected.

import { createClient } from '@supabase/supabase-js'
import { PUBLIC_AUTHOR_SELECT, PUBLIC_BOOK_SELECT, PUBLIC_FORMAT_SELECT, type AuthorPublic, type BookPublic, type BookFormatPublic } from './types'
import { FIXTURE_AUTHORS, FIXTURE_BOOKS } from './fixtures'

/** Local fixtures are for development only and are ignored on the production deployment. */
export const useFixtures = () => process.env.BOOKS_USE_FIXTURES === 'true' && process.env.VERCEL_ENV !== 'production'

function client() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

export async function loadPublishedBooks(): Promise<BookPublic[]> {
  if (useFixtures()) return FIXTURE_BOOKS
  const db = client()
  if (!db) return []
  try {
    const { data: books, error } = await db.from('books').select(PUBLIC_BOOK_SELECT).eq('status', 'published').order('published_date', { ascending: false })
    if (error || !books?.length) return []
    const ids = books.map((b: any) => b.id)
    const authorIds = Array.from(new Set(books.map((b: any) => b.author_id)))
    const [{ data: formats }, { data: authors }] = await Promise.all([
      db.from('book_formats').select(PUBLIC_FORMAT_SELECT).in('book_id', ids).eq('active', true),
      db.from('authors').select(PUBLIC_AUTHOR_SELECT).in('id', authorIds).eq('status', 'published'),
    ])
    const authorById = new Map<string, AuthorPublic>((authors || []).map((a: any) => [a.id, a]))
    return (books as any[])
      .filter(b => authorById.has(b.author_id))                       // a book whose author is unpublished stays hidden
      .map(b => ({ ...b, categories: b.categories || [], author: authorById.get(b.author_id) || null,
        formats: ((formats || []) as BookFormatPublic[]).filter(f => f.book_id === b.id).map(f => ({ ...f, price_ngn: Number(f.price_ngn), price_usd: f.price_usd == null ? null : Number(f.price_usd) })) }))
      .filter(b => b.formats.length > 0)
  } catch { return [] }
}

export async function loadBook(slug: string): Promise<BookPublic | null> {
  return (await loadPublishedBooks()).find(b => b.slug === slug) || null
}

export async function loadAuthor(slug: string): Promise<{ author: AuthorPublic; books: BookPublic[] } | null> {
  if (useFixtures()) {
    const a = FIXTURE_AUTHORS.find(x => x.slug === slug)
    return a ? { author: a, books: FIXTURE_BOOKS.filter(b => b.author_id === a.id) } : null
  }
  const db = client()
  if (!db) return null
  try {
    const { data: a } = await db.from('authors').select(PUBLIC_AUTHOR_SELECT).eq('slug', slug).eq('status', 'published').maybeSingle()
    if (!a) return null
    const books = (await loadPublishedBooks()).filter(b => b.author_id === (a as any).id)
    return { author: a as AuthorPublic, books }
  } catch { return null }
}

// ── pure query helpers (tested) ───────────────────────────────────────────────
export type BookSort = 'newest' | 'title' | 'price-asc' | 'price-desc'
export const PAGE_SIZE = 12

export function lowestPrice(b: BookPublic): number {
  return Math.min(...b.formats.map(f => f.price_ngn))
}

export function queryBooks(all: BookPublic[], opts: { q?: string; category?: string; sort?: BookSort; page?: number; pageSize?: number }) {
  const q = (opts.q || '').trim().toLowerCase()
  let list = all.filter(b => b.status === 'published')
  if (q) list = list.filter(b => [b.title, b.subtitle, b.author?.name, b.description, b.isbn, ...(b.categories || [])].some(v => v && String(v).toLowerCase().includes(q)))
  if (opts.category) list = list.filter(b => b.categories.some(c => c.toLowerCase() === opts.category!.toLowerCase()))
  const sort = opts.sort || 'newest'
  list = [...list].sort((a, b) =>
    sort === 'title' ? a.title.localeCompare(b.title)
      : sort === 'price-asc' ? lowestPrice(a) - lowestPrice(b)
        : sort === 'price-desc' ? lowestPrice(b) - lowestPrice(a)
          : String(b.published_date || '').localeCompare(String(a.published_date || '')))
  const pageSize = opts.pageSize || PAGE_SIZE
  const total = list.length
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const page = Math.min(Math.max(1, Math.floor(opts.page || 1)), pages)
  return { items: list.slice((page - 1) * pageSize, page * pageSize), total, page, pages }
}

export const allCategories = (all: BookPublic[]) => Array.from(new Set(all.flatMap(b => b.categories))).sort()

/** Sitemap rows: published books by published authors only (the loaders above already guarantee that) */
export function bookSitemapPaths(books: BookPublic[]): { path: string; lastmod: string | null }[] {
  const authors = new Map<string, string>()
  books.forEach(b => { if (b.author && b.status === 'published') authors.set(b.author.slug, b.published_date || '') })
  return [
    ...books.filter(b => b.status === 'published').map(b => ({ path: `/books/${b.slug}`, lastmod: b.published_date || null })),
    ...Array.from(authors.entries()).map(([slug, d]) => ({ path: `/authors/${slug}`, lastmod: d || null })),
  ]
}
