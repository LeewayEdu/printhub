'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, X } from 'lucide-react'
import toast from 'react-hot-toast'

interface PromoCode {
  id: string; code: string; type: 'percentage' | 'flat'
  value: number; min_order: number; max_uses: number | null
  uses: number; is_active: boolean; expires_at: string | null
}

const empty = { code: '', type: 'percentage' as const, value: 0, min_order: 0, max_uses: null as number | null, is_active: true, expires_at: '' }

export default function PromosPage() {
  const router = useRouter()
  const [promos, setPromos] = useState<PromoCode[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth'); return }
      const { data } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
      if (data?.role !== 'admin') { router.push('/dashboard'); return }
      fetchPromos()
    }
    check()
  }, [])

  const fetchPromos = async () => {
    setLoading(true)
    const { data } = await supabase.from('promo_codes').select('*').order('created_at', { ascending: false })
    if (data) setPromos(data as PromoCode[])
    setLoading(false)
  }

  const handleSave = async () => {
    if (!form.code) { toast.error('Code is required'); return }
    if (!form.value) { toast.error('Value is required'); return }
    setSaving(true)
    const payload = {
      code: form.code.toUpperCase().trim(),
      type: form.type,
      value: form.value,
      min_order: form.min_order || 0,
      max_uses: form.max_uses || null,
      is_active: form.is_active,
      expires_at: form.expires_at || null,
    }
    const { error } = await supabase.from('promo_codes').insert(payload)
    if (error) { toast.error(error.message) } else { toast.success('Promo code created!'); setShowModal(false); fetchPromos() }
    setSaving(false)
  }

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('promo_codes').update({ is_active: !current }).eq('id', id)
    fetchPromos()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this promo code?')) return
    await supabase.from('promo_codes').delete().eq('id', id)
    toast.success('Deleted')
    fetchPromos()
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap' as const, gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 22, marginBottom: 4, color: 'var(--text-primary)' }}>Promo Codes</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{promos.length} promo codes</p>
        </div>
        <button onClick={() => { setForm(empty); setShowModal(true) }}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: 'var(--red)', color: 'white', border: 'none', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
          <Plus size={16} /> Create Code
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center' as const, padding: 60, color: 'var(--text-secondary)' }}>Loading...</div>
      ) : promos.length === 0 ? (
        <div style={{ textAlign: 'center' as const, padding: 60 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏷️</div>
          <div style={{ fontFamily: 'Montserrat', fontWeight: 600, fontSize: 16, color: 'var(--text-primary)', marginBottom: 8 }}>No promo codes yet</div>
          <button onClick={() => setShowModal(true)} style={{ background: 'var(--red)', color: 'white', border: 'none', borderRadius: 9, padding: '10px 24px', fontFamily: 'Montserrat', fontWeight: 700, cursor: 'pointer' }}>Create first code</button>
        </div>
      ) : (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 14, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' as const }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
                {['Code', 'Type', 'Value', 'Min Order', 'Uses', 'Expires', 'Status', ''].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left' as const, fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' as const, letterSpacing: '0.06em', fontFamily: 'Montserrat' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {promos.map(promo => (
                <tr key={promo.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '14px 16px', fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{promo.code}</td>
                  <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-secondary)', textTransform: 'capitalize' as const }}>{promo.type}</td>
                  <td style={{ padding: '14px 16px', fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, color: 'var(--red)' }}>
                    {promo.type === 'percentage' ? `${promo.value}%` : `₦${Number(promo.value).toLocaleString()}`}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>
                    {promo.min_order > 0 ? `₦${Number(promo.min_order).toLocaleString()}` : '—'}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>
                    {promo.uses}{promo.max_uses ? `/${promo.max_uses}` : ''}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>
                    {promo.expires_at ? new Date(promo.expires_at).toLocaleDateString('en-NG') : '—'}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <button onClick={() => toggleActive(promo.id, promo.is_active)}
                      style={{ padding: '4px 12px', borderRadius: 20, border: `1px solid ${promo.is_active ? '#10b981' : 'var(--border-color)'}`, background: promo.is_active ? '#10b98115' : 'none', color: promo.is_active ? '#10b981' : 'var(--text-secondary)', fontSize: 12, fontWeight: 600, fontFamily: 'Montserrat', cursor: 'pointer' }}>
                      {promo.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <button onClick={() => handleDelete(promo.id)}
                      style={{ background: 'none', border: '1px solid var(--red-light)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: 'var(--red)' }}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div style={{ position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 16, width: '100%', maxWidth: 460, padding: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <h2 style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 18, color: 'var(--text-primary)' }}>Create Promo Code</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 14 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6, color: 'var(--text-primary)' }}>Code *</label>
                <input value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="e.g. LAUNCH20" className="form-input" style={{ textTransform: 'uppercase' as const }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6, color: 'var(--text-primary)' }}>Type</label>
                  <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as any }))} className="form-input" style={{ cursor: 'pointer' }}>
                    <option value="percentage">Percentage (%)</option>
                    <option value="flat">Flat amount (₦)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6, color: 'var(--text-primary)' }}>Value *</label>
                  <input type="number" value={form.value || ''} onChange={e => setForm(p => ({ ...p, value: Number(e.target.value) }))} placeholder={form.type === 'percentage' ? 'e.g. 20' : 'e.g. 5000'} className="form-input" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6, color: 'var(--text-primary)' }}>Min order (₦)</label>
                  <input type="number" value={form.min_order || ''} onChange={e => setForm(p => ({ ...p, min_order: Number(e.target.value) }))} placeholder="0 = no minimum" className="form-input" />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6, color: 'var(--text-primary)' }}>Max uses</label>
                  <input type="number" value={form.max_uses || ''} onChange={e => setForm(p => ({ ...p, max_uses: e.target.value ? Number(e.target.value) : null }))} placeholder="Leave blank = unlimited" className="form-input" />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6, color: 'var(--text-primary)' }}>Expiry date (optional)</label>
                <input type="date" value={form.expires_at} onChange={e => setForm(p => ({ ...p, expires_at: e.target.value }))} className="form-input" />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} style={{ accentColor: 'var(--red)', width: 16, height: 16 }} />
                <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>Active immediately</span>
              </label>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 600, fontSize: 14, cursor: 'pointer', color: 'var(--text-primary)' }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: '12px', background: saving ? '#ccc' : 'var(--red)', color: 'white', border: 'none', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Creating...' : 'Create Code'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}