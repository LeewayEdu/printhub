'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, X, Zap } from 'lucide-react'
import toast from 'react-hot-toast'

const empty = {
  title: 'Flash Sale',
  label: '🔥 FLASH SALE',
  description: '',
  promo_code: '',
  ends_at: '',
  is_active: false,
}

export default function FlashSalePage() {
  const router = useRouter()
  const [sales, setSales] = useState<any[]>([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth'); return }
      const { data } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
      if (!['admin','super_admin'].includes(data?.role)) { router.push('/dashboard'); return }
      fetchSales()
    }
    check()
  }, [])

  const fetchSales = async () => {
    const { data } = await supabase.from('flash_sale').select('*').order('created_at', { ascending: false })
    if (!data) return

    // AUTO-DEACTIVATE EXPIRED SALES — previously, is_active stayed true
    // in the database forever once a sale's countdown passed; only the
    // customer-facing banner correctly hid itself (by checking ends_at
    // client-side), but the underlying row never got corrected. That
    // meant the database itself could keep claiming an expired sale was
    // "active" indefinitely unless a human manually clicked Deactivate.
    // This silently flips any expired-but-still-active row to false
    // every time this page loads, so the database stays accurate without
    // depending on anyone remembering to turn it off.
    const expiredButActive = data.filter(s => s.is_active && new Date(s.ends_at) < new Date())
    if (expiredButActive.length > 0) {
      await supabase
        .from('flash_sale')
        .update({ is_active: false })
        .in('id', expiredButActive.map(s => s.id))
      // Reflect the correction locally without an extra round-trip fetch
      data.forEach(s => { if (expiredButActive.find(e => e.id === s.id)) s.is_active = false })
    }

    setSales(data)
  }

  const handleSave = async () => {
    if (!form.description) { toast.error('Description is required'); return }
    if (!form.ends_at) { toast.error('End date/time is required'); return }
    setSaving(true)
    // If activating this one, deactivate all others first
    if (form.is_active) {
      await supabase.from('flash_sale').update({ is_active: false }).neq('id', '00000000-0000-0000-0000-000000000000')
    }
    const { error } = await supabase.from('flash_sale').insert({
      ...form,
      promo_code: form.promo_code || null,
      ends_at: new Date(form.ends_at).toISOString(),
    })
    if (error) { toast.error(error.message) } else {
      toast.success('Flash sale created!')
      setShowModal(false)
      setForm(empty)
      fetchSales()
    }
    setSaving(false)
  }

  const toggleActive = async (id: string, current: boolean) => {
    if (!current) {
      // Deactivate all, then activate this one
      await supabase.from('flash_sale').update({ is_active: false }).neq('id', '00000000-0000-0000-0000-000000000000')
    }
    await supabase.from('flash_sale').update({ is_active: !current }).eq('id', id)
    fetchSales()
    toast.success(!current ? 'Flash sale activated on homepage!' : 'Flash sale deactivated')
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this flash sale?')) return
    await supabase.from('flash_sale').delete().eq('id', id)
    toast.success('Deleted')
    fetchSales()
  }

  const isExpired = (ends_at: string) => new Date(ends_at) < new Date()

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap' as const, gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 22, marginBottom: 4, color: 'var(--text-primary)' }}>Flash Sale</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Create countdown timers that appear on the homepage. Only one can be active at a time.</p>
        </div>
        <button onClick={() => { setForm(empty); setShowModal(true) }}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: 'var(--red)', color: 'white', border: 'none', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
          <Plus size={16} /> New Flash Sale
        </button>
      </div>

      {/* Active indicator */}
      {sales.some(s => s.is_active && !isExpired(s.ends_at)) ? (
        <div style={{ background: '#d1fae5', border: '1px solid #34d399', borderRadius: 10, padding: '12px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Zap size={16} color="#059669" />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#065f46' }}>
            A flash sale is live on the homepage right now
          </span>
        </div>
      ) : (
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 10, padding: '12px 18px', marginBottom: 20 }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>No active flash sale. Create one and toggle it on to show the countdown on the homepage.</span>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 14 }}>
        {sales.map(sale => (
          <div key={sale.id} style={{ background: 'var(--bg-card)', border: `2px solid ${sale.is_active && !isExpired(sale.ends_at) ? '#10b981' : 'var(--border-color)'}`, borderRadius: 14, padding: '20px 24px', display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' as const }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' as const }}>
                <span style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>{sale.label} — {sale.description}</span>
                {sale.promo_code && (
                  <span style={{ background: '#fef3c7', border: '1px solid #fbbf24', color: '#92400e', fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20, fontFamily: 'Montserrat' }}>
                    CODE: {sale.promo_code}
                  </span>
                )}
                {isExpired(sale.ends_at) && (
                  <span style={{ background: '#fee2e2', color: '#991b1b', fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20, fontFamily: 'Montserrat' }}>EXPIRED</span>
                )}
                {sale.is_active && !isExpired(sale.ends_at) && (
                  <span style={{ background: '#d1fae5', color: '#065f46', fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20, fontFamily: 'Montserrat' }}>● LIVE</span>
                )}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                Ends: {new Date(sale.ends_at).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <button onClick={() => toggleActive(sale.id, sale.is_active)}
                style={{ padding: '8px 16px', background: sale.is_active ? '#f3f4f6' : 'var(--red)', color: sale.is_active ? 'var(--text-primary)' : 'white', border: '1px solid var(--border-color)', borderRadius: 8, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                {sale.is_active ? 'Deactivate' : 'Go Live'}
              </button>
              <button onClick={() => handleDelete(sale.id)}
                style={{ padding: '8px 10px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: 8, cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        {sales.length === 0 && (
          <div style={{ textAlign: 'center' as const, padding: 48, color: 'var(--text-secondary)', fontSize: 14 }}>
            No flash sales yet. Create your first one.
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className="admin-modal" style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 520, padding: 32, boxShadow: '0 24px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <h2 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 18, color: '#1A1A1A' }}>New Flash Sale</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: '#444' }}>Banner Label</label>
                <input value={form.label} onChange={e => setForm(p => ({ ...p, label: e.target.value }))}
                  placeholder="e.g. 🔥 FLASH SALE" className="form-input" />
                <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>Shown in the badge above the countdown</div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: '#444' }}>Description *</label>
                <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="e.g. 20% off all Banner orders this weekend" className="form-input" />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: '#444' }}>Promo Code (optional)</label>
                <input value={form.promo_code} onChange={e => setForm(p => ({ ...p, promo_code: e.target.value.toUpperCase() }))}
                  placeholder="e.g. BANNER20" className="form-input"
                  style={{ textTransform: 'uppercase' as const }} />
                <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>Displayed on the homepage banner. Must also exist in Promo Codes.</div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: '#444' }}>Countdown Ends At *</label>
                <input type="datetime-local" value={form.ends_at} onChange={e => setForm(p => ({ ...p, ends_at: e.target.value }))}
                  className="form-input" />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="checkbox" id="active" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))}
                  style={{ width: 16, height: 16, accentColor: 'var(--red)', cursor: 'pointer' }} />
                <label htmlFor="active" style={{ fontSize: 13, color: '#444', cursor: 'pointer', fontWeight: 600 }}>
                  Make live immediately (will deactivate any current flash sale)
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
              <button onClick={() => setShowModal(false)}
                style={{ flex: 1, padding: 12, background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 600, fontSize: 14, cursor: 'pointer', color: '#444' }}>
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                style={{ flex: 2, padding: 12, background: saving ? '#ccc' : 'var(--red)', color: 'white', border: 'none', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Saving...' : 'Create Flash Sale'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}