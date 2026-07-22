'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, X, ExternalLink, Package } from 'lucide-react'
import toast from 'react-hot-toast'
import { SITE_URL } from '@/lib/site-url'


const ICONS = ['🏫','⛪','🗳️','🏢','🎉','🏥','🏨','🤝','🏠','👗','🍽️','⚖️','🎓','🏋️','💄','🚗','📦','🎨']

const empty = {
  name: '', slug: '', headline: '', subheadline: '', description: '',
  full_description: '', seo_title: '', meta_description: '',
  hero_image: '', icon: '🏢', is_active: true, sort_order: 0,
}

function slugify(t: string) {
  return t.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-')
}

export default function AdminIndustriesPage() {
  const router = useRouter()
  const [industries, setIndustries] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showProductsModal, setShowProductsModal] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [selectedIndustry, setSelectedIndustry] = useState<any>(null)
  const [industryProducts, setIndustryProducts] = useState<string[]>([])
  const [savingProducts, setSavingProducts] = useState(false)

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth'); return }
      const { data } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
      if (!['admin','super_admin'].includes(data?.role)) { router.push('/dashboard'); return }
      load()
      supabase.from('products').select('id, name, category').eq('is_active', true).order('name')
        .then(({ data }) => { if (data) setProducts(data) })
    }
    check()
  }, [])

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('industries').select('*').order('sort_order')
    if (data) setIndustries(data)
    setLoading(false)
  }

  const openNew = () => { setEditing(null); setForm({ ...empty, sort_order: industries.length + 1 }); setShowModal(true) }
  const openEdit = (ind: any) => {
    setEditing(ind)
    setForm({ name: ind.name, slug: ind.slug, headline: ind.headline || '', subheadline: ind.subheadline || '', description: ind.description || '', full_description: ind.full_description || '', seo_title: ind.seo_title || '', meta_description: ind.meta_description || '', hero_image: ind.hero_image || '', icon: ind.icon || '🏢', is_active: ind.is_active, sort_order: ind.sort_order || 0 })
    setShowModal(true)
  }

  const openProductsModal = async (ind: any) => {
    setSelectedIndustry(ind)
    const { data } = await supabase.from('industry_products').select('product_id').eq('industry_id', ind.id)
    setIndustryProducts((data || []).map(r => r.product_id))
    setShowProductsModal(true)
  }

  const saveProducts = async () => {
    if (!selectedIndustry) return
    setSavingProducts(true)
    await supabase.from('industry_products').delete().eq('industry_id', selectedIndustry.id)
    if (industryProducts.length > 0) {
      await supabase.from('industry_products').insert(
        industryProducts.map((pid, i) => ({ industry_id: selectedIndustry.id, product_id: pid, sort_order: i }))
      )
    }
    toast.success('Products updated!')
    setSavingProducts(false)
    setShowProductsModal(false)
  }

  const save = async () => {
    if (!form.name) { toast.error('Name is required'); return }
    if (!form.slug) { toast.error('Slug is required'); return }
    setSaving(true)
    const { error } = editing
      ? await supabase.from('industries').update(form).eq('id', editing.id)
      : await supabase.from('industries').insert(form)
    if (error) { toast.error(error.message) } else { toast.success(editing ? 'Updated!' : 'Created!'); setShowModal(false); load() }
    setSaving(false)
  }

  const del = async (id: string) => {
    if (!confirm('Delete this industry page?')) return
    await supabase.from('industries').delete().eq('id', id)
    toast.success('Deleted'); load()
  }

  const setF = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  const inp: React.CSSProperties = { width: '100%', padding: '9px 12px', border: '1px solid #d0d0d0', borderRadius: 8, fontSize: 13, fontFamily: 'Open Sans', outline: 'none', boxSizing: 'border-box' }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, gap: 12, flexWrap: 'wrap' as const }}>
        <div>
          <h1 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 22, marginBottom: 4, color: 'var(--text-primary)' }}>Industry Pages</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Each industry gets its own SEO landing page at /industries/[slug]</p>
        </div>
        <button onClick={openNew} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: 'var(--red)', color: 'white', border: 'none', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
          <Plus size={16} /> New Industry
        </button>
      </div>

      {loading ? <div style={{ padding: 48, textAlign: 'center' as const }}>Loading...</div> : (
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
          {industries.map(ind => (
            <div key={ind.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' as const }}>
              <div style={{ fontSize: 28, width: 44, textAlign: 'center' as const }}>{ind.icon}</div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', marginBottom: 2 }}>{ind.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>/industries/{ind.slug} · {ind.is_active ? '✅ Active' : '⬜ Inactive'}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => openProductsModal(ind)} title="Assign products"
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 12, color: 'var(--text-primary)', cursor: 'pointer', fontFamily: 'Montserrat', fontWeight: 600 }}>
                  <Package size={12} /> Products
                </button>
                <a href={`${SITE_URL}/industries/${ind.slug}`} target="_blank" rel="noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 12, color: 'var(--text-primary)', textDecoration: 'none', fontFamily: 'Montserrat', fontWeight: 600 }}>
                  <ExternalLink size={12} /> Preview
                </a>
                <button onClick={() => openEdit(ind)} style={{ padding: '7px 10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 8, cursor: 'pointer', color: 'var(--text-primary)', display: 'flex', alignItems: 'center' }}><Pencil size={14} /></button>
                <button onClick={() => del(ind.id)} style={{ padding: '7px 10px', background: 'var(--red-pale)', border: '1px solid var(--red-light)', borderRadius: 8, cursor: 'pointer', color: 'var(--red)', display: 'flex', alignItems: 'center' }}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit/Create modal */}
      {showModal && (
        <div style={{ position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 20, overflowY: 'auto' as const }}>
          <div style={{ background: '#f5f5f3', borderRadius: 16, width: '100%', maxWidth: 640, margin: '40px auto', boxShadow: '0 24px 60px rgba(0,0,0,0.4)' }}>
            <div style={{ padding: '20px 24px', background: 'white', borderRadius: '16px 16px 0 0', borderBottom: '1px solid #e8e8e5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 18, color: '#1A1A1A' }}>{editing ? 'Edit Industry' : 'New Industry Page'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ padding: 24, maxHeight: '70vh', overflowY: 'auto' as const, display: 'flex', flexDirection: 'column' as const, gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6, color: '#444', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Icon</label>
                  <select value={form.icon} onChange={e => setF('icon', e.target.value)} style={{ ...inp, fontSize: 20, textAlign: 'center' as const }}>
                    {ICONS.map(ic => <option key={ic} value={ic}>{ic}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6, color: '#444', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Industry Name *</label>
                  <input value={form.name} onChange={e => { setF('name', e.target.value); if (!editing) setF('slug', slugify(e.target.value)) }} style={inp} placeholder="e.g. Schools & Education" />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6, color: '#444', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Slug * ({SITE_URL}/industries/<strong>{form.slug || 'slug'}</strong>)</label>
                <input value={form.slug} onChange={e => setF('slug', slugify(e.target.value))} style={inp} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6, color: '#444', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Page Headline</label>
                <input value={form.headline} onChange={e => setF('headline', e.target.value)} style={inp} placeholder="e.g. Professional print materials for Nigerian schools" />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6, color: '#444', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Subheadline</label>
                <input value={form.subheadline} onChange={e => setF('subheadline', e.target.value)} style={inp} placeholder="Supporting sentence below the headline" />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6, color: '#444', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Full Description (HTML)</label>
                <textarea value={form.full_description} onChange={e => setF('full_description', e.target.value)} style={{ ...inp, minHeight: 100, resize: 'vertical' as const }} placeholder="<p>Detailed description for SEO...</p>" />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6, color: '#444', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Hero Image URL</label>
                <input value={form.hero_image} onChange={e => setF('hero_image', e.target.value)} style={inp} placeholder="https://..." />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6, color: '#444', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>SEO Title</label>
                  <input value={form.seo_title} onChange={e => setF('seo_title', e.target.value)} style={inp} placeholder="Left blank = auto-generated" />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6, color: '#444', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Sort</label>
                  <input type="number" value={form.sort_order} onChange={e => setF('sort_order', Number(e.target.value))} style={inp} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6, color: '#444', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Meta Description</label>
                <textarea value={form.meta_description} onChange={e => setF('meta_description', e.target.value)} style={{ ...inp, minHeight: 72, resize: 'vertical' as const }} maxLength={160} />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                <input type="checkbox" checked={form.is_active} onChange={e => setF('is_active', e.target.checked)} style={{ accentColor: 'var(--red)', width: 16, height: 16 }} />
                <span style={{ color: '#444' }}>Page is live</span>
              </label>
            </div>
            <div style={{ padding: '16px 24px', background: 'white', borderRadius: '0 0 16px 16px', borderTop: '1px solid #e8e8e5', display: 'flex', gap: 10 }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '12px', background: '#f5f5f3', border: '1px solid #e8e8e5', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 600, fontSize: 14, cursor: 'pointer', color: '#444' }}>Cancel</button>
              <button onClick={save} disabled={saving} style={{ flex: 2, padding: '12px', background: saving ? '#ccc' : 'var(--red)', color: 'white', border: 'none', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign products modal */}
      {showProductsModal && selectedIndustry && (
        <div style={{ position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 520, boxShadow: '0 24px 60px rgba(0,0,0,0.4)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e8e8e5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 17, color: '#1A1A1A' }}>Products for {selectedIndustry.name}</h2>
              <button onClick={() => setShowProductsModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ padding: 20, maxHeight: '60vh', overflowY: 'auto' as const }}>
              <p style={{ fontSize: 12, color: '#888', marginBottom: 14 }}>Select which products appear on this industry page.</p>
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
                {products.map(p => (
                  <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, border: '1px solid #e8e8e5', cursor: 'pointer', background: industryProducts.includes(p.id) ? 'rgba(192,57,43,0.05)' : 'white' }}>
                    <input type="checkbox" checked={industryProducts.includes(p.id)}
                      onChange={e => setIndustryProducts(prev => e.target.checked ? [...prev, p.id] : prev.filter(id => id !== p.id))}
                      style={{ accentColor: 'var(--red)', width: 15, height: 15 }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, fontFamily: 'Montserrat', color: '#1A1A1A' }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: '#888' }}>{p.category}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid #e8e8e5', display: 'flex', gap: 10 }}>
              <button onClick={() => setShowProductsModal(false)} style={{ flex: 1, padding: '11px', background: '#f5f5f3', border: '1px solid #e8e8e5', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 600, fontSize: 14, cursor: 'pointer', color: '#444' }}>Cancel</button>
              <button onClick={saveProducts} disabled={savingProducts} style={{ flex: 2, padding: '11px', background: savingProducts ? '#ccc' : 'var(--red)', color: 'white', border: 'none', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, cursor: savingProducts ? 'not-allowed' : 'pointer' }}>
                {savingProducts ? 'Saving...' : `Save (${industryProducts.length} products)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}