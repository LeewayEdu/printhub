import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, isResponse } from '@/lib/admin-auth'
import { effectiveStatus, ledgerCsv, payoutDecision, summariseEntries, type LedgerRow } from '@/lib/books/royalty'

export const dynamic = 'force-dynamic'

// Royalty reporting and payouts. Admin only. There is no author-facing view in Phase 1.
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (isResponse(auth)) return auth
  const { db, user } = auth
  const b = await req.json().catch(() => ({}))
  const now = new Date()
  const fail = (error: string, status = 400) => NextResponse.json({ error }, { status })

  const [{ data: authors }, { data: books }] = await Promise.all([db.from('authors').select('id, name'), db.from('books').select('id, title')])
  const authorName = new Map<string, string>((authors || []).map((a: any) => [a.id, a.name]))
  const bookTitle = new Map<string, string>((books || []).map((x: any) => [x.id, x.title]))

  const loadEntries = async (month?: string, authorId?: string) => {
    let q = db.from('royalty_entries').select('*').order('created_at', { ascending: false }).limit(5000)
    if (authorId) q = q.eq('author_id', authorId)
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const start = new Date(`${month}-01T00:00:00Z`), end = new Date(start); end.setUTCMonth(end.getUTCMonth() + 1)
      q = q.gte('created_at', start.toISOString()).lt('created_at', end.toISOString())
    }
    const { data } = await q
    return (data || []) as LedgerRow[]
  }

  switch (b.action) {
    case 'report': {
      const rows = await loadEntries(b.month, b.authorId)
      const { data: payouts } = await db.from('royalty_payouts').select('*').order('created_at', { ascending: false }).limit(200)
      const { data: def } = await db.from('royalty_rules').select('minimum_payout').is('book_id', null).maybeSingle()
      return NextResponse.json({
        summary: summariseEntries(rows, now).map((s: any) => ({ ...s, author_name: authorName.get(s.author_id) || s.author_id })),
        payouts: (payouts || []).map((p: any) => ({ ...p, author_name: authorName.get(p.author_id) || p.author_id })),
        minimumPayout: Number(def?.minimum_payout ?? 5000),
      })
    }
    case 'csv': {
      const rows = (await loadEntries(b.month, b.authorId)).map(r => ({ ...r, author_name: authorName.get(r.author_id), book_title: bookTitle.get(r.book_id) }))
      return new NextResponse(ledgerCsv(rows, now), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="royalties-${b.month || 'all'}.csv"` } })
    }
    case 'create_payout': {
      if (typeof b.authorId !== 'string') return fail('Choose an author')
      const currency = b.currency === 'USD' ? 'USD' : 'NGN'
      const { data: def } = await db.from('royalty_rules').select('minimum_payout').is('book_id', null).maybeSingle()
      const minimum = Number(def?.minimum_payout ?? 5000)
      const rows = (await loadEntries(undefined, b.authorId)).filter(r => r.currency === currency)
      const d = payoutDecision(rows, minimum, now)
      if (!d.meetsMinimum) return fail(`Payable royalties are ${currency} ${d.total.toLocaleString()}, below the minimum payout of ${minimum.toLocaleString()}.`, 409)
      const { data: payout, error } = await db.from('royalty_payouts').insert({ author_id: b.authorId, period: now.toISOString().slice(0, 7), currency, total: d.total, status: 'pending' }).select('id').single()
      if (error || !payout) return fail(error?.message || 'Could not create the payout', 500)
      const ids = d.due.map(r => r.id)
      await db.from('royalty_entries').update({ payout_id: payout.id, status: 'payable' }).in('id', ids)
      return NextResponse.json({ ok: true, payoutId: payout.id, total: d.total, entries: ids.length })
    }
    case 'mark_paid': {
      const reference = typeof b.reference === 'string' ? b.reference.trim().slice(0, 120) : ''
      if (reference.length < 3) return fail('Enter the payment reference (for example the transfer reference)')
      const { data: payout } = await db.from('royalty_payouts').select('id, status').eq('id', b.payoutId).maybeSingle()
      if (!payout) return fail('Payout not found', 404)
      if (payout.status === 'paid') return fail('This payout is already marked paid', 409)
      const { error } = await db.from('royalty_payouts').update({ status: 'paid', paid_at: now.toISOString(), reference, notes: typeof b.notes === 'string' ? b.notes.slice(0, 500) : null }).eq('id', payout.id).eq('status', 'pending')
      if (error) return fail(error.message, 500)
      await db.from('royalty_entries').update({ status: 'paid' }).eq('payout_id', payout.id)
      console.log(`[royalties] payout ${payout.id} marked paid by ${user.id}`)
      return NextResponse.json({ ok: true })
    }
    default: return fail('Unknown action')
  }
}
