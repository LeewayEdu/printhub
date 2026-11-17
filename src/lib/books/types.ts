export type FormatType = 'print' | 'ebook' | 'bundle'
export type Currency = 'NGN' | 'USD'

export interface BookFormatPublic {
  id: string
  book_id: string
  type: FormatType
  price_ngn: number
  price_usd: number | null
  stock: number | null
  active: boolean
}

export interface AuthorPublic {
  id: string; name: string; slug: string; bio: string | null; photo_url: string | null
  social_links: Record<string, string>; status: string
}

export interface BookPublic {
  id: string; title: string; slug: string; subtitle: string | null; description: string | null
  cover_url: string | null; author_id: string; language: string; categories: string[]
  isbn: string | null; page_count: number | null; published_date: string | null
  preview_url: string | null; status: string; seo_title: string | null; seo_description: string | null
  author?: AuthorPublic | null
  formats: BookFormatPublic[]
}

/** Columns that must never reach a browser or a public API response */
export const PRIVATE_FORMAT_COLUMNS = ['ebook_pdf_path', 'ebook_epub_path', 'print_cost_ngn'] as const
export const PUBLIC_FORMAT_SELECT = 'id, book_id, type, price_ngn, price_usd, stock, active'
export const PUBLIC_BOOK_SELECT = 'id, title, slug, subtitle, description, cover_url, author_id, language, categories, isbn, page_count, published_date, preview_url, status, seo_title, seo_description'
export const PUBLIC_AUTHOR_SELECT = 'id, name, slug, bio, photo_url, social_links, status'
