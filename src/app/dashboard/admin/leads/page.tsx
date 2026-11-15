'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

// Statuses an admin can move a lead through (the table default is 'new').
const STATUSES = ['new', 'contacted', 'quoted', 'won', 'lost']

interface Lead {
  id: string
  created_at: string
  source: string | null
  name: string | null
  phone: string | null
  email?: string | null
  status: string | null
  product_interest?: string | null
  quantity?: number | null
  notes?: string | null
  conversation?: unknown
}

export default function AdminLeadsPage() {
  const router = useRouter()
  const [allowed, setAllowed] = useState(false)
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth'); return }
      const { data } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
      if (!['admin', 'super_admin'].includes(data?.role)) { router.push('/dashboard'); return }
      setAllowed(true)
      // Read through the server route (service key), not straight from the browser
      const res = await fetch('/api/admin/leads', { headers: { Authorization: `Bearer ${session.access_token}` } })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) setError(json.error || `HTTP ${res.status}`)
      else setLeads((json.leads || []) as Lead[])
      setLoading(false)
    }
    init()
  }, [router])

  const setStatus = async (id: string, status: string) => {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/admin/leads', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
      body: JSON.stringify({ id, status }),
    })
    if (!res.ok) { toast.error('Could not update status'); return }
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l))
  }

  if (!allowed) return null

  const shown = leads.filter(l => filter === 'all' || (l.status || 'new') === filter)
  const detail = (l: Lead) => {
    if (l.notes) return l.notes
    if (typeof l.conversation === 'string') return l.conversation
    return ''
  }

  return (
    <div>
      <h1 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 24, marginBottom: 16 }}>Leads</h1>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {['all', ...STATUSES].map(s => (
          <button key={s} onClick={() => setFilter(s)} aria-pressed={filter === s}
            style={{ padding: '7px 14px', borderRadius: 20, border: `1.5px solid ${filter === s ? 'var(--red)' : 'var(--border-color)'}`, background: filter === s ? 'var(--red)' : 'var(--bg-card)', color: filter === s ? 'white' : 'var(--text-primary)', fontFamily: 'Montserrat', fontWeight: 600, fontSize: 12, cursor: 'pointer', textTransform: 'capitalize' }}>
            {s}{s !== 'all' ? ` (${leads.filter(l => (l.status || 'new') === s).length})` : ` (${leads.length})`}
          </button>
        ))}
      </div>

      {loading && <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Loading…</p>}
      {error && (
        <p role="alert" style={{ fontSize: 14, color: '#b91c1c' }}>
          Could not load leads: {error}.
        </p>
      )}
      {!loading && !error && shown.length === 0 && <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>No leads {filter === 'all' ? 'yet' : `with status "${filter}"`}.</p>}

      <div style={{ display: 'grid', gap: 10 }}>
        {shown.map(l => (
          <div key={l.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14 }}>
                {l.product_interest || l.name || l.phone || 'Lead'}
                {l.quantity ? <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}> · qty {l.quantity}</span> : null}
              </div>
              <select aria-label="Lead status" value={l.status || 'new'} onChange={e => setStatus(l.id, e.target.value)}
                className="form-input" style={{ width: 130, fontSize: 13, textTransform: 'capitalize' }}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
              {new Date(l.created_at).toLocaleString('en-NG')} · source: {l.source || 'unknown'}
              {l.name ? ` · ${l.name}` : ''}{l.phone ? ` · ${l.phone}` : ''}{l.email ? ` · ${l.email}` : ''}
            </div>
            {detail(l) && <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 13, color: 'var(--text-primary)', marginTop: 8 }}>{detail(l)}</pre>}
          </div>
        ))}
      </div>
    </div>
  )
}
