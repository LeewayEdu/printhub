'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, X, Star } from 'lucide-react'
import toast from 'react-hot-toast'

const empty = { name: '', company: '', text: '', rating: 5, sort_order: 0, is_active: true }

export default function TestimonialsPage() {
  const router = useRouter()
  const [items, setItems] = useState<any[]>([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)

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
    const { data } = await supabase.from('testimonials').select('*').order('sort_order')
    if (data) setItems(data)
  }

  const handleSave = async () => {
    if (!form.name || !form.text) { toast.error('Name and testimonial text are required'); return }
    setSaving(true)
    const { error } = await supabase.from('testimonials').insert({
      ...form,
      company: form.company || null,
    })
    if (error) { toast.error(error.message) } else {
      toast.success('Testimonial added!')
      setShowModal(false)
      setForm(empty)
      fetchItems()
    }
    setSaving(false)
  }

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('testimonials').update({ is_active: !current }).eq('id', id)
    fetchItems()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this testimonial?')) return
    await supabase.from('testimonials').delete().eq('id', id)
    toast.success('Deleted')
    fetchItems()
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap' as const, gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 22, marginBottom: 4, color: 'var(--text-primary)' }}>Testimonials</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Manage client reviews shown on the homepage. Active ones appear in the scrolling strip.</p>
        </div>
        <button onClick={() => { setForm(empty); setShowModal(true) }}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: 'var(--red)', color: 'white', border: 'none', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
          <Plus size={16} /> Add Testimonial
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }} className="test-grid">
        {items.map(item => (
          <div key={item.id} style={{ background: 'var(--bg-card)', border: `1px solid ${item.is_active ? 'var(--border-color)' : '#f3f4f6'}`, borderRadius: 12, padding: 20, opacity: item.is_active ? 1 : 0.5 }}>
            <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
              {[1,2,3,4,5].map(s => <Star key={s} size={13} fill={s <= item.rating ? '#f59e0b' : 'none'} color={s <= item.rating ? '#f59e0b' : '#d1d5db'} />)}
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 12, fontStyle: 'italic' }}>"{item.text}"</p>
            <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{item.name}</div>
            {item.company && <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{item.company}</div>}
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button onClick={() => toggleActive(item.id, item.is_active)}
                style={{ padding: '6px 14px', background: item.is_active ? '#f3f4f6' : 'var(--red)', color: item.is_active ? 'var(--text-primary)' : 'white', border: '1px solid var(--border-color)', borderRadius: 7, fontFamily: 'Montserrat', fontWeight: 600, fontSize: 11, cursor: 'pointer' }}>
                {item.is_active ? 'Hide' : 'Show'}
              </button>
              <button onClick={() => handleDelete(item.id)}
                style={{ padding: '6px 10px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: 7, cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center' as const, padding: 48, color: 'var(--text-secondary)', fontSize: 14 }}>
            No testimonials yet. Add your first client review.
          </div>
        )}
      </div>

      {showModal && (
        <div style={{ position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className="admin-modal" style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 500, padding: 32, boxShadow: '0 24px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <h2 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 18, color: '#1A1A1A' }}>Add Testimonial</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: '#444' }}>Client Name *</label>
                  <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Amaka Obi" className="form-input" />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: '#444' }}>Company / Title</label>
                  <input value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))} placeholder="e.g. Event Planner, Abuja" className="form-input" />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: '#444' }}>Review Text *</label>
                <textarea value={form.text} onChange={e => setForm(p => ({ ...p, text: e.target.value }))}
                  placeholder="What did the client say about PrintHub?" rows={4}
                  className="form-input" style={{ resize: 'vertical' as const }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 8, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: '#444' }}>Star Rating</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[1,2,3,4,5].map(s => (
                      <button key={s} type="button" onClick={() => setForm(p => ({ ...p, rating: s }))}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                        <Star size={22} fill={s <= form.rating ? '#f59e0b' : 'none'} color={s <= form.rating ? '#f59e0b' : '#d1d5db'} />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: '#444' }}>Display Order</label>
                  <input type="number" value={form.sort_order || ''} onChange={e => setForm(p => ({ ...p, sort_order: Number(e.target.value) }))}
                    placeholder="1, 2, 3..." className="form-input" />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="checkbox" id="tactive" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))}
                  style={{ width: 16, height: 16, accentColor: 'var(--red)', cursor: 'pointer' }} />
                <label htmlFor="tactive" style={{ fontSize: 13, color: '#444', cursor: 'pointer', fontWeight: 600 }}>Show on homepage immediately</label>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button onClick={() => setShowModal(false)}
                style={{ flex: 1, padding: 12, background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 600, fontSize: 14, cursor: 'pointer', color: '#444' }}>
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                style={{ flex: 2, padding: 12, background: saving ? '#ccc' : 'var(--red)', color: 'white', border: 'none', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Saving...' : 'Add Testimonial'}
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`@media (max-width: 700px) { .test-grid { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  )
}