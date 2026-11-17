// Local development fixtures for the storefront (BOOKS_USE_FIXTURES=true, ignored on the production
// deployment). These are made-up titles, authors and prices for layout and flow checks. They are not
// real books and nothing here is ever written to a database.

import type { AuthorPublic, BookPublic } from './types'

export const FIXTURE_AUTHORS: AuthorPublic[] = [
  { id: 'fx-author-1', name: 'Sample Author', slug: 'sample-author', bio: 'A made-up author used to check the layout of the books pages.', photo_url: null, social_links: { website: 'https://example.com' }, status: 'published' },
]

export const FIXTURE_BOOKS: BookPublic[] = [
  {
    id: 'fx-book-1', title: 'Sample Book One', slug: 'sample-book-one', subtitle: 'A layout fixture', cover_url: null,
    description: 'This is placeholder text used only on a developer machine to check how a book page looks.\n\nIt is not a real book.',
    author_id: 'fx-author-1', language: 'English', categories: ['Fiction', 'Sample'], isbn: null, page_count: 120, published_date: '2026-01-15',
    preview_url: null, status: 'published', seo_title: null, seo_description: null, author: FIXTURE_AUTHORS[0],
    formats: [
      { id: 'fx-fmt-1e', book_id: 'fx-book-1', type: 'ebook', price_ngn: 2500, price_usd: 6, stock: null, active: true },
      { id: 'fx-fmt-1p', book_id: 'fx-book-1', type: 'print', price_ngn: 5000, price_usd: null, stock: 40, active: true },
      { id: 'fx-fmt-1b', book_id: 'fx-book-1', type: 'bundle', price_ngn: 6500, price_usd: null, stock: 40, active: true },
    ],
  },
  {
    id: 'fx-book-2', title: 'Sample Book Two', slug: 'sample-book-two', subtitle: null, cover_url: null,
    description: 'A second placeholder title.', author_id: 'fx-author-1', language: 'English', categories: ['Sample'], isbn: null,
    page_count: 80, published_date: '2025-11-02', preview_url: null, status: 'published', seo_title: null, seo_description: null, author: FIXTURE_AUTHORS[0],
    formats: [{ id: 'fx-fmt-2e', book_id: 'fx-book-2', type: 'ebook', price_ngn: 1500, price_usd: null, stock: null, active: true }],
  },
]
