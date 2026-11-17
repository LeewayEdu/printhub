import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, isResponse } from '@/lib/admin-auth'
import { isUploadKind, pathBelongsToBook, sniffMatches, UPLOAD_RULES } from '@/lib/books/uploads'

// Step 2 of an admin upload: look at the file that was actually stored (first bytes and size), and only
// then record it on the book. A file that fails is deleted. Private files are never given a public URL.
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (isResponse(auth)) return auth
  const b = await req.json().catch(() => ({}))
  if (!isUploadKind(b.kind) || typeof b.bookId !== 'string' || typeof b.path !== 'string') return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  if (!pathBelongsToBook(b.path, b.bookId, b.kind)) return NextResponse.json({ error: 'Unexpected file path' }, { status: 400 })

  const rule = UPLOAD_RULES[b.kind as keyof typeof UPLOAD_RULES]
  const bucket = auth.db.storage.from(rule.bucket)
  const discard = async (msg: string, status = 400) => { await bucket.remove([b.path]); return NextResponse.json({ error: msg }, { status }) }

  // Read only the first bytes (a ranged read of a short-lived signed link) and the stored size
  const { data: signed } = await bucket.createSignedUrl(b.path, 60)
  if (!signed?.signedUrl) return NextResponse.json({ error: 'The file was not found. Upload it again.' }, { status: 404 })
  const head = await fetch(signed.signedUrl, { headers: { Range: 'bytes=0-15' } })
  if (!head.ok) return NextResponse.json({ error: 'Could not read the uploaded file' }, { status: 500 })
  const bytes = new Uint8Array(await head.arrayBuffer())
  const total = Number((head.headers.get('content-range') || '').split('/')[1] || head.headers.get('content-length') || 0)
  if (!sniffMatches(b.kind, bytes)) return discard('The file content does not match its type, so it was rejected.')
  if (total > rule.maxBytes) return discard('The file is larger than the limit, so it was rejected.')

  if (b.kind === 'cover' || b.kind === 'preview') {
    const url = auth.db.storage.from('book-public').getPublicUrl(b.path).data.publicUrl
    const { error } = await auth.db.from('books').update({ [b.kind === 'cover' ? 'cover_url' : 'preview_url']: url, updated_at: new Date().toISOString() }).eq('id', b.bookId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, url })
  }

  // ebook files belong to the book's ebook format (a bundle uses the same files)
  const column = b.kind === 'ebook_pdf' ? 'ebook_pdf_path' : 'ebook_epub_path'
  const { data: fmt } = await auth.db.from('book_formats').select('id').eq('book_id', b.bookId).eq('type', 'ebook').maybeSingle()
  if (!fmt) return discard('Add an ebook format (with a price) and save, then upload the ebook file.', 409)
  const { error } = await auth.db.from('book_formats').update({ [column]: b.path, updated_at: new Date().toISOString() }).eq('id', fmt.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })   // note: only a flag is returned, never the private path
}
