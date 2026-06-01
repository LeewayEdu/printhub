'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Upload, X } from 'lucide-react'
import toast from 'react-hot-toast'

const empty = { title: '', subtitle: '', link_url: '', sort_order: 0, is_active: true, overlay_opacity: 0.62, cta_text: '', cta_url: '', page_type: 'home' }

export default function BannersPage() {
  const router = useRouter()
  const [banners, setBanners] = useState<any[]>([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(empty)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth'); return }
      const { data } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
      if (!['admin','super_admin'].includes(data?.role)) { router.push('/dashboard'); return }
      fetchBanners()
    }
    check()
  }, [])

  const fetchBanners = async () => {
    const { data } = await supabase.from('hero_banners').select('*').order('sort_order')
    if (data) setBanners(data)
  }

  const handleSave = async () => {
    if (!imageFile) { toast.error('Please upload a banner image'); return }
    setSaving(true)
    const path = `banners/${crypto.randomUUID()}-${imageFile.name}`
    const { error: upErr } = await supabase.storage.from('products').upload(path, imageFile)
    if (upErr) { toast.error(upErr.message); setSaving(false); return }
    const { data: urlData } = supabase.storage.from('products').getPublicUrl(path)
    const { error } = await supabase.from('hero_banners').insert({ ...form, image_url: urlData.publicUrl, title: form.title || null, subtitle: form.subtitle || null, link_url: form.link_url || null, cta_text: form.cta_text || null, cta_url: form.cta_url || null, page_type: form.page_type || 'home' })
    if (error) { toast.error(error.message) } else { toast.success('Banner added!'); setShowModal(false); fetchBanners(); setImageFile(null); setForm(empty) }
    setSaving(false)
  }

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('hero_banners').update({ is_active: !current }).eq('id', id)
    fetchBanners()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this banner?')) return
    await supabase.from('hero_banners').delete().eq('id', id)
    toast.success('Deleted')
    fetchBanners()
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap' as const, gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 22, marginBottom: 4, color: 'var(--text-primary)' }}>Shop Hero Banners</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Manage the carousel images on the shop page.</p>
        </div>
        <button onClick={() => { setForm(empty); setImageFile(null); setShowModal(true) }}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: 'var(--red)', color: 'white', border: 'none', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
          <Plus size={16} /> Add Banner
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }} className="banners-grid">
        {banners.map(banner => (
          <div key={banner.id} style={{ background: 'var(--bg-card)', border: `2px solid ${banner.is_active ? 'var(--red)' : 'var(--border-color)'}`, borderRadius: 14, overflow: 'hidden', opacity: banner.is_active ? 1 : 0.6 }}>
            <div style={{ height: 140, overflow: 'hidden', position: 'relative' as const }}>
              <img src={banner.image_url} alt={banner.title || 'Banner'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute' as const, inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                {banner.title && <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 16, color: 'white', textAlign: 'center' as const }}>{banner.title}</div>}
                {banner.subtitle && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', textAlign: 'center' as const, marginTop: 4 }}>{banner.subtitle}</div>}
              </div>
            </div>
            <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Order: {banner.sort_order}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => toggleActive(banner.id, banner.is_active)}
                  style={{ padding: '4px 12px', borderRadius: 20, border: `1px solid ${banner.is_active ? '#10b981' : 'var(--border-color)'}`, background: banner.is_active ? '#10b98115' : 'none', color: banner.is_active ? '#10b981' : 'var(--text-secondary)', fontSize: 11, fontWeight: 600, fontFamily: 'Montserrat', cursor: 'pointer' }}>
                  {banner.is_active ? 'Active' : 'Inactive'}
                </button>
                <button onClick={() => handleDelete(banner.id)} style={{ background: 'none', border: '1px solid var(--red-light)', borderRadius: 8, padding: '4px 8px', cursor: 'pointer', color: 'var(--red)' }}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {banners.length === 0 && (
        <div style={{ textAlign: 'center' as const, padding: 60 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🖼️</div>
          <div style={{ fontFamily: 'Montserrat', fontWeight: 600, fontSize: 16, color: 'var(--text-primary)', marginBottom: 8 }}>No banners yet</div>
          <button onClick={() => setShowModal(true)} style={{ background: 'var(--red)', color: 'white', border: 'none', borderRadius: 9, padding: '10px 24px', fontFamily: 'Montserrat', fontWeight: 700, cursor: 'pointer' }}>Add first banner</button>
        </div>
      )}

      {showModal && (
        <div style={{ position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 16, width: '100%', maxWidth: 480, padding: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 18, color: 'var(--text-primary)' }}>Add Banner</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 14 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6, color: 'var(--text-primary)' }}>Banner Image *</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', border: '2px dashed var(--border-color)', borderRadius: 9, cursor: 'pointer', background: 'var(--bg-secondary)', fontSize: 13, color: 'var(--text-secondary)' }}>
                  <Upload size={16} />
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => setImageFile(e.target.files?.[0] || null)} />
                  {imageFile ? <span style={{ color: '#10b981', fontWeight: 600 }}>✓ {imageFile.name}</span> : 'Click to upload (JPG, PNG — recommended 1200×400px)'}
                </label>
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6, color: 'var(--text-primary)' }}>Title (optional)</label>
                <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Flash Sale — 20% Off Banners" className="form-input" />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6, color: 'var(--text-primary)' }}>Subtitle (optional)</label>
                <input value={form.subtitle} onChange={e => setForm(p => ({ ...p, subtitle: e.target.value }))} placeholder="e.g. This weekend only" className="form-input" />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6, color: 'var(--text-primary)' }}>Link URL (optional)</label>
                <input value={form.link_url} onChange={e => setForm(p => ({ ...p, link_url: e.target.value }))} placeholder="e.g. /shop?cat=banners" className="form-input" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6, color: 'var(--text-primary)' }}>CTA Button Text</label>
                  <input value={form.cta_text} onChange={e => setForm(p => ({ ...p, cta_text: e.target.value }))} placeholder="e.g. Shop Sale Now" className="form-input" />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6, color: 'var(--text-primary)' }}>CTA Button URL</label>
                  <input value={form.cta_url} onChange={e => setForm(p => ({ ...p, cta_url: e.target.value }))} placeholder="e.g. /shop?cat=banners" className="form-input" />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6, color: 'var(--text-primary)' }}>Overlay Darkness (0 = transparent, 1 = full black)</label>
                <input type="number" min="0" max="1" step="0.05" value={form.overlay_opacity} onChange={e => setForm(p => ({ ...p, overlay_opacity: Number(e.target.value) }))} className="form-input" />
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>Default 0.62. Increase if text is hard to read over your image.</div>
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6, color: 'var(--text-primary)' }}>Sort order</label>
                <input type="number" value={form.sort_order || ''} onChange={e => setForm(p => ({ ...p, sort_order: Number(e.target.value) }))} placeholder="1, 2, 3..." className="form-input" />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6, color: 'var(--text-primary)' }}>Used On</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[{ value: 'home', label: '🏠 Homepage', hint: 'Full-height hero (1440×640px)' }, { value: 'shop', label: '🛍️ Shop page', hint: 'Shorter banner (1440×400px)' }].map(opt => (
                    <div key={opt.value} onClick={() => setForm(p => ({ ...p, page_type: opt.value }))}
                      style={{ padding: '12px 14px', borderRadius: 10, border: `2px solid ${form.page_type === opt.value ? 'var(--red)' : 'var(--border-color)'}`, background: form.page_type === opt.value ? '#FDEDEC' : 'var(--bg-secondary)', cursor: 'pointer' }}>
                      <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 13, color: form.page_type === opt.value ? 'var(--red)' : 'var(--text-primary)', marginBottom: 3 }}>{opt.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{opt.hint}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 600, fontSize: 14, cursor: 'pointer', color: 'var(--text-primary)' }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: '12px', background: saving ? '#ccc' : 'var(--red)', color: 'white', border: 'none', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Uploading...' : 'Add Banner'}
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`@media (max-width: 900px) { .banners-grid { grid-template-columns: repeat(2, 1fr) !important; } }`}</style>
    </div>
  )
}