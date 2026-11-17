import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { rateLimit, clientIp } from '@/lib/rate-limit'
import { authorizeDownload, getOrCreateStamped, hashIp, issueSignedUrl, REASON_TEXT } from '@/lib/books/download'

export const dynamic = 'force-dynamic'
export const maxDuration = 60   // stamping a large PDF the first time can take a while (Vercel plan limits apply)

// Returns a short-lived signed link to the buyer-stamped file. Checks, in order: a valid login, the
// rate limit, that the entitlement belongs to THIS user, that it is not revoked, and that the download
// limit is not used up. The file is in a private bucket; no public URL is ever returned.
export async function POST(req: NextRequest) {
  const ip = clientIp(req.headers)
  if (!rateLimit(`dl-ip:${ip}`, 30, 10 * 60 * 1000).allowed) return NextResponse.json({ error: 'Too many requests. Please wait a few minutes.' }, { status: 429 })

  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Please sign in' }, { status: 401 })
  const db = supabaseAdmin()
  const { data: { user }, error: authErr } = await db.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'Please sign in' }, { status: 401 })
  if (!rateLimit(`dl-user:${user.id}`, 10, 10 * 60 * 1000).allowed) return NextResponse.json({ error: 'Too many downloads in a short time. Please wait a few minutes.' }, { status: 429 })

  const body = await req.json().catch(() => ({}))
  const entitlementId = typeof body.entitlementId === 'string' ? body.entitlementId : ''
  const type: 'pdf' | 'epub' = body.type === 'epub' ? 'epub' : 'pdf'
  if (!/^[0-9a-f-]{36}$/i.test(entitlementId)) return NextResponse.json({ error: REASON_TEXT.not_found }, { status: 404 })

  // user_id is part of the query: another customer's entitlement simply is not found
  const { data: ent } = await db.from('entitlements').select('*').eq('id', entitlementId).eq('user_id', user.id).maybeSingle()
  const decision = authorizeDownload(ent)
  if (!decision.ok) return NextResponse.json({ error: REASON_TEXT[decision.reason], reason: decision.reason }, { status: decision.reason === 'not_found' ? 404 : 403 })

  const { data: fmt } = await db.from('book_formats').select('ebook_pdf_path, ebook_epub_path').eq('id', ent.book_format_id).maybeSingle()
  // a bundle's ebook files live on the book's ebook format
  let paths = fmt
  if (!paths?.ebook_pdf_path && !paths?.ebook_epub_path) {
    const { data: eb } = await db.from('book_formats').select('ebook_pdf_path, ebook_epub_path').eq('book_id', ent.book_id).eq('type', 'ebook').maybeSingle()
    paths = eb
  }
  const source = type === 'pdf' ? paths?.ebook_pdf_path : paths?.ebook_epub_path
  if (!source) return NextResponse.json({ error: `The ${type.toUpperCase()} file is not available for this book.` }, { status: 404 })

  const { data: profile } = await db.from('profiles').select('first_name, last_name, email').eq('id', user.id).maybeSingle()
  const label = `${[profile?.first_name, profile?.last_name].filter(Boolean).join(' ')} <${profile?.email || user.email || user.id}>`
  const stamped = await getOrCreateStamped(db, ent.id, type, source, label)
  if (!stamped) return NextResponse.json({ error: 'We could not prepare your file. Please try again in a moment.' }, { status: 500 })

  // Count the download only now that a file is ready; the equality check stops two taps from using one slot twice
  const { data: bumped } = await db.from('entitlements').update({ download_count: Number(ent.download_count) + 1 })
    .eq('id', ent.id).eq('download_count', ent.download_count).is('revoked_at', null).select('id')
  if (!bumped || bumped.length === 0) return NextResponse.json({ error: 'Please try again.' }, { status: 409 })

  const url = await issueSignedUrl(db, stamped)
  if (!url) return NextResponse.json({ error: 'We could not prepare your link. Please try again.' }, { status: 500 })

  await db.from('download_log').insert({ entitlement_id: ent.id, file_type: type, ip_hash: hashIp(ip), user_agent: (req.headers.get('user-agent') || '').slice(0, 300) })
  return NextResponse.json({ url, expiresInSeconds: 600, remaining: Math.max(0, Number(ent.max_downloads) - Number(ent.download_count) - 1) })
}
