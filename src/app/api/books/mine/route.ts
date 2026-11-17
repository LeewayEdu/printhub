import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// The signed-in customer's own purchases. Only public facts are returned: titles, covers, which
// formats can be downloaded and how many downloads are left. Never a file path.
export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Please sign in' }, { status: 401 })
  const db = supabaseAdmin()
  const { data: { user }, error } = await db.auth.getUser(token)
  if (error || !user) return NextResponse.json({ error: 'Please sign in' }, { status: 401 })

  const { data: ents } = await db.from('entitlements').select('*').eq('user_id', user.id).order('granted_at', { ascending: false })
  if (!ents || ents.length === 0) return NextResponse.json({ books: [] })

  const bookIds = Array.from(new Set(ents.map((e: any) => e.book_id)))
  const [{ data: books }, { data: formats }] = await Promise.all([
    db.from('books').select('id, title, slug, cover_url, author_id').in('id', bookIds),
    db.from('book_formats').select('book_id, type, ebook_pdf_path, ebook_epub_path').in('book_id', bookIds),
  ])
  const bookById = new Map<string, any>((books || []).map((b: any) => [b.id, b]))
  return NextResponse.json({
    books: ents.map((e: any) => {
      const b = bookById.get(e.book_id)
      const files = (formats || []).filter((f: any) => f.book_id === e.book_id)
      return {
        entitlementId: e.id, title: b?.title || 'Book', slug: b?.slug || null, cover: b?.cover_url || null,
        grantedAt: e.granted_at, revoked: !!e.revoked_at,
        downloadsLeft: Math.max(0, Number(e.max_downloads) - Number(e.download_count)), maxDownloads: e.max_downloads,
        pdf: files.some((f: any) => f.ebook_pdf_path), epub: files.some((f: any) => f.ebook_epub_path),
      }
    }),
  })
}
