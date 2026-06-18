'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, X, Pencil } from 'lucide-react'
import toast from 'react-hot-toast'

const empty = { message: '', link_text: '', link_url: '', type: 'rolling' as 'rolling' | 'fixed', bg_color: '#C0392B', is_active: true }

export default function NotificationsPage() {
  const router = useRouter()
  const [items, setItems] = useState<any[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null) // null = creating new, set = editing existing
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null) // tracks which row's toggle is in-flight

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth'); return }
      const { data } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
      if (!['admin','super_admin'].includes(data?.role)) { router.push('/dashboard'); return }
      fetchItems()
    }
    check()
  }, [])

  const fetchItems = async () => {
    const { data, error } = await supabase.from('notifications').select('*').order('created_at', { ascending: false })
    if (error) {
      // Previously, a fetch failure here would silently leave the list
      // empty/stale with zero feedback — now it's surfaced.
      toast.error(`Failed to load notifications: ${error.message}`)
      return
    }
    if (data) setItems(data)
  }

  const handleSave = async () => {
    if (!form.message) { toast.error('Message is required'); return }
    setSaving(true)

    if (editingId) {
      // ── EDIT existing notification ──
      // If this one is being set active, deactivate all others first.
      if (form.is_active) {
        const { error: deactivateErr } = await supabase
          .from('notifications')
          .update({ is_active: false })
          .neq('id', editingId)
        if (deactivateErr) {
          toast.error(`Could not deactivate other notifications: ${deactivateErr.message}`)
          setSaving(false)
          return
        }
      }
      const { error } = await supabase
        .from('notifications')
        .update({ ...form, link_text: form.link_text || null, link_url: form.link_url || null })
        .eq('id', editingId)
      if (error) {
        toast.error(`Failed to save changes: ${error.message}`)
      } else {
        toast.success('Notification updated!')
        setShowModal(false)
        setEditingId(null)
        fetchItems()
      }
    } else {
      // ── CREATE new notification ──
      // Deactivate all others first (only one active at a time) —
      // previously this write's error was silently ignored.
      const { error: deactivateErr } = await supabase
        .from('notifications')
        .update({ is_active: false })
        .neq('id', '00000000-0000-0000-0000-000000000000')
      if (deactivateErr) {
        toast.error(`Could not deactivate existing notifications: ${deactivateErr.message}`)
        setSaving(false)
        return
      }
      const { error } = await supabase
        .from('notifications')
        .insert({ ...form, link_text: form.link_text || null, link_url: form.link_url || null })
      if (error) {
        toast.error(`Failed to create notification: ${error.message}`)
      } else {
        toast.success('Notification created!')
        setShowModal(false)
        fetchItems()
      }
    }
    setSaving(false)
  }

  const openEdit = (item: any) => {
    setEditingId(item.id)
    setForm({
      message: item.message || '',
      link_text: item.link_text || '',
      link_url: item.link_url || '',
      type: item.type || 'rolling',
      bg_color: item.bg_color || '#C0392B',
      is_active: !!item.is_active,
    })
    setShowModal(true)
  }

  const toggleActive = async (id: string, current: boolean) => {
    setTogglingId(id)
    try {
      if (!current) {
        // Deactivate all, then activate this one
        const { error: deactivateErr } = await supabase
          .from('notifications')
          .update({ is_active: false })
          .neq('id', '00000000-0000-0000-0000-000000000000')
        if (deactivateErr) {
          toast.error(`Could not deactivate other notifications: ${deactivateErr.message}`)
          return
        }
      }
      const { error, data } = await supabase
        .from('notifications')
        .update({ is_active: !current })
        .eq('id', id)
        .select()
      if (error) {
        toast.error(`Could not update notification: ${error.message}`)
        return
      }
      if (!data || data.length === 0) {
        // A write that "succeeded" with zero rows affected usually means
        // a Row Level Security policy silently blocked it — this is
        // exactly the silent-failure case that looked like a dead button.
        toast.error('Update did not apply — check admin permissions (RLS policy may be blocking this write).')
        return
      }
      toast.success(!current ? 'Notification activated' : 'Notification deactivated')
      await fetchItems()
    } finally {
      setTogglingId(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this notification?')) return
    const { error } = await supabase.from('notifications').delete().eq('id', id)
    if (error) {
      toast.error(`Failed to delete: ${error.message}`)
      return
    }
    toast.success('Deleted')
    fetchItems()
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap' as const, gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 22, marginBottom: 4, color: 'var(--text-primary)' }}>Notification Bar</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>One active notification shown at top of site.</p>
        </div>
        <button onClick={() => { setEditingId(null); setForm(empty); setShowModal(true) }}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: 'var(--red)', color: 'white', border: 'none', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
          <Plus size={16} /> New Notification
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
        {items.map(item => (
          <div key={item.id} style={{ background: 'var(--bg-card)', border: `2px solid ${item.is_active ? item.bg_color : 'var(--border-color)'}`, borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' as const }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'Montserrat', fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', marginBottom: 4 }}>{item.message}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                Type: {item.type} · {item.link_text ? `Link: ${item.link_text}` : 'No link'}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={() => openEdit(item)}
                style={{ background: 'none', border: '1px solid var(--border-color)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}
                title="Edit notification">
                <Pencil size={14} />
              </button>
              <button onClick={() => toggleActive(item.id, item.is_active)}
                disabled={togglingId === item.id}
                style={{ padding: '5px 14px', borderRadius: 20, border: `1px solid ${item.is_active ? '#10b981' : 'var(--border-color)'}`, background: item.is_active ? '#10b98115' : 'none', color: item.is_active ? '#10b981' : 'var(--text-secondary)', fontSize: 12, fontWeight: 600, fontFamily: 'Montserrat', cursor: togglingId === item.id ? 'wait' : 'pointer', opacity: togglingId === item.id ? 0.6 : 1 }}>
                {togglingId === item.id ? 'Updating...' : (item.is_active ? '✓ Active' : 'Inactive')}
              </button>
              <button onClick={() => handleDelete(item.id)} style={{ background: 'none', border: '1px solid var(--red-light)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: 'var(--red)' }}>
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div style={{ textAlign: 'center' as const, padding: 48, color: 'var(--text-secondary)', fontSize: 14 }}>
            No notifications yet. Create your first one.
          </div>
        )}
      </div>

      {showModal && (
        <div style={{ position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 16, width: '100%', maxWidth: 480, padding: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 18, color: 'var(--text-primary)' }}>{editingId ? 'Edit Notification' : 'New Notification'}</h2>
              <button onClick={() => { setShowModal(false); setEditingId(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 14 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6, color: 'var(--text-primary)' }}>Message *</label>
                <input value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} placeholder="e.g. Flash Sale: 20% off all banners this weekend!" className="form-input" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6, color: 'var(--text-primary)' }}>Link text</label>
                  <input value={form.link_text} onChange={e => setForm(p => ({ ...p, link_text: e.target.value }))} placeholder="e.g. Shop Now" className="form-input" />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6, color: 'var(--text-primary)' }}>Link URL</label>
                  <input value={form.link_url} onChange={e => setForm(p => ({ ...p, link_url: e.target.value }))} placeholder="e.g. /shop" className="form-input" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6, color: 'var(--text-primary)' }}>Type</label>
                  <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as any }))} className="form-input" style={{ cursor: 'pointer' }}>
                    <option value="rolling">Rolling (marquee)</option>
                    <option value="fixed">Fixed (static)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6, color: 'var(--text-primary)' }}>Background colour</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type="color" value={form.bg_color} onChange={e => setForm(p => ({ ...p, bg_color: e.target.value }))} style={{ width: 40, height: 38, borderRadius: 8, border: '1px solid var(--border-color)', cursor: 'pointer', padding: 2 }} />
                    <input value={form.bg_color} onChange={e => setForm(p => ({ ...p, bg_color: e.target.value }))} className="form-input" style={{ flex: 1 }} />
                  </div>
                </div>
              </div>
              {editingId && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input type="checkbox" id="is_active_edit" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))}
                    style={{ width: 16, height: 16, accentColor: 'var(--red)', cursor: 'pointer' }} />
                  <label htmlFor="is_active_edit" style={{ fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 600 }}>
                    Active (will deactivate any other active notification)
                  </label>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button onClick={() => { setShowModal(false); setEditingId(null) }} style={{ flex: 1, padding: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 600, fontSize: 14, cursor: 'pointer', color: 'var(--text-primary)' }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: '12px', background: saving ? '#ccc' : 'var(--red)', color: 'white', border: 'none', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Saving...' : (editingId ? 'Save Changes' : 'Create & Activate')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}