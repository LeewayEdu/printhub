// Rules that decide whether a book may be published. The database also enforces rights_confirmed
// (CHECK constraint books_rights_before_publish); this gives the admin a clear reason first.

export interface PublishCandidate {
  title?: string | null
  slug?: string | null
  cover_url?: string | null
  author_id?: string | null
  rights_confirmed?: boolean | null
  rights_confirmed_by?: string | null
  rights_note?: string | null
  formats: { type: string; active: boolean; price_ngn: number | null; ebook_pdf_path?: string | null; ebook_epub_path?: string | null }[]
}

export function publishBlockers(b: PublishCandidate): string[] {
  const reasons: string[] = []
  if (!b.rights_confirmed) reasons.push('Rights are not confirmed. Confirm the publishing rights (with a note) before publishing.')
  else if (!b.rights_confirmed_by) reasons.push('Rights confirmation has no confirming admin recorded.')
  if (!b.title?.trim()) reasons.push('The book needs a title.')
  if (!b.slug?.trim()) reasons.push('The book needs a slug.')
  if (!b.author_id) reasons.push('The book needs an author.')
  if (!b.cover_url) reasons.push('Upload a cover image.')
  const active = b.formats.filter(f => f.active)
  if (active.length === 0) reasons.push('Add at least one active format with a price.')
  for (const f of active) {
    if (f.price_ngn == null || !(Number(f.price_ngn) >= 0)) reasons.push(`The ${f.type} format needs a price in naira.`)
    if ((f.type === 'ebook' || f.type === 'bundle') && !f.ebook_pdf_path && !f.ebook_epub_path) {
      reasons.push(`The ${f.type} format has no ebook file (upload a PDF or EPUB).`)
    }
  }
  return reasons
}
