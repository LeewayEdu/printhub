'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { CheckCircle, XCircle, Star, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ReviewsAdminPage() {
  const router = useRouter()
  const [reviews, setReviews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'pending' | 'approved' | 'all'>('pending')

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth'); return }
      const { data } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
      if (data?.role !== 'admin') { router.push('/dashboard'); return }
      fetch()
    }
    check()
  }, [])

  const fetch = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('product_reviews')
      .select('*, products(name, category), profiles(first_name, last_name, email)')
      .order('created_at', { ascending: false })
    if (data) setReviews(data)
    setLoading(false)
  }

  const approve = async (id: string) => {
    await supabase.from('product_reviews').update({ is_approved: true }).eq('id', id)
    toast.success('Review approved — rating updated on product')
    fetch()
  }

  const reject = async (id: string) => {
    if (!confirm('Delete this review?')) return
    await supabase.from('product_reviews').delete().eq('id', id)
    toast.success('Review deleted')
    fetch()
  }

  const filtered = reviews.filter(r => {
    if (filter === 'pending') return !r.is_approved
    if (filter === 'approved') return r.is_approved
    return true
  })

  const pendingCount = reviews.filter(r => !r.is_approved).length

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap' as const, gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 22, marginBottom: 4, color: 'var(--text-primary)' }}>Product Reviews</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            Approve reviews to publish them and update product ratings.
            {pendingCount > 0 && <span style={{ marginLeft: 8, background: '#fee2e2', color: '#dc2626', fontWeight: 700, padding: '2px 8px', borderRadius: 10, fontSize: 12 }}>{pendingCount} pending</span>}
          </p>
        </div>
        <button onClick={fetch} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'var(--light)', border: '1px solid var(--border)', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {([['pending', 'Pending'], ['approved', 'Approved'], ['all', 'All']] as const).map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)}
            style={{ padding: '6px 16px', borderRadius: 20, border: `1px solid ${filter === val ? 'var(--red)' : 'var(--border)'}`, background: filter === val ? 'var(--red-pale)' : 'white', color: filter === val ? 'var(--red)' : 'var(--gray)', fontSize: 13, fontWeight: filter === val ? 700 : 400, fontFamily: 'Montserrat', cursor: 'pointer' }}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center' as const, padding: 60, color: 'var(--gray)' }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center' as const, padding: 60 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⭐</div>
          <div style={{ fontFamily: 'Montserrat', fontWeight: 600, fontSize: 16, color: 'var(--text-primary)' }}>No {filter} reviews</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 12 }}>
          {filtered.map(review => (
            <div key={review.id} style={{ background: 'white', border: `1px solid ${!review.is_approved ? '#fbbf24' : 'var(--border)'}`, borderRadius: 12, padding: '18px 24px', display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' as const }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                {/* Stars */}
                <div style={{ display: 'flex', gap: 2, marginBottom: 8 }}>
                  {[1,2,3,4,5].map(s => <Star key={s} size={14} fill={s <= review.rating ? '#f59e0b' : 'none'} color={s <= review.rating ? '#f59e0b' : '#d1d5db'} />)}
                  <span style={{ fontSize: 12, color: 'var(--gray)', marginLeft: 6 }}>{review.rating}/5</span>
                </div>

                {/* Comment */}
                {review.comment && (
                  <p style={{ fontSize: 14, color: 'var(--dark)', lineHeight: 1.6, marginBottom: 10, fontStyle: 'italic' }}>"{review.comment}"</p>
                )}

                {/* Meta */}
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' as const }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--gray)', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 2 }}>Customer</div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{review.profiles?.first_name} {review.profiles?.last_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--gray)' }}>{review.profiles?.email}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--gray)', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 2 }}>Product</div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{review.products?.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--gray)' }}>{review.products?.category}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--gray)', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 2 }}>Date</div>
                    <div style={{ fontSize: 13 }}>{new Date(review.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                  </div>
                  {review.is_verified && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CheckCircle size={13} color="#10b981" />
                      <span style={{ fontSize: 11, color: '#10b981', fontWeight: 600 }}>Verified Purchase</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
                {!review.is_approved ? (
                  <>
                    <button onClick={() => approve(review.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#10b981', color: 'white', border: 'none', borderRadius: 8, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                      <CheckCircle size={13} /> Approve
                    </button>
                    <button onClick={() => reject(review.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: 8, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                      <XCircle size={13} /> Reject
                    </button>
                  </>
                ) : (
                  <>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: '#059669' }}>
                      <CheckCircle size={13} /> Published
                    </span>
                    <button onClick={() => reject(review.id)}
                      style={{ padding: '6px 12px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, fontFamily: 'Montserrat', fontWeight: 600, fontSize: 11, cursor: 'pointer', color: 'var(--gray)' }}>
                      Remove
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}