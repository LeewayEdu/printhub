'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, X, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'

const SITE_URL = 'https://printhub.cchumedia.com'

const empty = {
  slug: '', title: '', excerpt: '', body: '', featured_image: '',
  author: 'PrintHub Team', category: '', tags: '',
  seo_title: '', meta_description: '', is_published: false,
}

function slugify(t: string) {
  return t.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-')
}

export default function AdminBlogPage() {
  const router = useRouter()
  const [posts, setPosts] = useState<any[]>([])
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
    const { data } = await supabase.from('blog_posts').select('*').order('created_at', { ascending: false })
    if (data) setPosts(data)
    setLoading(false)
  }

  const openNew = () => { setEditing(null); setForm(empty); setShowModal(true) }
  const openEdit = (p: any) => {
    setEditing(p)
    setForm({ slug: p.slug, title: p.title, excerpt: p.excerpt || '', body: p.body || '', featured_image: p.featured_image || '', author: p.author || 'PrintHub Team', category: p.category || '', tags: (p.tags || []).join(', '), seo_title: p.seo_title || '', meta_description: p.meta_description || '', is_published: p.is_published })
    setShowModal(true)
  }

  const save = async () => {
    if (!form.title) { toast.error('Title is required'); return }
    if (!form.slug) { toast.error('Slug is required'); return }
    setSaving(true)
    const payload = {
      ...form,
      tags: form.tags ? form.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
      published_at: form.is_published ? new Date().toISOString() : null,
    }
    const { error } = editing
      ? await supabase.from('blog_posts').update(payload).eq('id', editing.id)
      : await supabase.from('blog_posts').insert(payload)
    if (error) { toast.error(error.message) } else { toast.success(editing ? 'Post updated!' : 'Post created!'); setShowModal(false); load() }
    setSaving(false)
  }

  const del = async (id: string) => {
    if (!confirm('Delete this blog post?')) return
    await supabase.from('blog_posts').delete().eq('id', id)
    toast.success('Deleted'); load()
  }

  const setF = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))
  const inp: React.CSSProperties = { width: '100%', padding: '9px 12px', border: '1px solid #d0d0d0', borderRadius: 8, fontSize: 13, fontFamily: 'Open Sans', outline: 'none', boxSizing: 'border-box' }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, gap: 12, flexWrap: 'wrap' as const }}>
        <div>
          <h1 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 22, marginBottom: 4, color: 'var(--text-primary)' }}>Blog Posts</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Published posts appear at /blog/[slug] and are indexed by Google.</p>
        </div>
        <button onClick={openNew} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: 'var(--red)', color: 'white', border: 'none', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
          <Plus size={16} /> New Post
        </button>
      </div>

      {loading ? <div style={{ padding: 48, textAlign: 'center' as const }}>Loading...</div> : (
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
          {posts.map(p => (
            <div key={p.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' as const }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', marginBottom: 2 }}>{p.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>/blog/{p.slug} · {p.is_published ? '✅ Published' : '📝 Draft'} · {p.author}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {p.is_published && (
                  <a href={`${SITE_URL}/blog/${p.slug}`} target="_blank" rel="noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 12, color: 'var(--text-primary)', textDecoration: 'none', fontFamily: 'Montserrat', fontWeight: 600 }}>
                    <ExternalLink size={12} /> View
                  </a>
                )}
                <button onClick={() => openEdit(p)} style={{ padding: '7px 10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 8, cursor: 'pointer', color: 'var(--text-primary)', display: 'flex', alignItems: 'center' }}><Pencil size={14} /></button>
                <button onClick={() => del(p.id)} style={{ padding: '7px 10px', background: 'var(--red-pale)', border: '1px solid var(--red-light)', borderRadius: 8, cursor: 'pointer', color: 'var(--red)', display: 'flex', alignItems: 'center' }}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
          {posts.length === 0 && (
            <div style={{ textAlign: 'center' as const, padding: 60, color: 'var(--text-secondary)' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📝</div>
              <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 16 }}>No posts yet</div>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div style={{ position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 20, overflowY: 'auto' as const }}>
          <div style={{ background: '#f5f5f3', borderRadius: 16, width: '100%', maxWidth: 680, margin: '40px auto', boxShadow: '0 24px 60px rgba(0,0,0,0.4)' }}>
            <div style={{ padding: '20px 24px', background: 'white', borderRadius: '16px 16px 0 0', borderBottom: '1px solid #e8e8e5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 18, color: '#1A1A1A' }}>{editing ? 'Edit Post' : 'New Blog Post'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ padding: 24, maxHeight: '75vh', overflowY: 'auto' as const, display: 'flex', flexDirection: 'column' as const, gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6, color: '#444', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Title *</label>
                <input value={form.title} onChange={e => { setF('title', e.target.value); if (!editing) setF('slug', slugify(e.target.value)) }} style={inp} placeholder="e.g. How to Choose the Right Paper for Business Cards" />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6, color: '#444', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Slug * ({SITE_URL}/blog/<strong>{form.slug || 'slug'}</strong>)</label>
                <input value={form.slug} onChange={e => setF('slug', slugify(e.target.value))} style={inp} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6, color: '#444', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Author</label>
                  <input value={form.author} onChange={e => setF('author', e.target.value)} style={inp} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6, color: '#444', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Category</label>
                  <input value={form.category} onChange={e => setF('category', e.target.value)} style={inp} placeholder="e.g. Printing Tips" />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6, color: '#444', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Excerpt</label>
                <textarea value={form.excerpt} onChange={e => setF('excerpt', e.target.value)} style={{ ...inp, minHeight: 72, resize: 'vertical' as const }} placeholder="Short summary shown in blog listings..." />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6, color: '#444', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Body Content (HTML)</label>
                <textarea value={form.body} onChange={e => setF('body', e.target.value)} style={{ ...inp, minHeight: 200, resize: 'vertical' as const }} placeholder="<p>Full article content...</p>" />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6, color: '#444', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Featured Image URL</label>
                <input value={form.featured_image} onChange={e => setF('featured_image', e.target.value)} style={inp} placeholder="https://..." />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6, color: '#444', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Tags (comma separated)</label>
                <input value={form.tags} onChange={e => setF('tags', e.target.value)} style={inp} placeholder="printing, abuja, business cards" />
              </div>
              <div style={{ borderTop: '1px solid #e8e8e5', paddingTop: 14 }}>
                <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 13, marginBottom: 10, color: '#1A1A1A' }}>SEO</div>
                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
                  <input value={form.seo_title} onChange={e => setF('seo_title', e.target.value)} style={inp} placeholder="SEO Title (blank = post title)" />
                  <textarea value={form.meta_description} onChange={e => setF('meta_description', e.target.value)} style={{ ...inp, minHeight: 64, resize: 'vertical' as const }} placeholder="Meta description (150-160 chars)" maxLength={160} />
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                <input type="checkbox" checked={form.is_published} onChange={e => setF('is_published', e.target.checked)} style={{ accentColor: 'var(--red)', width: 16, height: 16 }} />
                <span style={{ color: '#444', fontWeight: 600 }}>Publish (visible to public and indexed by Google)</span>
              </label>
            </div>
            <div style={{ padding: '16px 24px', background: 'white', borderRadius: '0 0 16px 16px', borderTop: '1px solid #e8e8e5', display: 'flex', gap: 10 }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '12px', background: '#f5f5f3', border: '1px solid #e8e8e5', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 600, fontSize: 14, cursor: 'pointer', color: '#444' }}>Cancel</button>
              <button onClick={save} disabled={saving} style={{ flex: 2, padding: '12px', background: saving ? '#ccc' : 'var(--red)', color: 'white', border: 'none', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Saving...' : editing ? 'Update Post' : 'Create Post'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}