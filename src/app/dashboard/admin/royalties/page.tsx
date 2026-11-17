'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase/client'

const card: React.CSSProperties = { background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }
const btn: React.CSSProperties = { padding: '9px 16px', borderRadius: 8, border: 'none', background: 'var(--red)', color: '#fff', fontFamily: 'Montserrat', fontWeight: 700, fontSize: 13, cursor: 'pointer' }
const ghost: React.CSSProperties = { ...btn, background: 'white', color: 'var(--text-primary)', border: '1px solid var(--border)' }
const money = (n: number, c: string) => (c === 'USD' ? '$' : '₦') + Number(n).toLocaleString(c === 'USD' ? 'en-US' : 'en-NG', { minimumFractionDigits: c === 'USD' ? 2 : 0, maximumFractionDigits: 2 })

async function call(body: object) {
  const { data: { session } } = await supabase.auth.getSession()
  return fetch('/api/admin/royalties', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` }, body: JSON.stringify(body) })
}

export default function RoyaltiesPage() {
  const router = useRouter()
  const [ok, setOk] = useState(false)
  const [month, setMonth] = useState('')
  const [data, setData] = useState<any>(null)
  const [settle, setSettle] = useState({ orderId: '', naira: '' })
  const [refs, setRefs] = useState<Record<string, { reference: string; notes: string }>>({})

  const load = useCallback(async () => {
    const res = await call({ action: 'report', month: month || undefined }); const j = await res.json().catch(() => ({}))
    if (res.ok) setData(j); else toast.error(j.error || 'Could not load the report')
  }, [month])

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth'); return }
      const { data: p } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
      if (!['admin', 'super_admin'].includes(p?.role)) { router.push('/dashboard'); return }
      setOk(true)
    })()
  }, [router])
  useEffect(() => { if (ok) load() }, [ok, load])

  const csv = async () => {
    const res = await call({ action: 'csv', month: month || undefined })
    if (!res.ok) { toast.error('Could not export'); return }
    const url = URL.createObjectURL(await res.blob())
    const a = document.createElement('a'); a.href = url; a.download = `royalties-${month || 'all'}.csv`; a.click(); URL.revokeObjectURL(url)
  }
  const payout = async (authorId: string, currency: string) => {
    const res = await call({ action: 'create_payout', authorId, currency }); const j = await res.json().catch(() => ({}))
    if (!res.ok) { toast.error(j.error || 'Could not create the payout'); return }
    toast.success(`Payout created: ${money(j.total, currency)}`); load()
  }
  const recordSettlement = async () => {
    const res = await call({ action: 'record_settlement', orderId: settle.orderId.trim(), settledNgn: Number(settle.naira) }); const j = await res.json().catch(() => ({}))
    if (!res.ok) { toast.error(j.error || 'Could not record it'); return }
    toast.success(`Recorded. ${j.updated} ledger entr${j.updated === 1 ? 'y' : 'ies'} converted to naira.`); setSettle({ orderId: '', naira: '' }); load()
  }
  const markPaid = async (payoutId: string) => {
    const r = refs[payoutId] || { reference: '', notes: '' }
    const res = await call({ action: 'mark_paid', payoutId, reference: r.reference, notes: r.notes }); const j = await res.json().catch(() => ({}))
    if (!res.ok) { toast.error(j.error || 'Could not mark paid'); return }
    toast.success('Marked paid'); load()
  }

  if (!ok || !data) return <div role="status" style={{ padding: 40, textAlign: 'center' }}>Loading…</div>
  const authors = Array.from(new Map<string, any>(data.summary.map((s: any) => [`${s.author_id}|${s.currency}`, s])).values())

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div>
        <h1 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 22, marginBottom: 4 }}>Royalties</h1>
        <p style={{ fontSize: 13, color: 'var(--gray)' }}>Pending entries become payable after the hold period. Payouts need at least the minimum ({money(data.minimumPayout, 'NGN')}) payable. Test orders are never included.</p>
      </div>
      <div style={{ ...card, display: 'flex', gap: 12, alignItems: 'end', flexWrap: 'wrap' }}>
        <div><label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }} htmlFor="m">Month</label><input id="m" type="month" className="form-input" value={month} onChange={e => setMonth(e.target.value)} /></div>
        <button style={ghost} onClick={() => setMonth('')}>All months</button>
        <button style={btn} onClick={csv}>Export CSV</button>
      </div>

      <div style={card}>
        <h2 style={{ fontSize: 16, marginBottom: 10 }}>By author and month</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr style={{ textAlign: 'left', borderBottom: '2px solid var(--border)' }}>{['Author', 'Month', 'Entries', 'Gross', 'Fees', 'Net', 'Author share', 'Author share (₦)', 'Company share', 'Pending', 'Payable', 'Paid', 'Flagged'].map(h => <th key={h} style={{ padding: 8 }}>{h}</th>)}</tr></thead>
            <tbody>{data.summary.map((s: any) => (
              <tr key={`${s.author_id}${s.month}${s.currency}`} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: 8, fontWeight: 600 }}>{s.author_name}</td><td>{s.month}</td><td>{s.entries}</td>
                <td>{money(s.gross, s.currency)}</td><td>{money(s.payment_fee, s.currency)}</td><td>{money(s.net, s.currency)}</td>
                <td>{money(s.author_share, s.currency)}</td><td>{money(s.author_share_ngn, 'NGN')}</td><td>{money(s.company_share, s.currency)}</td>
                <td>{money(s.pending, s.currency)}</td><td>{money(s.payable, s.currency)}</td><td>{money(s.paid, s.currency)}</td>
                <td>{s.flagged ? <span style={{ color: '#b91c1c', fontWeight: 700 }}>{s.flagged} need print cost</span> : '-'}</td>
              </tr>))}</tbody>
          </table>
          {data.summary.length === 0 && <p style={{ padding: 20, textAlign: 'center', color: 'var(--gray)' }}>No royalty entries yet.</p>}
        </div>
      </div>

      <div style={card}>
        <h2 style={{ fontSize: 16, marginBottom: 4 }}>USD sales: record the naira Paystack settled</h2>
        <p style={{ fontSize: 12, color: 'var(--gray)', marginBottom: 10 }}>Authors are paid in naira at the rate actually received. Paste the full order id and the naira amount from your Paystack settlement. Until then USD entries are flagged "awaiting settlement" and are not payable.</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input aria-label="Order id" className="form-input" style={{ maxWidth: 340 }} placeholder="Order id" value={settle.orderId} onChange={e => setSettle(x => ({ ...x, orderId: e.target.value }))} />
          <input aria-label="Naira settled" className="form-input" style={{ maxWidth: 180 }} type="number" min={0} placeholder="Naira settled" value={settle.naira} onChange={e => setSettle(x => ({ ...x, naira: e.target.value }))} />
          <button style={btn} onClick={recordSettlement}>Record</button>
        </div>
      </div>

      <div style={card}>
        <h2 style={{ fontSize: 16, marginBottom: 10 }}>Create a payout</h2>
        {authors.length === 0 ? <p style={{ color: 'var(--gray)' }}>Nothing to pay yet.</p> : authors.map((a: any) => (
          <div key={`${a.author_id}${a.currency}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)', gap: 12, flexWrap: 'wrap' }}>
            <span><strong>{a.author_name}</strong> ({a.currency})</span>
            <button style={btn} onClick={() => payout(a.author_id, a.currency)}>Pay all payable</button>
          </div>))}
      </div>

      <div style={card}>
        <h2 style={{ fontSize: 16, marginBottom: 10 }}>Payout records</h2>
        {data.payouts.length === 0 && <p style={{ color: 'var(--gray)' }}>No payouts yet.</p>}
        {data.payouts.map((p: any) => (
          <div key={p.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <span><strong>{p.author_name}</strong> · {p.period} · {money(p.total, p.currency)}</span>
              <span style={{ fontWeight: 700, color: p.status === 'paid' ? '#166534' : '#b45309' }}>{p.status}{p.paid_at ? ` ${p.paid_at.slice(0, 10)}` : ''}{p.reference ? ` · ref ${p.reference}` : ''}</span>
            </div>
            {p.status === 'pending' && (
              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                <input aria-label="Payment reference" className="form-input" style={{ maxWidth: 220 }} placeholder="Payment reference" value={refs[p.id]?.reference || ''} onChange={e => setRefs(x => ({ ...x, [p.id]: { reference: e.target.value, notes: x[p.id]?.notes || '' } }))} />
                <input aria-label="Notes" className="form-input" style={{ maxWidth: 260 }} placeholder="Notes (optional)" value={refs[p.id]?.notes || ''} onChange={e => setRefs(x => ({ ...x, [p.id]: { reference: x[p.id]?.reference || '', notes: e.target.value } }))} />
                <button style={btn} onClick={() => markPaid(p.id)}>Mark paid</button>
              </div>)}
          </div>))}
      </div>
    </div>
  )
}
