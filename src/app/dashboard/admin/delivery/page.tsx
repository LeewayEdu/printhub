'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, X } from 'lucide-react'
import toast from 'react-hot-toast'

interface DeliverySetting {
  id: string
  type: 'pickup' | 'local' | 'interstate'
  name: string
  address?: string
  price: number
  state?: string
  is_active: boolean
  sort_order: number
}

const TYPE_LABELS = {
  pickup: { label: 'Pickup', color: '#10b981', icon: '🏪' },
  local: { label: 'Local Delivery', color: '#3b82f6', icon: '🛵' },
  interstate: { label: 'Interstate Waybill', color: '#8b5cf6', icon: '🚚' },
}

const empty = { type: 'local' as 'pickup' | 'local' | 'interstate', name: '', address: '', price: 0, state: '', is_active: true, sort_order: 0 }

export default function DeliverySettingsPage() {
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [settings, setSettings] = useState<DeliverySetting[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<DeliverySetting | null>(null)
  const [form, setForm] = useState<{ type: 'pickup' | 'local' | 'interstate', name: string, address: string, price: number, state: string, is_active: boolean, sort_order: number }>(empty)
  const [activeType, setActiveType] = useState<'pickup' | 'local' | 'interstate'>('pickup')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth'); return }
      const { data } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
      if (data?.role !== 'admin') { router.push('/dashboard'); return }
      setIsAdmin(true)
      fetchSettings()
    }
    check()
  }, [])

  const fetchSettings = async () => {
    setLoading(true)
    const { data } = await supabase.from('delivery_settings').select('*').order('type').order('sort_order')
    if (data) setSettings(data as DeliverySetting[])
    setLoading(false)
  }

  const openAdd = () => {
    setEditing(null)
    setForm({ ...empty, type: activeType })
    setShowModal(true)
  }

  const openEdit = (s: DeliverySetting) => {
    setEditing(s)
    setForm({ type: s.type, name: s.name, address: s.address || '', price: s.price, state: s.state || '', is_active: s.is_active, sort_order: s.sort_order })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.name) { toast.error('Name is required'); return }
    setSaving(true)
    const payload = { type: form.type, name: form.name, address: form.address || null, price: form.price, state: form.state || null, is_active: form.is_active, sort_order: form.sort_order }

    if (editing) {
      const { error } = await supabase.from('delivery_settings').update(payload).eq('id', editing.id)
      if (error) { toast.error(error.message) } else { toast.success('Updated!') }
    } else {
      const { error } = await supabase.from('delivery_settings').insert(payload)
      if (error) { toast.error(error.message) } else { toast.success('Added!') }
    }
    setSaving(false)
    setShowModal(false)
    fetchSettings()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this delivery option?')) return
    await supabase.from('delivery_settings').delete().eq('id', id)
    toast.success('Deleted')
    fetchSettings()
  }

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('delivery_settings').update({ is_active: !current }).eq('id', id)
    fetchSettings()
  }

  const filtered = settings.filter(s => s.type === activeType)

  if (!isAdmin) return null

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 22, marginBottom: 4, color: 'var(--text-primary)' }}>Delivery Settings</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Manage pickup locations, local delivery zones, and interstate waybill rates.</p>
      </div>

      {/* Type tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' as const }}>
        {(Object.entries(TYPE_LABELS) as [keyof typeof TYPE_LABELS, typeof TYPE_LABELS[keyof typeof TYPE_LABELS]][]).map(([type, info]) => (
          <button key={type} onClick={() => setActiveType(type)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px', borderRadius: 9, border: `2px solid ${activeType === type ? info.color : 'var(--border-color)'}`, background: activeType === type ? `${info.color}15` : 'var(--bg-card)', color: activeType === type ? info.color : 'var(--text-secondary)', fontFamily: 'Montserrat', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
            {info.icon} {info.label}
            <span style={{ background: activeType === type ? info.color : 'var(--bg-secondary)', color: activeType === type ? 'white' : 'var(--text-secondary)', borderRadius: 10, padding: '1px 7px', fontSize: 11 }}>
              {settings.filter(s => s.type === type).length}
            </span>
          </button>
        ))}
        <button onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: 'var(--red)', color: 'white', border: 'none', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 13, cursor: 'pointer', marginLeft: 'auto' }}>
          <Plus size={15} /> Add {TYPE_LABELS[activeType].label}
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center' as const, padding: 60, color: 'var(--text-secondary)' }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center' as const, padding: 60 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>{TYPE_LABELS[activeType].icon}</div>
          <div style={{ fontFamily: 'Montserrat', fontWeight: 600, fontSize: 16, color: 'var(--text-primary)', marginBottom: 8 }}>No {TYPE_LABELS[activeType].label.toLowerCase()} options yet</div>
          <button onClick={openAdd} style={{ background: 'var(--red)', color: 'white', border: 'none', borderRadius: 9, padding: '10px 24px', fontFamily: 'Montserrat', fontWeight: 700, cursor: 'pointer' }}>
            Add first option
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
          {filtered.map(s => (
            <div key={s.id} style={{ background: 'var(--bg-card)', border: `1px solid ${s.is_active ? 'var(--border-color)' : 'var(--border-color)'}`, borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, opacity: s.is_active ? 1 : 0.5 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1 }}>
                <span style={{ fontSize: 22 }}>{TYPE_LABELS[s.type].icon}</span>
                <div>
                  <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', marginBottom: 2 }}>{s.name}</div>
                  {s.address && <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{s.address}</div>}
                  {s.state && <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{s.state} State</div>}
                </div>
              </div>
              <div style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 18, color: s.price === 0 ? '#10b981' : 'var(--text-primary)', flexShrink: 0 }}>
                {s.price === 0 ? 'FREE' : `₦${Number(s.price).toLocaleString()}`}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <button onClick={() => toggleActive(s.id, s.is_active)}
                  style={{ padding: '5px 12px', borderRadius: 20, border: `1px solid ${s.is_active ? '#10b981' : 'var(--border-color)'}`, background: s.is_active ? '#10b98115' : 'none', color: s.is_active ? '#10b981' : 'var(--text-secondary)', fontSize: 12, fontWeight: 600, fontFamily: 'Montserrat', cursor: 'pointer' }}>
                  {s.is_active ? 'Active' : 'Inactive'}
                </button>
                <button onClick={() => openEdit(s)} style={{ background: 'none', border: '1px solid var(--border-color)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: 'var(--text-primary)' }}>
                  <Pencil size={14} />
                </button>
                <button onClick={() => handleDelete(s.id)} style={{ background: 'none', border: '1px solid var(--red-light)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: 'var(--red)' }}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 16, width: '100%', maxWidth: 480, padding: 28, boxShadow: '0 24px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <h2 style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 18, color: 'var(--text-primary)' }}>
                {editing ? 'Edit' : 'Add'} {TYPE_LABELS[form.type].label}
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 16 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6, color: 'var(--text-primary)' }}>Type</label>
                <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as any }))} className="form-input" style={{ cursor: 'pointer' }}>
                  <option value="pickup">Pickup Location</option>
                  <option value="local">Local Delivery</option>
                  <option value="interstate">Interstate Waybill</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6, color: 'var(--text-primary)' }}>Name *</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder={form.type === 'pickup' ? 'e.g. Karu Office' : form.type === 'local' ? 'e.g. Maitama' : 'e.g. Lagos'} className="form-input" />
              </div>
              {form.type === 'pickup' && (
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6, color: 'var(--text-primary)' }}>Address</label>
                  <input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} placeholder="Full address" className="form-input" />
                </div>
              )}
              {form.type === 'interstate' && (
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6, color: 'var(--text-primary)' }}>State</label>
                  <input value={form.state} onChange={e => setForm(p => ({ ...p, state: e.target.value }))} placeholder="e.g. Lagos" className="form-input" />
                </div>
              )}
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6, color: 'var(--text-primary)' }}>Price (₦) {form.type === 'pickup' ? '— 0 for free' : ''}</label>
                <input type="number" value={form.price || ''} onChange={e => setForm(p => ({ ...p, price: Number(e.target.value) }))} placeholder="e.g. 2500" className="form-input" />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6, color: 'var(--text-primary)' }}>Sort order</label>
                <input type="number" value={form.sort_order || ''} onChange={e => setForm(p => ({ ...p, sort_order: Number(e.target.value) }))} placeholder="e.g. 1" className="form-input" />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} style={{ accentColor: 'var(--red)', width: 16, height: 16 }} />
                <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>Active (visible to customers)</span>
              </label>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 600, fontSize: 14, cursor: 'pointer', color: 'var(--text-primary)' }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: '12px', background: saving ? '#ccc' : 'var(--red)', color: 'white', border: 'none', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Saving...' : editing ? 'Update' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}