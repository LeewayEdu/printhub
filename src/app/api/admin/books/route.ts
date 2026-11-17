import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { requireAdmin, isResponse } from '@/lib/admin-auth'
import { publishBlockers } from '@/lib/books/rules'
import { PAID_OR_LATER } from '@/lib/books/fulfil'

export const dynamic = 'force-dynamic'

// All admin book actions go through here with the service key: the browser never writes to a books table.
const slugify = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-').slice(0, 80)
const txt = (v: unknown, max = 2000) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const nul = (v: unknown, max = 2000) => txt(v, max) || null
const numOrNull = (v: unknown) => (v === '' || v == null || !Number.isFinite(Number(v)) ? null : Number(v))
const pct = (v: unknown) => { const n = numOrNull(v); return n != null && n >= 0 && n <= 100 ? n : null }
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/

async function list(db: SupabaseClient) {
  const [{ data: authors }, { data: books }, { data: formats }, { data: rules }, { data: settings }, { data: items }] = await Promise.all([
    db.from('authors').select('*').order('name'),
    db.from('books').select('*').order('created_at', { ascending: false }),
    db.from('book_formats').select('*'),
    db.from('royalty_rules').select('*'),
    db.from('books_settings').select('*').maybeSingle(),
    db.from('order_items').select('book_id, quantity, order_id').eq('item_type', 'book'),
  ])
  const orderIds = Array.from(new Set((items || []).map((i: any) => i.order_id)))
  const { data: orders } = orderIds.length ? await db.from('orders').select('id, status, is_test').in('id', orderIds) : { data: [] as any[] }
  const sold = new Set((orders || []).filter((o: any) => PAID_OR_LATER.includes(o.status) && !o.is_test).map((o: any) => o.id))
  const sales = new Map<string, number>()
  for (const i of (items || []) as any[]) if (sold.has(i.order_id)) sales.set(i.book_id, (sales.get(i.book_id) || 0) + (Number(i.quantity) || 1))
  const authorName = new Map<string, string>((authors || []).map((a: any) => [a.id, a.name]))
  return {
    authors: authors || [],
    defaultRule: (rules || []).find((r: any) => r.book_id == null) || null,
    settings: settings || null,
    books: (books || []).map((b: any) => ({
      ...b, author_name: authorName.get(b.author_id) || '', sales: sales.get(b.id) || 0,
      rule: (rules || []).find((r: any) => r.book_id === b.id) || null,
      // never send the private paths to the browser: only whether a file exists
      formats: (formats || []).filter((f: any) => f.book_id === b.id).map((f: any) => ({
        id: f.id, type: f.type, price_ngn: f.price_ngn, price_usd: f.price_usd, stock: f.stock, print_cost_ngn: f.print_cost_ngn, active: f.active,
        has_pdf: !!f.ebook_pdf_path, has_epub: !!f.ebook_epub_path,
      })),
    })),
  }
}

async function upsertRule(db: SupabaseClient, bookId: string | null, r: any) {
  const row = {
    book_id: bookId, option_name: nul(r.option_name, 80),
    ebook_author_share_pct: pct(r.ebook_author_share_pct), print_author_share_pct: pct(r.print_author_share_pct), referral_share_pct: pct(r.referral_share_pct),
    hold_days: Math.max(0, Math.floor(Number(r.hold_days) || 30)), minimum_payout: Math.max(0, Number(r.minimum_payout) || 5000),
    updated_at: new Date().toISOString(),
  }
  const q = bookId ? db.from('royalty_rules').select('id').eq('book_id', bookId) : db.from('royalty_rules').select('id').is('book_id', null)
  const { data: existing } = await q.maybeSingle()
  return existing ? db.from('royalty_rules').update(row).eq('id', existing.id) : db.from('royalty_rules').insert(row)
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (isResponse(auth)) return auth
  const { db, user } = auth
  const body = await req.json().catch(() => ({}))
  const fail = (error: string, status = 400, extra: object = {}) => NextResponse.json({ error, ...extra }, { status })

  switch (body.action) {
    case 'list': return NextResponse.json(await list(db))

    case 'save_author': {
      const a = body.author || {}
      const name = txt(a.name, 120)
      const slug = txt(a.slug, 80) || slugify(name)
      if (!name) return fail('The author needs a name')
      if (!SLUG.test(slug)) return fail('The slug may only contain lowercase letters, numbers and hyphens')
      const social: Record<string, string> = {}
      for (const [k, v] of Object.entries(a.social_links || {})) if (/^https?:\/\//.test(String(v))) social[k.slice(0, 30)] = String(v).slice(0, 300)
      const row = {
        name, slug, bio: nul(a.bio, 4000), photo_url: nul(a.photo_url, 500), social_links: social,
        payout_details_ref: nul(a.payout_details_ref, 200), referral_code: nul(a.referral_code, 40)?.toUpperCase() || null,
        status: a.status === 'published' ? 'published' : 'draft', updated_at: new Date().toISOString(),
      }
      const r = a.id ? await db.from('authors').update(row).eq('id', a.id).select('id').single() : await db.from('authors').insert(row).select('id').single()
      return r.error ? fail(r.error.message) : NextResponse.json({ ok: true, id: r.data.id })
    }

    case 'save_book': {
      const b = body.book || {}
      const title = txt(b.title, 200)
      const slug = txt(b.slug, 80) || slugify(title)
      if (!title) return fail('The book needs a title')
      if (!SLUG.test(slug)) return fail('The slug may only contain lowercase letters, numbers and hyphens')
      if (!b.author_id) return fail('Choose an author')
      const categories = (Array.isArray(b.categories) ? b.categories : String(b.categories || '').split(',')).map((c: string) => String(c).trim()).filter(Boolean).slice(0, 10)
      const row: Record<string, unknown> = {
        title, slug, subtitle: nul(b.subtitle, 200), description: nul(b.description, 10000), author_id: b.author_id,
        language: txt(b.language, 40) || 'English', categories, isbn: nul(b.isbn, 20), page_count: numOrNull(b.page_count),
        published_date: nul(b.published_date, 10), rights_document_ref: nul(b.rights_document_ref, 300),
        seo_title: nul(b.seo_title, 120), seo_description: nul(b.seo_description, 200), updated_at: new Date().toISOString(),
      }
      // status, rights and files are NOT editable here: they have their own checked actions
      const r = b.id ? await db.from('books').update(row).eq('id', b.id).select('id').single() : await db.from('books').insert({ ...row, status: 'draft' }).select('id').single()
      if (r.error) return fail(r.error.message)
      const bookId = r.data.id as string
      for (const f of (body.formats || []) as any[]) {
        if (!['print', 'ebook', 'bundle'].includes(f.type)) continue
        const price = numOrNull(f.price_ngn)
        if (price == null || price < 0) return fail(`The ${f.type} format needs a price in naira`)
        const frow = { book_id: bookId, type: f.type, price_ngn: price, price_usd: numOrNull(f.price_usd), stock: f.type === 'ebook' ? null : numOrNull(f.stock), print_cost_ngn: f.type === 'ebook' ? null : numOrNull(f.print_cost_ngn), active: f.active !== false, updated_at: new Date().toISOString() }
        const { data: ex } = await db.from('book_formats').select('id').eq('book_id', bookId).eq('type', f.type).maybeSingle()
        const w = ex ? await db.from('book_formats').update(frow).eq('id', ex.id) : await db.from('book_formats').insert(frow)
        if (w.error) return fail(w.error.message)
      }
      if (body.rule) { const w = await upsertRule(db, bookId, body.rule); if (w.error) return fail(w.error.message) }
      return NextResponse.json({ ok: true, id: bookId })
    }

    case 'set_rights': {
      const bookId = txt(body.bookId, 40)
      if (body.confirmed) {
        const note = txt(body.note, 1000)
        if (note.length < 5) return fail('A note is required to confirm rights (what document or agreement covers this book).')
        const { error } = await db.from('books').update({ rights_confirmed: true, rights_note: note, rights_document_ref: nul(body.documentRef, 300), rights_confirmed_by: user.id, rights_confirmed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', bookId)
        return error ? fail(error.message) : NextResponse.json({ ok: true })
      }
      // withdrawing the confirmation also unpublishes the book (the database would refuse otherwise)
      const { error } = await db.from('books').update({ rights_confirmed: false, rights_confirmed_by: null, rights_confirmed_at: null, status: 'draft', updated_at: new Date().toISOString() }).eq('id', bookId)
      return error ? fail(error.message) : NextResponse.json({ ok: true, unpublished: true })
    }

    case 'publish': {
      const bookId = txt(body.bookId, 40)
      const { data: book } = await db.from('books').select('*').eq('id', bookId).maybeSingle()
      if (!book) return fail('Book not found', 404)
      const { data: formats } = await db.from('book_formats').select('type, active, price_ngn, ebook_pdf_path, ebook_epub_path').eq('book_id', bookId)
      const blockers = publishBlockers({ ...book, formats: formats || [] })
      if (blockers.length) return fail('This book cannot be published yet.', 409, { blockers })
      const { error } = await db.from('books').update({ status: 'published', updated_at: new Date().toISOString() }).eq('id', bookId)
      return error ? fail(error.message, 409, { blockers: [error.message] }) : NextResponse.json({ ok: true })
    }
    case 'unpublish': {
      const { error } = await db.from('books').update({ status: 'draft', updated_at: new Date().toISOString() }).eq('id', txt(body.bookId, 40))
      return error ? fail(error.message) : NextResponse.json({ ok: true })
    }

    case 'save_default_rule': {
      const w = await upsertRule(db, null, body.rule || {})
      return w.error ? fail(w.error.message) : NextResponse.json({ ok: true })
    }
    case 'save_settings': {
      const rate = pct(body.book_affiliate_rate)
      if (rate == null) return fail('The book affiliate rate must be between 0 and 100')
      const { error } = await db.from('books_settings').update({ book_affiliate_rate: rate, updated_at: new Date().toISOString() }).eq('id', true)
      return error ? fail(error.message) : NextResponse.json({ ok: true })
    }
    default: return fail('Unknown action')
  }
}
