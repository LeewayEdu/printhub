'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, X, Save } from 'lucide-react'
import toast from 'react-hot-toast'

interface DesignAddon {
  id: string
  name: string
  description: string | null
  price: number
  is_active: boolean
  created_at: string
}

const emptyForm = { name: '', description: '', price: '' as number | '' }

export default function DesignAddonsPage() {
  const router = useRouter()
  const [addons, setAddons] = useState<DesignAddon[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<DesignAddon | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

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
      .from('design_addons')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setAddons(data)
    setLoading(false)
  }

  const openAdd = () => {
    setEditing(null)
    setForm(emptyForm)
    setShowModal(true)
  }

  const openEdit = (addon: DesignAddon) => {
    setEditing(addon)
    setForm({ name: addon.name, description: addon.description || '', price: addon.price })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return }
    if (!form.price || Number(form.price) <= 0) { toast.error('Price must be greater than 0'); return }
    setSaving(true)
    const payload = {
      name: form.name.trim(),
      description: (form.description as string).trim() || null,
      price: Number(form.price),
    }
    if (editing) {
      const { error } = await supabase.from('design_addons').update(payload).eq('id', editing.id)
      if (error) { toast.error(error.message); setSaving(false); return }
      toast.success('Add-on updated')
    } else {
      const { error } = await supabase.from('design_addons').insert({ ...payload, is_active: true })
      if (error) { toast.error(error.message); setSaving(false); return }
      toast.success('Add-on created')
    }
    setSaving(false)
    setShowModal(false)
    load()
  }

  const toggleActive = async (addon: DesignAddon) => {
    setTogglingId(addon.id)
    const { error } = await supabase.from('design_addons').update({ is_active: !addon.is_active }).eq('id', addon.id)
    if (error) { toast.error(error.message) } else {
      setAddons(prev => prev.map(a => a.id === addon.id ? { ...a, is_active: !addon.is_active } : a))
      toast.success(addon.is_active ? 'Add-on disabled' : 'Add-on enabled')
    }
    setTogglingId(null)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8,
    fontFamily: 'inherit', fontSize: 13, outline: 'none', boxSizing: 'border-box',
    background: 'white', color: '#1A1A1A',
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em',
    color: '#666', display: 'block', marginBottom: 6,
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 22, marginBottom: 4, color: 'var(--text-primary)' }}>Design Add-Ons</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            Reusable add-ons (e.g. Logo Design, Copywriting) that can be linked to products with a gating question.
          </p>
        </div>
        <button onClick={openAdd}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: 'var(--red)', color: 'white', border: 'none', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
          <Plus size={16} /> Add New
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-secondary)' }}>Loading...</div>
      ) : addons.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎨</div>
          <div style={{ fontFamily: 'Montserrat', fontWeight: 600, fontSize: 16, marginBottom: 8 }}>No design add-ons yet</div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 420, margin: '0 auto' }}>
            Create add-ons like "Logo Design" or "Copywriting", then link them to products with a gating question in the product editor.
          </p>
        </div>
      ) : (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 14, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
                {['Name', 'Description', 'Price', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Montserrat', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {addons.map(addon => (
                <tr key={addon.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{addon.name}</div>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-secondary)', maxWidth: 320 }}>
                    {addon.description || <span style={{ fontStyle: 'italic', color: '#9ca3af' }}>—</span>}
                  </td>
                  <td style={{ padding: '14px 16px', fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, color: 'var(--red)', whiteSpace: 'nowrap' }}>
                    ₦{Number(addon.price).toLocaleString()}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'Montserrat', padding: '3px 10px', borderRadius: 20, background: addon.is_active ? '#d1fae5' : '#f3f4f6', color: addon.is_active ? '#065f46' : '#6b7280' }}>
                      {addon.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => openEdit(addon)}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', border: '1px solid var(--border-color)', borderRadius: 7, background: 'var(--bg-secondary)', cursor: 'pointer', fontSize: 12, fontFamily: 'Montserrat', fontWeight: 600 }}>
                        <Pencil size={12} /> Edit
                      </button>
                      <button
                        disabled={togglingId === addon.id}
                        onClick={() => toggleActive(addon)}
                        style={{ padding: '6px 12px', border: `1px solid ${addon.is_active ? '#fca5a5' : '#6ee7b7'}`, borderRadius: 7, background: addon.is_active ? '#fee2e2' : '#d1fae5', cursor: 'pointer', fontSize: 12, fontFamily: 'Montserrat', fontWeight: 700, color: addon.is_active ? '#991b1b' : '#065f46', opacity: togglingId === addon.id ? 0.5 : 1 }}>
                        {addon.is_active ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 480, padding: 28, boxShadow: '0 24px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <h2 style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 18, color: '#1A1A1A' }}>
                {editing ? 'Edit Add-On' : 'New Design Add-On'}
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>Name *</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Logo Design (New)" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Description</label>
                <textarea value={form.description as string} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Brief description shown to customer when this add-on is relevant..."
                  style={{ ...inputStyle, minHeight: 72, resize: 'vertical' }} />
              </div>
              <div>
                <label style={labelStyle}>Price (₦) *</label>
                <input type="number" min={0} value={form.price}
                  onChange={e => setForm(p => ({ ...p, price: e.target.value === '' ? '' : Number(e.target.value) }))}
                  placeholder="e.g. 15000" style={inputStyle} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button onClick={() => setShowModal(false)}
                style={{ flex: 1, padding: '11px', border: '1px solid #d1d5db', borderRadius: 9, background: 'white', fontFamily: 'Montserrat', fontWeight: 600, fontSize: 14, cursor: 'pointer', color: '#666' }}>
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                style={{ flex: 2, padding: '11px', border: 'none', borderRadius: 9, background: saving ? '#e5e7eb' : 'var(--red)', color: saving ? '#9ca3af' : 'white', fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Save size={15} /> {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Add-On'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
