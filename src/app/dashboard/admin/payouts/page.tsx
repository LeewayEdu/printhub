'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { RefreshCw } from 'lucide-react'

const statusColor: Record<string, string> = {
  pending: '#f59e0b', approved: '#3b82f6', paid: '#10b981', rejected: '#ef4444'
}

export default function PayoutsPage() {
  const router = useRouter()
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth'); return }
      const { data } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
      if (data?.role !== 'admin') { router.push('/dashboard'); return }
      fetchRequests()
    }
    check()
  }, [])

  const fetchRequests = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('payout_requests')
      .select('*, affiliates(referral_code, bank_name, account_number, account_name, profile_id, profiles(first_name, last_name, email))')
      .order('created_at', { ascending: false })
    if (data) setRequests(data)
    setLoading(false)
  }

  const updateStatus = async (id: string, status: string, note?: string) => {
    const { error } = await supabase.from('payout_requests').update({ status, note: note || null, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) { toast.error(error.message) } else {
      toast.success(`Request marked as ${status}`)
      fetchRequests()
    }
  }

  const filtered = requests.filter(r => filter === 'all' || r.status === filter)
  const pendingCount = requests.filter(r => r.status === 'pending').length

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap' as const, gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 22, marginBottom: 4, color: 'var(--text-primary)' }}>
            Payout Requests
            {pendingCount > 0 && (
              <span style={{ marginLeft: 10, background: 'var(--red)', color: 'white', fontSize: 12, fontWeight: 700, padding: '2px 10px', borderRadius: 20, fontFamily: 'Montserrat' }}>
                {pendingCount} pending
              </span>
            )}
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Manage affiliate payout requests.</p>
        </div>
        <button onClick={fetchRequests} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 600, fontSize: 13, cursor: 'pointer', color: 'var(--text-primary)' }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' as const }}>
        {['all', 'pending', 'approved', 'paid', 'rejected'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: '6px 16px', borderRadius: 20, border: `1px solid ${filter === f ? (statusColor[f] || 'var(--red)') : 'var(--border-color)'}`, background: filter === f ? `${statusColor[f] || 'var(--red)'}15` : 'var(--bg-card)', color: filter === f ? (statusColor[f] || 'var(--red)') : 'var(--text-secondary)', fontSize: 13, fontWeight: filter === f ? 700 : 400, fontFamily: 'Montserrat', cursor: 'pointer', textTransform: 'capitalize' as const }}>
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center' as const, padding: 60, color: 'var(--text-secondary)' }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center' as const, padding: 60 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>💸</div>
          <div style={{ fontFamily: 'Montserrat', fontWeight: 600, fontSize: 16, color: 'var(--text-primary)' }}>No {filter === 'all' ? '' : filter} requests</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
          {filtered.map(req => {
            const aff = req.affiliates
            const prof = aff?.profiles
            return (
              <div key={req.id} style={{ background: 'var(--bg-card)', border: `1px solid ${req.status === 'pending' ? '#f59e0b40' : 'var(--border-color)'}`, borderRadius: 14, padding: '20px 24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: 16, alignItems: 'center', flexWrap: 'wrap' as const }} className="payout-grid">
                  <div>
                    <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', marginBottom: 2 }}>
                      {prof?.first_name} {prof?.last_name}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{prof?.email}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                      {aff?.bank_name} · {aff?.account_number} · {aff?.account_name}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>Amount</div>
                    <div style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 18, color: 'var(--red)' }}>₦{Number(req.amount).toLocaleString()}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>Requested</div>
                    <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{new Date(req.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                  </div>
                  <div>
                    <span style={{ display: 'inline-flex', padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, fontFamily: 'Montserrat', background: `${statusColor[req.status]}20`, color: statusColor[req.status] }}>
                      {req.status}
                    </span>
                  </div>
                  {req.status === 'pending' && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => updateStatus(req.id, 'paid')}
                        style={{ padding: '8px 16px', background: '#10b981', color: 'white', border: 'none', borderRadius: 8, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                        Mark Paid
                      </button>
                      <button onClick={() => updateStatus(req.id, 'rejected')}
                        style={{ padding: '8px 12px', background: 'var(--red-pale)', border: '1px solid var(--red-light)', borderRadius: 8, cursor: 'pointer', color: 'var(--red)', fontFamily: 'Montserrat', fontWeight: 600, fontSize: 12 }}>
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
      <style>{`@media (max-width: 900px) { .payout-grid { grid-template-columns: 1fr 1fr !important; } }`}</style>
    </div>
  )
}