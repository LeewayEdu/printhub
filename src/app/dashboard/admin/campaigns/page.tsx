// src/app/dashboard/admin/campaigns/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, X, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'
import { SITE_URL } from '@/lib/site-url'


const empty = {
  slug: '', headline: '', subheadline: '', body_content: '', hero_image: '',
  cta_text: 'Get a Free Quote', cta_type: 'whatsapp', cta_destination: '+2348052929523',
  seo_title: '', meta_description: '', og_image: '', is_active: true,
}

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-')
}

export default function AdminCampaignsPage() {
  const router = useRouter()
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth'); return }
      const { data } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
      if (!['admin','super_admin'].includes(data?.role)) { router.push('/dashboard'); return }
      load()
    }
    check()
  }, [])

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('campaigns').select('*').order('created_at', { ascending: false })
    if (data) setCampaigns(data)
    setLoading(false)
  }

  const openNew = () => { setEditing(null); setForm(empty); setShowModal(true) }
  const openEdit = (c: any) => {
    setEditing(c)
    setForm({ slug: c.slug, headline: c.headline, subheadline: c.subheadline || '', body_content: c.body_content || '', hero_image: c.hero_image || '', cta_text: c.cta_text, cta_type: c.cta_type, cta_destination: c.cta_destination || '', seo_title: c.seo_title || '', meta_description: c.meta_description || '', og_image: c.og_image || '', is_active: c.is_active })
    setShowModal(true)
  }

  const save = async () => {
    if (!form.headline) { toast.error('Headline is required'); return }
    if (!form.slug) { toast.error('Slug is required'); return }
    setSaving(true)
    const payload = { ...form }
    const { error } = editing
      ? await supabase.from('campaigns').update(payload).eq('id', editing.id)
      : await supabase.from('campaigns').insert(payload)
    if (error) { toast.error(error.message) } else { toast.success(editing ? 'Campaign updated!' : 'Campaign created!'); setShowModal(false); load() }
    setSaving(false)
  }

  const del = async (id: string) => {
    if (!confirm('Delete this campaign page?')) return
    await supabase.from('campaigns').delete().eq('id', id)
    toast.success('Deleted'); load()
  }

  const setF = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  const inp = { width: '100%', padding: '9px 12px', border: '1px solid #d0d0d0', borderRadius: 8, fontSize: 13, fontFamily: 'Open Sans', outline: 'none', boxSizing: 'border-box' as const }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, gap: 12, flexWrap: 'wrap' as const }}>
        <div>
          <h1 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 22, marginBottom: 4, color: 'var(--text-primary)' }}>Campaign Pages</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Create lead generation landing pages without code. Each campaign gets its own URL.</p>
        </div>
        <button onClick={openNew} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: 'var(--red)', color: 'white', border: 'none', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
          <Plus size={16} /> New Campaign
        </button>
      </div>

      {loading ? <div style={{ padding: 48, textAlign: 'center' as const }}>Loading...</div> : (
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
          {campaigns.map(c => (
            <div key={c.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' as const }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', marginBottom: 4 }}>{c.headline}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  /{c.slug} · {c.cta_type} · {c.is_active ? '✅ Active' : '⬜ Inactive'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <a href={`${SITE_URL}/campaigns/${c.slug}`} target="_blank" rel="noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 12, color: 'var(--text-primary)', textDecoration: 'none', fontFamily: 'Montserrat', fontWeight: 600 }}>
                  <ExternalLink size={12} /> Preview
                </a>
                <button onClick={() => openEdit(c)} style={{ padding: '7px 10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 8, cursor: 'pointer', color: 'var(--text-primary)', display: 'flex', alignItems: 'center' }}>
                  <Pencil size={14} />
                </button>
                <button onClick={() => del(c.id)} style={{ padding: '7px 10px', background: 'var(--red-pale)', border: '1px solid var(--red-light)', borderRadius: 8, cursor: 'pointer', color: 'var(--red)', display: 'flex', alignItems: 'center' }}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          {campaigns.length === 0 && (
            <div style={{ textAlign: 'center' as const, padding: 60, color: 'var(--text-secondary)' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📣</div>
              <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 16 }}>No campaigns yet</div>
              <p style={{ fontSize: 13, marginTop: 8 }}>Create your first lead generation landing page.</p>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div style={{ position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 20, overflowY: 'auto' as const }}>
          <div style={{ background: '#f5f5f3', borderRadius: 16, width: '100%', maxWidth: 640, margin: '40px auto', boxShadow: '0 24px 60px rgba(0,0,0,0.4)' }}>
            <div style={{ padding: '20px 24px', background: 'white', borderRadius: '16px 16px 0 0', borderBottom: '1px solid #e8e8e5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 18, color: '#1A1A1A' }}>{editing ? 'Edit Campaign' : 'New Campaign Page'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ padding: 24, maxHeight: '70vh', overflowY: 'auto' as const, display: 'flex', flexDirection: 'column' as const, gap: 16 }}>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6, color: '#444', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Headline *</label>
                <input value={form.headline} onChange={e => { setF('headline', e.target.value); if (!editing) setF('slug', slugify(e.target.value)) }} style={inp} placeholder="e.g. Get a Free Quote for Your School's Printing Needs" />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6, color: '#444', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>URL Slug * <span style={{ textTransform: 'none' as const, fontWeight: 400 }}>({SITE_URL}/campaigns/<strong>{form.slug || 'your-slug'}</strong>)</span></label>
                <input value={form.slug} onChange={e => setF('slug', slugify(e.target.value))} style={inp} placeholder="e.g. schools-printing-quote" />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6, color: '#444', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Subheadline</label>
                <input value={form.subheadline} onChange={e => setF('subheadline', e.target.value)} style={inp} placeholder="Supporting text below the headline" />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6, color: '#444', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Body Content (HTML allowed)</label>
                <textarea value={form.body_content} onChange={e => setF('body_content', e.target.value)} style={{ ...inp, minHeight: 120, resize: 'vertical' as const }} placeholder="<p>Describe your offer, benefits, process...</p>" />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6, color: '#444', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Hero Image URL</label>
                <input value={form.hero_image} onChange={e => setF('hero_image', e.target.value)} style={inp} placeholder="https://..." />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6, color: '#444', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>CTA Button Text</label>
                  <input value={form.cta_text} onChange={e => setF('cta_text', e.target.value)} style={inp} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6, color: '#444', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>CTA Type</label>
                  <select value={form.cta_type} onChange={e => setF('cta_type', e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="phone">Phone Call</option>
                    <option value="email">Email</option>
                    <option value="form">Inline Form</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6, color: '#444', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>CTA Destination (WhatsApp number / email / phone)</label>
                <input value={form.cta_destination} onChange={e => setF('cta_destination', e.target.value)} style={inp} placeholder="+2348052929523 or email@example.com" />
              </div>

              <div style={{ borderTop: '1px solid #e8e8e5', paddingTop: 16 }}>
                <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 13, marginBottom: 12, color: '#1A1A1A' }}>SEO Settings</div>
                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6, color: '#444', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>SEO Title (shown in Google)</label>
                    <input value={form.seo_title} onChange={e => setF('seo_title', e.target.value)} style={inp} placeholder="Left blank = headline used automatically" />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6, color: '#444', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Meta Description (shown in Google)</label>
                    <textarea value={form.meta_description} onChange={e => setF('meta_description', e.target.value)} style={{ ...inp, minHeight: 72, resize: 'vertical' as const }} placeholder="150–160 characters recommended" maxLength={160} />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" id="camp_active" checked={form.is_active} onChange={e => setF('is_active', e.target.checked)} style={{ accentColor: 'var(--red)', width: 16, height: 16 }} />
                <label htmlFor="camp_active" style={{ fontSize: 13, cursor: 'pointer', color: '#444' }}>Page is live (visible to public)</label>
              </div>
            </div>

            <div style={{ padding: '16px 24px', background: 'white', borderRadius: '0 0 16px 16px', borderTop: '1px solid #e8e8e5', display: 'flex', gap: 10 }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '12px', background: '#f5f5f3', border: '1px solid #e8e8e5', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 600, fontSize: 14, cursor: 'pointer', color: '#444' }}>Cancel</button>
              <button onClick={save} disabled={saving} style={{ flex: 2, padding: '12px', background: saving ? '#ccc' : 'var(--red)', color: 'white', border: 'none', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Saving...' : editing ? 'Update Campaign' : 'Create Campaign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}