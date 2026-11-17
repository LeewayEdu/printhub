import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { JsonLd } from '@/components/seo'
import BookCard from '@/components/books/BookCard'
import { loadAuthor } from '@/lib/books/catalogue'
import { authorMetadata } from '@/lib/books/seo'
import { SITE_URL } from '@/lib/site-url'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const r = await loadAuthor(params.slug)
  return r ? authorMetadata(r.author) : { title: 'Author not found', robots: { index: false } }
}

export default async function AuthorPage({ params }: { params: { slug: string } }) {
  const r = await loadAuthor(params.slug)
  if (!r) notFound()
  const { author, books } = r
  const links = Object.entries(author.social_links || {}).filter(([, v]) => /^https?:\/\//.test(String(v)))
  return (
    <>
      <Navbar />
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'Person', name: author.name, url: `${SITE_URL}/authors/${author.slug}`, image: author.photo_url || undefined, description: author.bio || undefined, sameAs: links.map(([, v]) => v) }} />
      <main id="main-content" style={{ background: 'var(--bg-secondary)', padding: '32px 16px 64px', minHeight: '60vh' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <h1 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 30 }}>{author.name}</h1>
          {author.bio && <p style={{ lineHeight: 1.8, maxWidth: 720, margin: '12px 0' }}>{author.bio}</p>}
          {links.length > 0 && (
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              {links.map(([k, v]) => <li key={k}><a href={String(v)} target="_blank" rel="noopener noreferrer nofollow" style={{ color: 'var(--red)', textTransform: 'capitalize' }}>{k}</a></li>)}
            </ul>
          )}
          <h2 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 22, margin: '28px 0 14px' }}>Books by {author.name}</h2>
          {books.length === 0 ? <p>No books yet. <Link href="/books" style={{ color: 'var(--red)' }}>Browse all books</Link></p> : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 16 }}>
              {books.map(b => <li key={b.id}><BookCard book={b} /></li>)}
            </ul>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
