import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { pageMetadata } from '@/components/seo'
import BookCard from '@/components/books/BookCard'
import { allCategories, loadPublishedBooks, queryBooks, type BookSort } from '@/lib/books/catalogue'

export const dynamic = 'force-dynamic'

export const metadata = pageMetadata({
  title: 'C-Chu Books: Nigerian books in print and ebook',
  description: 'Buy books published by C-Chu Media as ebooks, print copies or bundles. Instant ebook download and delivery across Nigeria.',
  path: '/books',
})

const SORTS: { value: BookSort; label: string }[] = [
  { value: 'newest', label: 'Newest' }, { value: 'title', label: 'Title A to Z' },
  { value: 'price-asc', label: 'Price: low to high' }, { value: 'price-desc', label: 'Price: high to low' },
]

export default async function BooksIndex({ searchParams }: { searchParams: { q?: string; category?: string; sort?: string; page?: string } }) {
  const all = await loadPublishedBooks()
  const sort = (SORTS.some(s => s.value === searchParams.sort) ? searchParams.sort : 'newest') as BookSort
  const { items, total, page, pages } = queryBooks(all, { q: searchParams.q, category: searchParams.category, sort, page: Number(searchParams.page) || 1 })
  const categories = allCategories(all)
  const href = (p: number) => {
    const u = new URLSearchParams()
    if (searchParams.q) u.set('q', searchParams.q)
    if (searchParams.category) u.set('category', searchParams.category)
    if (sort !== 'newest') u.set('sort', sort)
    if (p > 1) u.set('page', String(p))
    const s = u.toString()
    return `/books${s ? `?${s}` : ''}`
  }

  return (
    <>
      <Navbar />
      <main id="main-content" style={{ background: 'var(--bg-secondary)', padding: '32px 16px 64px', minHeight: '70vh' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h1 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 30, marginBottom: 4 }}>C-Chu Books</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>Books published by C-Chu Media. Buy the ebook, the print copy, or both.</p>

          <form method="get" action="/books" role="search" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
            <input name="q" defaultValue={searchParams.q || ''} aria-label="Search books" placeholder="Search by title, author or topic" className="form-input" style={{ flex: '1 1 220px', minWidth: 0 }} />
            <select name="category" defaultValue={searchParams.category || ''} aria-label="Category" className="form-input" style={{ flex: '0 1 180px' }}>
              <option value="">All categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select name="sort" defaultValue={sort} aria-label="Sort by" className="form-input" style={{ flex: '0 1 190px' }}>
              {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <button type="submit" className="btn btn-primary" style={{ padding: '0 20px' }}>Search</button>
          </form>

          {items.length === 0 ? (
            <div role="status" style={{ textAlign: 'center', padding: '60px 16px', background: 'var(--bg-card, #fff)', borderRadius: 12, border: '1px solid var(--border-color, #e8e8e5)' }}>
              <h2 style={{ fontFamily: 'Montserrat', fontSize: 20, marginBottom: 8 }}>{all.length === 0 ? 'Books are coming soon' : 'No books match your search'}</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>{all.length === 0 ? 'We are preparing our first titles.' : 'Try a different word or clear the filters.'}</p>
              <Link href={all.length === 0 ? '/shop' : '/books'} style={{ color: 'var(--red)', fontWeight: 700 }}>{all.length === 0 ? 'Browse print products' : 'Clear filters'}</Link>
            </div>
          ) : (
            <>
              <p aria-live="polite" style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>{total} book{total === 1 ? '' : 's'}</p>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 16 }}>
                {items.map(b => <li key={b.id}><BookCard book={b} /></li>)}
              </ul>
              {pages > 1 && (
                <nav aria-label="Pages" style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 28 }}>
                  {page > 1 && <Link href={href(page - 1)} rel="prev" style={{ padding: '8px 14px', border: '1px solid var(--border-color)', borderRadius: 8 }}>Previous</Link>}
                  <span style={{ padding: '8px 14px' }}>Page {page} of {pages}</span>
                  {page < pages && <Link href={href(page + 1)} rel="next" style={{ padding: '8px 14px', border: '1px solid var(--border-color)', borderRadius: 8 }}>Next</Link>}
                </nav>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
