// Upload rules for book files. Admin uploads go straight from the browser to storage through a signed
// upload URL (serverless functions cannot take large bodies), so the server validates what the browser
// DECLARES before issuing the URL, and then checks the file's real first bytes and size afterwards.

import crypto from 'crypto'

export type UploadKind = 'cover' | 'preview' | 'ebook_pdf' | 'ebook_epub'

export const UPLOAD_RULES: Record<UploadKind, { bucket: 'book-public' | 'book-files'; exts: string[]; mimes: string[]; maxBytes: number; label: string }> = {
  cover:      { bucket: 'book-public', exts: ['jpg', 'jpeg', 'png', 'webp'], mimes: ['image/jpeg', 'image/png', 'image/webp'], maxBytes: 5 * 1024 * 1024, label: 'Cover image (JPG, PNG or WebP, up to 5 MB)' },
  preview:    { bucket: 'book-public', exts: ['pdf'], mimes: ['application/pdf'], maxBytes: 15 * 1024 * 1024, label: 'Preview sample (PDF, up to 15 MB)' },
  ebook_pdf:  { bucket: 'book-files', exts: ['pdf'], mimes: ['application/pdf'], maxBytes: 100 * 1024 * 1024, label: 'Ebook PDF (up to 100 MB)' },
  ebook_epub: { bucket: 'book-files', exts: ['epub'], mimes: ['application/epub+zip'], maxBytes: 50 * 1024 * 1024, label: 'Ebook EPUB (up to 50 MB)' },
}

export const isUploadKind = (k: unknown): k is UploadKind => typeof k === 'string' && k in UPLOAD_RULES

export const extOf = (filename: string) => (filename.split('.').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '')

/** Checks what the browser says about the file. Returns an error message, or null when acceptable. */
export function validateDeclared(kind: UploadKind, filename: string, size: number, contentType: string): string | null {
  const r = UPLOAD_RULES[kind]
  if (!r.exts.includes(extOf(filename))) return `Not an accepted file type. Expected: ${r.label}.`
  if (contentType && !r.mimes.includes(contentType.toLowerCase())) return `The file type looks wrong. Expected: ${r.label}.`
  if (!Number.isFinite(size) || size <= 0) return 'The file is empty.'
  if (size > r.maxBytes) return `The file is too large. Limit: ${r.label}.`
  return null
}

/** Real content check on the first bytes of the stored file */
export function sniffMatches(kind: UploadKind, head: Uint8Array): boolean {
  const b = (i: number) => head[i]
  const ascii = (from: number, text: string) => text.split('').every((c, i) => head[from + i] === c.charCodeAt(0))
  if (kind === 'ebook_pdf' || kind === 'preview') return ascii(0, '%PDF-')
  if (kind === 'ebook_epub') return b(0) === 0x50 && b(1) === 0x4b && b(2) === 0x03 && b(3) === 0x04   // zip container
  // cover: PNG, JPEG or WebP
  const png = b(0) === 0x89 && ascii(1, 'PNG')
  const jpg = b(0) === 0xff && b(1) === 0xd8 && b(2) === 0xff
  const webp = ascii(0, 'RIFF') && ascii(8, 'WEBP')
  return png || jpg || webp
}

/** Random, unguessable object path. Private files go under ebooks/, public ones under covers/ or previews/ */
export function objectPath(bookId: string, kind: UploadKind, filename: string): string {
  const folder = kind === 'cover' ? 'covers' : kind === 'preview' ? 'previews' : 'ebooks'
  return `${folder}/${bookId}/${crypto.randomUUID()}.${extOf(filename)}`
}

/** The path must be one this book's upload could have produced (stops recording someone else's file) */
export function pathBelongsToBook(path: string, bookId: string, kind: UploadKind): boolean {
  const folder = kind === 'cover' ? 'covers' : kind === 'preview' ? 'previews' : 'ebooks'
  const ext = kind === 'ebook_epub' ? 'epub' : kind === 'ebook_pdf' || kind === 'preview' ? 'pdf' : '(jpg|jpeg|png|webp)'
  return new RegExp(`^${folder}/${bookId}/[0-9a-f-]{36}\\.${ext}$`).test(path)
}
