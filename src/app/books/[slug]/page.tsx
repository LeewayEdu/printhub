import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import Link from 'next/link'
import type { Metadata } from 'next'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { JsonLd } from '@/components/seo'
import { BookCover } from '@/components/books/BookCard'
import BookBuyPanel from '@/components/books/BookBuyPanel'
import AuthorRefCapture from '@/components/books/AuthorRefCapture'
import { loadBook } from '@/lib/books/catalogue'
import { bookJsonLd, bookMetadata } from '@/lib/books/seo'
import { usdEnabled, visitorCountry } from '@/lib/books/currency'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const book = await loadBook(params.slug)
  return book ? bookMetadata(book) : { title: 'Book not found', robots: { index: false } }
}

export default async function BookPage({ params }: { params: { slug: string } }) {
  const book = await loadBook(params.slug)
  if (!book) notFound()
  const country = visitorCountry(headers())
  const usdOn = usdEnabled()

  return (
    <>
      <Navbar />
      <AuthorRefCapture />
      {bookJsonLd(book, usdOn).map((d, i) => <JsonLd key={i} data={d} />)}
      <main id="main-content" style={{ background: 'var(--bg-secondary)', padding: '24px 16px 64px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <nav aria-label="Breadcrumb" style={{ fontSize: 13, marginBottom: 16 }}>
            <Link href="/books" style={{ color: 'var(--text-secondary)' }}>Books</Link> <span aria-hidden="true">/</span> <span>{book.title}</span>
          </nav>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 260px) minmax(0, 1fr)', gap: 32, alignItems: 'start' }} className="book-layout">
            <div style={{ display: 'flex', justifyContent: 'center' }}><BookCover book={book} width={260} /></div>
            <div>
              <h1 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 30, lineHeight: 1.2, margin: 0 }}>{book.title}</h1>
              {book.subtitle && <p style={{ fontSize: 17, color: 'var(--text-secondary)', margin: '6px 0 0' }}>{book.subtitle}</p>}
              {book.author && <p style={{ margin: '10px 0 0' }}>by <Link href={`/authors/${book.author.slug}`} style={{ color: 'var(--red)', fontWeight: 700 }}>{book.author.name}</Link></p>}
              <dl style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 20px', fontSize: 13, color: 'var(--text-secondary)', margin: '12px 0 20px' }}>
                {book.language && <div><dt style={{ display: 'inline' }}>Language: </dt><dd style={{ display: 'inline', margin: 0 }}>{book.language}</dd></div>}
                {book.page_count && <div><dt style={{ display: 'inline' }}>Pages: </dt><dd style={{ display: 'inline', margin: 0 }}>{book.page_count}</dd></div>}
                {book.isbn && <div><dt style={{ display: 'inline' }}>ISBN: </dt><dd style={{ display: 'inline', margin: 0 }}>{book.isbn}</dd></div>}
                {book.published_date && <div><dt style={{ display: 'inline' }}>Published: </dt><dd style={{ display: 'inline', margin: 0 }}>{new Date(book.published_date).toLocaleDateString('en-NG', { year: 'numeric', month: 'long' })}</dd></div>}
              </dl>

              <BookBuyPanel book={book} country={country} usdOn={usdOn} />

              {book.preview_url && (
                <p style={{ marginTop: 16 }}>
                  <a href={book.preview_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--red)', fontWeight: 700 }}>Read a free sample (PDF)</a>
                </p>
              )}
            </div>
          </div>

          {book.description && (
            <section aria-labelledby="about-book" style={{ marginTop: 40, maxWidth: 720 }}>
              <h2 id="about-book" style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 22, marginBottom: 12 }}>About this book</h2>
              {book.description.split(/\n{2,}/).map((p, i) => <p key={i} style={{ lineHeight: 1.8, color: 'var(--text-primary)', marginBottom: 12 }}>{p}</p>)}
            </section>
          )}
          {book.author?.bio && (
            <section aria-labelledby="about-author" style={{ marginTop: 32, maxWidth: 720 }}>
              <h2 id="about-author" style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 22, marginBottom: 12 }}>About the author</h2>
              <p style={{ lineHeight: 1.8 }}>{book.author.bio}</p>
              <Link href={`/authors/${book.author.slug}`} style={{ color: 'var(--red)', fontWeight: 700 }}>More by {book.author.name}</Link>
            </section>
          )}
        </div>
      </main>
      <Footer />
      <style>{`@media (max-width: 720px) { .book-layout { grid-template-columns: 1fr !important; } }`}</style>
    </>
  )
}
