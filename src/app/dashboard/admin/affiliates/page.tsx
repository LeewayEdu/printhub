'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { TrendingUp, DollarSign, Users, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AdminAffiliatePage() {
  const router = useRouter()
  const [affiliates, setAffiliates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [commissions, setCommissions] = useState<Record<string, any[]>>({})
  const [filter, setFilter] = useState<'all' | 'active' | 'pending'>('all')

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth'); return }
      const { data } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
      if (!['admin', 'super_admin'].includes(data?.role)) { router.push('/dashboard'); return }
      load()
    }
    check()
  }, [])

  const load = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('affiliates')
      .select(`
        *,
        profiles (
          first_name, last_name, email, phone
        )
      `)
      .order('total_earnings', { ascending: false })
    if (data) setAffiliates(data)
    setLoading(false)
  }

  const loadCommissions = async (affiliateId: string) => {
    if (commissions[affiliateId]) return
    const { data } = await supabase
      .from('commissions')
      .select('*, orders(job_number, total_amount, created_at)')
      .eq('affiliate_id', affiliateId)
      .order('created_at', { ascending: false })
      .limit(20)
    if (data) setCommissions(prev => ({ ...prev, [affiliateId]: data }))
  }

  const toggleExpand = (id: string) => {
    if (expanded === id) {
      setExpanded(null)
    } else {
      setExpanded(id)
      loadCommissions(id)
    }
  }

  const markPaid = async (affiliateId: string, amount: number) => {
    if (!confirm(`Mark ₦${amount.toLocaleString()} as paid to this affiliate?`)) return
    const { error } = await supabase
      .from('affiliates')
      .update({
        pending_payout: 0,
        paid_out: supabase.rpc as any,
      })
      .eq('id', affiliateId)

    // Use raw update
    const aff = affiliates.find(a => a.id === affiliateId)
    if (!aff) return
    const { error: err } = await supabase
      .from('affiliates')
      .update({
        pending_payout: 0,
        paid_out: (aff.paid_out || 0) + amount,
      })
      .eq('id', affiliateId)

    if (err) { toast.error(err.message); return }

    // Mark all approved commissions as paid
    await supabase
      .from('commissions')
      .update({ status: 'paid' })
      .eq('affiliate_id', affiliateId)
      .eq('status', 'approved')

    toast.success(`₦${amount.toLocaleString()} marked as paid ✅`)
    load()
    setCommissions(prev => ({ ...prev, [affiliateId]: [] }))
  }

  // Summary stats
  const totalEarnings = affiliates.reduce((s, a) => s + Number(a.total_earnings || 0), 0)
  const totalPending = affiliates.reduce((s, a) => s + Number(a.pending_payout || 0), 0)
  const totalPaid = affiliates.reduce((s, a) => s + Number(a.paid_out || 0), 0)
  const activeAffiliates = affiliates.filter(a => a.is_active).length

  const filtered = affiliates.filter(a => {
    if (filter === 'active') return a.is_active && Number(a.total_earnings) > 0
    if (filter === 'pending') return Number(a.pending_payout) > 0
    return true
  })

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap' as const, gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 22, marginBottom: 4, color: 'var(--text-primary)' }}>Affiliate Overview</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{affiliates.length} registered affiliates</p>
        </div>
        <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'var(--light)', border: '1px solid var(--border)', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }} className="aff-stats-grid">
        {[
          { label: 'Total Affiliates', value: affiliates.length, sub: `${activeAffiliates} active`, icon: Users, color: '#3b82f6' },
          { label: 'Total Commissions', value: `₦${totalEarnings.toLocaleString()}`, sub: 'all time earned', icon: TrendingUp, color: '#10b981' },
          { label: 'Pending Payout', value: `₦${totalPending.toLocaleString()}`, sub: 'awaiting payment', icon: DollarSign, color: '#f59e0b' },
          { label: 'Total Paid Out', value: `₦${totalPaid.toLocaleString()}`, sub: 'already disbursed', icon: DollarSign, color: '#8b5cf6' },
        ].map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', fontFamily: 'Montserrat', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>{label}</div>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={18} color={color} />
              </div>
            </div>
            <div style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 22, color: 'var(--text-primary)', marginBottom: 4 }}>{value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {([['all', 'All Affiliates'], ['active', 'With Earnings'], ['pending', 'Pending Payout']] as const).map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)}
            style={{ padding: '6px 16px', borderRadius: 20, border: `1px solid ${filter === val ? 'var(--red)' : 'var(--border)'}`, background: filter === val ? 'rgba(192,57,43,0.08)' : 'white', color: filter === val ? 'var(--red)' : 'var(--gray)', fontSize: 13, fontWeight: filter === val ? 700 : 400, fontFamily: 'Montserrat', cursor: 'pointer' }}>
            {label}
            {val === 'pending' && totalPending > 0 && (
              <span style={{ marginLeft: 6, background: '#fef3c7', color: '#d97706', fontSize: 11, fontWeight: 700, padding: '1px 6px', borderRadius: 10 }}>
                {affiliates.filter(a => Number(a.pending_payout) > 0).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Affiliates table */}
      {loading ? (
        <div style={{ textAlign: 'center' as const, padding: 60, color: 'var(--gray)' }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center' as const, padding: 60 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
          <div style={{ fontFamily: 'Montserrat', fontWeight: 600, fontSize: 16 }}>No affiliates found</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
          {filtered.map(aff => {
            const profile = aff.profiles
            const isExpanded = expanded === aff.id
            const hasPending = Number(aff.pending_payout) > 0

            return (
              <div key={aff.id} style={{ background: 'white', border: `1px solid ${hasPending ? '#fbbf24' : 'var(--border)'}`, borderRadius: 12, overflow: 'hidden' }}>

                {/* Row */}
                <div onClick={() => toggleExpand(aff.id)}
                  style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer', flexWrap: 'wrap' as const }}>

                  {/* Avatar + name */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 180 }}>
                    <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, color: 'white' }}>
                        {profile?.first_name?.[0]?.toUpperCase() || '?'}
                      </span>
                    </div>
                    <div>
                      <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 13 }}>{profile?.first_name} {profile?.last_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--gray)' }}>{profile?.email}</div>
                    </div>
                  </div>

                  {/* Referral code */}
                  <div style={{ minWidth: 120 }}>
                    <div style={{ fontSize: 10, color: 'var(--gray)', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 2 }}>Referral Code</div>
                    <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 12, background: '#f3f4f6', padding: '2px 8px', borderRadius: 6, display: 'inline-block' }}>{aff.referral_code}</div>
                  </div>

                  {/* Stats */}
                  {[
                    { label: 'Total Earned', value: `₦${Number(aff.total_earnings || 0).toLocaleString()}`, color: '#10b981' },
                    { label: 'Pending', value: `₦${Number(aff.pending_payout || 0).toLocaleString()}`, color: hasPending ? '#d97706' : 'var(--gray)' },
                    { label: 'Paid Out', value: `₦${Number(aff.paid_out || 0).toLocaleString()}`, color: '#6b7280' },
                    { label: 'Referrals', value: aff.total_referrals || 0, color: '#3b82f6' },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ minWidth: 90 }}>
                      <div style={{ fontSize: 10, color: 'var(--gray)', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 2 }}>{label}</div>
                      <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 13, color }}>{value}</div>
                    </div>
                  ))}

                  {/* Bank details */}
                  <div style={{ flex: 1, minWidth: 140 }}>
                    <div style={{ fontSize: 10, color: 'var(--gray)', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 2 }}>Bank Details</div>
                    {aff.bank_name ? (
                      <div style={{ fontSize: 11, color: 'var(--dark)', lineHeight: 1.5 }}>
                        {aff.bank_name}<br />
                        {aff.account_number} · {aff.account_name}
                      </div>
                    ) : (
                      <div style={{ fontSize: 11, color: '#9ca3af', fontStyle: 'italic' }}>Not provided</div>
                    )}
                  </div>

                  {/* Pay button */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {hasPending && (
                      <button onClick={e => { e.stopPropagation(); markPaid(aff.id, Number(aff.pending_payout)) }}
                        style={{ padding: '7px 14px', background: '#10b981', color: 'white', border: 'none', borderRadius: 8, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 12, cursor: 'pointer', flexShrink: 0 }}>
                        Pay ₦{Number(aff.pending_payout).toLocaleString()}
                      </button>
                    )}
                    {isExpanded ? <ChevronUp size={16} color="var(--gray)" /> : <ChevronDown size={16} color="var(--gray)" />}
                  </div>
                </div>

                {/* Expanded commissions */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid var(--border)', background: 'var(--light)', padding: '16px 20px' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 12 }}>
                      Recent Commissions
                    </div>
                    {!commissions[aff.id] ? (
                      <div style={{ fontSize: 13, color: 'var(--gray)' }}>Loading...</div>
                    ) : commissions[aff.id].length === 0 ? (
                      <div style={{ fontSize: 13, color: 'var(--gray)', fontStyle: 'italic' }}>No commissions yet</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
                        {commissions[aff.id].map((c: any) => (
                          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '8px 12px', background: 'white', borderRadius: 8, border: '1px solid var(--border)', flexWrap: 'wrap' as const }}>
                            <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 12 }}>
                              {c.orders?.job_number || c.order_id?.slice(0, 8)}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--gray)' }}>
                              Order: ₦{Number(c.order_total).toLocaleString()}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--gray)' }}>
                              Rate: {(Number(c.rate) * 100).toFixed(0)}%
                            </div>
                            <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 13, color: '#10b981' }}>
                              +₦{Number(c.amount).toLocaleString()}
                            </div>
                            <div style={{ marginLeft: 'auto', fontSize: 11, padding: '2px 8px', borderRadius: 10, fontWeight: 600,
                              background: c.status === 'paid' ? '#d1fae5' : c.status === 'approved' ? '#fef3c7' : '#f3f4f6',
                              color: c.status === 'paid' ? '#065f46' : c.status === 'approved' ? '#92400e' : '#6b7280' }}>
                              {c.status}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--gray)' }}>
                              {new Date(c.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 900px) { .aff-stats-grid { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 500px) { .aff-stats-grid { grid-template-columns: 1fr !important; } }
      ` }} />
    </div>
  )
}