// SEO for the books pages: metadata through the shared pageMetadata template, plus Book and
// Product/Offer JSON-LD with the real prices. No rating data is ever emitted (there are no real book reviews).

import type { Metadata } from 'next'
import { pageMetadata, clampText } from '@/components/seo'
import { SITE_URL } from '@/lib/site-url'
import type { AuthorPublic, BookPublic } from './types'

export const BOOKS_WHATSAPP = '2348052929523'

export function bookDescription(b: BookPublic): string {
  const base = b.seo_description || b.description?.replace(/\s+/g, ' ').trim()
    || `${b.title}${b.author ? ` by ${b.author.name}` : ''}, available as ebook and print from C-Chu Books.`
  return clampText(base, 155)
}

export function bookMetadata(b: BookPublic): Metadata {
  return pageMetadata({
    title: b.seo_title || `${b.title}${b.author ? ` by ${b.author.name}` : ''}`,
    description: bookDescription(b),
    path: `/books/${b.slug}`,
    image: b.cover_url,
    imageAlt: `${b.title} cover`,
  })
}

export function authorMetadata(a: AuthorPublic): Metadata {
  return pageMetadata({
    title: `${a.name}, author`,
    description: a.bio ? clampText(a.bio.replace(/\s+/g, ' '), 155) : `Books by ${a.name} on C-Chu Books, with ebook and print editions.`,
    path: `/authors/${a.slug}`,
    image: a.photo_url,
    imageAlt: a.name,
  })
}

const FORMAT_SCHEMA: Record<string, string> = { ebook: 'EBook', print: 'Paperback', bundle: 'Paperback' }

/** Book + Product/Offer structured data. Prices are the real NGN prices (plus USD when that is on sale). */
export function bookJsonLd(b: BookPublic, usdOn: boolean): Record<string, unknown>[] {
  const url = `${SITE_URL}/books/${b.slug}`
  const image = b.cover_url || undefined
  const author = b.author ? { '@type': 'Person', name: b.author.name, url: `${SITE_URL}/authors/${b.author.slug}` } : undefined
  const offersFor = (f: BookPublic['formats'][number]) => {
    const offers: Record<string, unknown>[] = [{
      '@type': 'Offer', price: f.price_ngn, priceCurrency: 'NGN', url,
      availability: f.type !== 'ebook' && f.stock != null && f.stock <= 0 ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
      seller: { '@type': 'Organization', name: 'C-Chu Media Ltd' },
    }]
    if (usdOn && f.type === 'ebook' && f.price_usd != null) {
      offers.push({ '@type': 'Offer', price: f.price_usd, priceCurrency: 'USD', url, availability: 'https://schema.org/InStock', seller: { '@type': 'Organization', name: 'C-Chu Media Ltd' } })
    }
    return offers
  }
  const book = {
    '@context': 'https://schema.org', '@type': 'Book', name: b.title, url, image, author,
    description: b.description || undefined, inLanguage: b.language, isbn: b.isbn || undefined,
    numberOfPages: b.page_count || undefined, datePublished: b.published_date || undefined,
    publisher: { '@type': 'Organization', name: 'C-Chu Media Ltd' },
    workExample: b.formats.filter(f => f.type !== 'bundle').map(f => ({
      '@type': 'Book', bookFormat: `https://schema.org/${FORMAT_SCHEMA[f.type]}`, isbn: f.type === 'print' ? b.isbn || undefined : undefined,
      potentialAction: undefined, offers: offersFor(f),
    })),
  }
  const product = {
    '@context': 'https://schema.org', '@type': 'Product', name: b.title, url, image, description: b.description || undefined,
    brand: { '@type': 'Brand', name: 'C-Chu Books' },
    offers: b.formats.flatMap(f => offersFor(f).map(o => ({ ...o, name: f.type === 'ebook' ? 'Ebook' : f.type === 'print' ? 'Print' : 'Print + Ebook bundle' }))),
  }
  return [book, product]
}

export function bulkOrderWhatsAppUrl(title: string): string {
  const text = `Hello, I would like a bulk order of "${title}" for a school, church or organisation. Please tell me about quantities and pricing.`
  return `https://wa.me/${BOOKS_WHATSAPP}?text=${encodeURIComponent(text)}`
}

export function internationalPrintWhatsAppUrl(title: string): string {
  const text = `Hello, I am outside Nigeria and would like to ask about an international print copy of "${title}".`
  return `https://wa.me/${BOOKS_WHATSAPP}?text=${encodeURIComponent(text)}`
}
