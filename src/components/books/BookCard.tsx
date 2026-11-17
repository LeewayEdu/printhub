import Link from 'next/link'
import type { BookPublic } from '@/lib/books/types'
import { lowestPrice } from '@/lib/books/catalogue'
import { formatMoney } from '@/lib/books/currency'

export function BookCover({ book, width = 200 }: { book: Pick<BookPublic, 'title' | 'cover_url'>; width?: number }) {
  const h = Math.round(width * 1.5)
  if (!book.cover_url) {
    return (
      <div role="img" aria-label={`${book.title} (cover coming soon)`} style={{ width, height: h, maxWidth: '100%', background: 'linear-gradient(135deg,#f3f0ea,#e6e1d6)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12, textAlign: 'center', fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, color: '#555', boxSizing: 'border-box' }}>
        {book.title}
      </div>
    )
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={book.cover_url} alt={`${book.title} cover`} width={width} height={h} loading="lazy" style={{ width, height: 'auto', maxWidth: '100%', aspectRatio: '2 / 3', objectFit: 'cover', borderRadius: 8, background: '#eee' }} />
}

export default function BookCard({ book }: { book: BookPublic }) {
  return (
    <Link href={`/books/${book.slug}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block', border: '1px solid var(--border-color, #e8e8e5)', borderRadius: 12, padding: 12, background: 'var(--bg-card, #fff)' }}>
      <div style={{ display: 'flex', justifyContent: 'center' }}><BookCover book={book} width={160} /></div>
      <h2 style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 15, margin: '12px 0 2px', lineHeight: 1.3 }}>{book.title}</h2>
      {book.author && <div style={{ fontSize: 13, color: 'var(--text-secondary, #6b6b6b)' }}>{book.author.name}</div>}
      <div style={{ marginTop: 8, fontSize: 13, color: 'var(--text-secondary, #6b6b6b)' }}>
        From <strong style={{ color: 'var(--red)', fontFamily: 'Montserrat' }}>{formatMoney(lowestPrice(book), 'NGN')}</strong>
      </div>
    </Link>
  )
}
