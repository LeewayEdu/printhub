'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase/client'
import { UPLOAD_RULES, validateDeclared, type UploadKind } from '@/lib/books/uploads'

type Tab = 'books' | 'authors' | 'settings'
const card: React.CSSProperties = { background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }
const lab: React.CSSProperties = { fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }
const btn: React.CSSProperties = { padding: '9px 16px', borderRadius: 8, border: 'none', background: 'var(--red)', color: '#fff', fontFamily: 'Montserrat', fontWeight: 700, fontSize: 13, cursor: 'pointer' }
const ghost: React.CSSProperties = { ...btn, background: 'white', color: 'var(--text-primary)', border: '1px solid var(--border)' }

async function api(body: object) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch('/api/admin/books', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` }, body: JSON.stringify(body) })
  const json = await res.json().catch(() => ({}))
  return { ok: res.ok, ...json }
}
async function adminPost(path: string, body: object) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` }, body: JSON.stringify(body) })
  return { ok: res.ok, ...(await res.json().catch(() => ({}))) }
}

const emptyFormats = () => [
  { type: 'ebook', on: false, price_ngn: '', price_usd: '', stock: '', print_cost_ngn: '', has_pdf: false, has_epub: false },
  { type: 'print', on: false, price_ngn: '', price_usd: '', stock: '', print_cost_ngn: '', has_pdf: false, has_epub: false },
  { type: 'bundle', on: false, price_ngn: '', price_usd: '', stock: '', print_cost_ngn: '', has_pdf: false, has_epub: false },
]

export default function AdminBooksPage() {
  const router = useRouter()
  const [ok, setOk] = useState(false)
  const [tab, setTab] = useState<Tab>('books')
  const [data, setData] = useState<any>(null)
  const [editing, setEditing] = useState<any | null>(null)      // book form state
  const [authorForm, setAuthorForm] = useState<any | null>(null)
  const [blockers, setBlockers] = useState<string[]>([])
  const [uploading, setUploading] = useState<string | null>(null)
  const [rightsNote, setRightsNote] = useState('')

  const load = useCallback(async () => { const r = await api({ action: 'list' }); if (r.ok) setData(r); else toast.error(r.error || 'Could not load books') }, [])

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth'); return }
      const { data: p } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
      if (!['admin', 'super_admin'].includes(p?.role)) { router.push('/dashboard'); return }
      setOk(true); load()
    })()
  }, [router, load])

  const openBook = (b?: any) => {
    setBlockers([])
    setRightsNote(b?.rights_note || '')
    const fm = emptyFormats()
    for (const f of b?.formats || []) { const slot = fm.find(x => x.type === f.type); if (slot) Object.assign(slot, { on: f.active, price_ngn: f.price_ngn ?? '', price_usd: f.price_usd ?? '', stock: f.stock ?? '', print_cost_ngn: f.print_cost_ngn ?? '', has_pdf: f.has_pdf, has_epub: f.has_epub }) }
    setEditing({
      id: b?.id, title: b?.title || '', slug: b?.slug || '', subtitle: b?.subtitle || '', description: b?.description || '', author_id: b?.author_id || data?.authors?.[0]?.id || '',
      royalty_option: b?.royalty_option || 'distribution', language: b?.language || 'English', categories: (b?.categories || []).join(', '), isbn: b?.isbn || '', page_count: b?.page_count || '', published_date: b?.published_date || '',
      seo_title: b?.seo_title || '', seo_description: b?.seo_description || '', rights_document_ref: b?.rights_document_ref || '',
      status: b?.status || 'draft', rights_confirmed: !!b?.rights_confirmed, cover_url: b?.cover_url || '', preview_url: b?.preview_url || '',
      formats: fm, rule: { option_name: b?.rule?.option_name || '', ebook_author_share_pct: b?.rule?.ebook_author_share_pct ?? '', print_author_share_pct: b?.rule?.print_author_share_pct ?? '', referral_share_pct: b?.rule?.referral_share_pct ?? '', hold_days: b?.rule?.hold_days ?? 30, minimum_payout: b?.rule?.minimum_payout ?? 5000 },
      hasRule: !!b?.rule,
    })
  }

  const saveBook = async () => {
    const e = editing
    const r = await api({
      action: 'save_book', book: e,
      formats: e.formats.filter((f: any) => f.on || f.price_ngn !== '').map((f: any) => ({ type: f.type, price_ngn: f.price_ngn, price_usd: f.price_usd, stock: f.stock, print_cost_ngn: f.print_cost_ngn, active: f.on })),
      rule: e.hasRule ? e.rule : undefined,
    })
    if (!r.ok) { toast.error(r.error || 'Could not save'); return null }
    toast.success('Saved')
    await load()
    setEditing((x: any) => ({ ...x, id: r.id }))
    return r.id as string
  }

  const upload = async (kind: UploadKind, file: File) => {
    let id = editing.id
    if (!id) { id = await saveBook(); if (!id) return }
    const problem = validateDeclared(kind, file.name, file.size, file.type)
    if (problem) { toast.error(problem); return }
    setUploading(kind)
    try {
      const u = await adminPost('/api/admin/books/upload-url', { bookId: id, kind, filename: file.name, size: file.size, contentType: file.type })
      if (!u.ok) throw new Error(u.error)
      const { error } = await supabase.storage.from(u.bucket).uploadToSignedUrl(u.path, u.token, file, { contentType: file.type || undefined })
      if (error) throw error
      const c = await adminPost('/api/admin/books/upload-confirm', { bookId: id, kind, path: u.path })
      if (!c.ok) throw new Error(c.error)
      toast.success('File uploaded and checked')
      await load()
      const fresh = (await api({ action: 'list' })).books?.find((b: any) => b.id === id)
      if (fresh) openBookKeepForm(fresh)
    } catch (err: any) { toast.error(err?.message || 'Upload failed') }
    setUploading(null)
  }
  // refresh file flags without discarding what is typed
  const openBookKeepForm = (fresh: any) => setEditing((x: any) => ({ ...x, id: fresh.id, cover_url: fresh.cover_url || '', preview_url: fresh.preview_url || '',
    formats: x.formats.map((f: any) => { const nf = fresh.formats.find((y: any) => y.type === f.type); return nf ? { ...f, has_pdf: nf.has_pdf, has_epub: nf.has_epub } : f }) }))

  const setRights = async (confirmed: boolean) => {
    if (!editing.id) { toast.error('Save the book first'); return }
    const r = await api({ action: 'set_rights', bookId: editing.id, confirmed, note: rightsNote, documentRef: editing.rights_document_ref })
    if (!r.ok) { toast.error(r.error); return }
    toast.success(confirmed ? 'Rights confirmed and recorded' : 'Rights withdrawn; the book was unpublished')
    await load()
    const fresh = (await api({ action: 'list' })).books?.find((b: any) => b.id === editing.id)
    if (fresh) setEditing((x: any) => ({ ...x, rights_confirmed: fresh.rights_confirmed, status: fresh.status }))
  }

  const publish = async (publishIt: boolean) => {
    setBlockers([])
    const r = await api({ action: publishIt ? 'publish' : 'unpublish', bookId: editing.id })
    if (!r.ok) { setBlockers(r.blockers || [r.error]); toast.error(r.error || 'Not published'); return }
    toast.success(publishIt ? 'Published' : 'Unpublished')
    await load()
    setEditing((x: any) => ({ ...x, status: publishIt ? 'published' : 'draft' }))
  }

  const saveAuthor = async () => {
    const { website, twitter, instagram, ...rest } = authorForm
    const r = await api({ action: 'save_author', author: { ...rest, social_links: { website, twitter, instagram } } })
    if (!r.ok) { toast.error(r.error); return }
    toast.success('Author saved'); setAuthorForm(null); load()
  }

  if (!ok || !data) return <div role="status" style={{ padding: 40, textAlign: 'center' }}>Loading…</div>
  const set = (k: string, v: any) => setEditing((x: any) => ({ ...x, [k]: v }))
  const setRule = (k: string, v: any) => setEditing((x: any) => ({ ...x, hasRule: true, rule: { ...x.rule, [k]: v } }))
  const setFormat = (type: string, k: string, v: any) => setEditing((x: any) => ({ ...x, formats: x.formats.map((f: any) => f.type === type ? { ...f, [k]: v } : f) }))

  return (
    <div>
      <h1 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 22, marginBottom: 12 }}>C-Chu Books</h1>
      <div role="tablist" style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(['books', 'authors', 'settings'] as Tab[]).map(t => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => { setTab(t); setEditing(null); setAuthorForm(null) }} style={{ ...(tab === t ? btn : ghost), textTransform: 'capitalize' }}>{t === 'settings' ? 'Defaults and settings' : t}</button>
        ))}
      </div>

      {tab === 'books' && !editing && (
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <strong>{data.books.length} book{data.books.length === 1 ? '' : 's'}</strong>
            <button style={btn} onClick={() => { if (!data.authors.length) { toast.error('Add an author first'); return } openBook() }}>New book</button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr style={{ textAlign: 'left', borderBottom: '2px solid var(--border)' }}><th style={{ padding: 8 }}>Title</th><th>Author</th><th>Status</th><th>Rights</th><th>Formats</th><th>Alerts</th><th>Sold</th><th /></tr></thead>
              <tbody>{data.books.map((b: any) => (
                <tr key={b.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: 8, fontWeight: 600 }}>{b.title}</td><td>{b.author_name}</td>
                  <td><span style={{ padding: '2px 10px', borderRadius: 20, background: b.status === 'published' ? '#dcfce7' : '#f3f4f6', color: b.status === 'published' ? '#166534' : '#555', fontWeight: 700, fontSize: 12 }}>{b.status}</span></td>
                  <td>{b.rights_confirmed ? 'Confirmed' : <span style={{ color: '#b91c1c' }}>Not confirmed</span>}</td>
                  <td>{b.formats.filter((f: any) => f.active).map((f: any) => f.type).join(', ') || '-'}</td>
                  <td>{b.formats.some((f: any) => f.active && f.type !== 'ebook' && (f.print_cost_ngn == null || f.print_cost_ngn === '')) ? <span style={{ color: '#b91c1c', fontWeight: 700, fontSize: 12 }}>print cost missing</span> : <span style={{ color: 'var(--gray)' }}>-</span>}</td>
                  <td>{b.sales}</td>
                  <td><button style={ghost} onClick={() => openBook(b)}>Edit</button></td>
                </tr>))}
              </tbody>
            </table>
            {data.books.length === 0 && <p style={{ padding: 20, textAlign: 'center', color: 'var(--gray)' }}>No books yet.</p>}
          </div>
        </div>
      )}

      {tab === 'books' && editing && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={card}>
            <h2 style={{ fontSize: 16, marginBottom: 12 }}>{editing.id ? 'Edit book' : 'New book'}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
              <div><label style={lab} htmlFor="b-title">Title</label><input id="b-title" className="form-input" value={editing.title} onChange={e => set('title', e.target.value)} /></div>
              <div><label style={lab} htmlFor="b-slug">Slug (web address)</label><input id="b-slug" className="form-input" value={editing.slug} placeholder="auto from title" onChange={e => set('slug', e.target.value)} /></div>
              <div><label style={lab} htmlFor="b-sub">Subtitle</label><input id="b-sub" className="form-input" value={editing.subtitle} onChange={e => set('subtitle', e.target.value)} /></div>
              <div><label style={lab} htmlFor="b-author">Author</label><select id="b-author" className="form-input" value={editing.author_id} onChange={e => set('author_id', e.target.value)}>{data.authors.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
              <div><label style={lab} htmlFor="b-roy">Royalty option</label>
                <select id="b-roy" className="form-input" value={editing.royalty_option} onChange={e => set('royalty_option', e.target.value)}>
                  <option value="distribution">Distribution-only author</option><option value="package">C-Chu publishing package</option>
                </select></div>
              <div><label style={lab} htmlFor="b-lang">Language</label><input id="b-lang" className="form-input" value={editing.language} onChange={e => set('language', e.target.value)} /></div>
              <div><label style={lab} htmlFor="b-cats">Categories (comma separated)</label><input id="b-cats" className="form-input" value={editing.categories} onChange={e => set('categories', e.target.value)} /></div>
              <div><label style={lab} htmlFor="b-isbn">ISBN</label><input id="b-isbn" className="form-input" value={editing.isbn} onChange={e => set('isbn', e.target.value)} /></div>
              <div><label style={lab} htmlFor="b-pages">Pages</label><input id="b-pages" type="number" className="form-input" value={editing.page_count} onChange={e => set('page_count', e.target.value)} /></div>
              <div><label style={lab} htmlFor="b-date">Published date</label><input id="b-date" type="date" className="form-input" value={editing.published_date} onChange={e => set('published_date', e.target.value)} /></div>
              <div><label style={lab} htmlFor="b-seot">SEO title (optional)</label><input id="b-seot" className="form-input" value={editing.seo_title} onChange={e => set('seo_title', e.target.value)} /></div>
            </div>
            <div style={{ marginTop: 12 }}><label style={lab} htmlFor="b-desc">Description</label><textarea id="b-desc" className="form-input" rows={5} value={editing.description} onChange={e => set('description', e.target.value)} /></div>
            <div style={{ marginTop: 12 }}><label style={lab} htmlFor="b-seod">SEO description (optional, 155 characters)</label><input id="b-seod" className="form-input" value={editing.seo_description} onChange={e => set('seo_description', e.target.value)} /></div>
          </div>

          <div style={card}>
            <h2 style={{ fontSize: 16, marginBottom: 4 }}>Formats and prices</h2>
            <p style={{ fontSize: 12, color: 'var(--gray)', marginBottom: 12 }}>Tick a format to sell it. USD applies to ebooks only and shows only while the USD switch is on. Print cost is per copy and is used only for royalties.</p>
            {editing.formats.map((f: any) => (
              <div key={f.type} style={{ display: 'grid', gridTemplateColumns: 'minmax(120px,150px) repeat(auto-fit, minmax(110px, 1fr))', gap: 10, alignItems: 'end', marginBottom: 10 }}>
                <label style={{ fontWeight: 700, textTransform: 'capitalize' }}><input type="checkbox" checked={f.on} onChange={e => setFormat(f.type, 'on', e.target.checked)} /> {f.type}</label>
                <div><label style={lab}>Price (₦)</label><input className="form-input" type="number" min={0} value={f.price_ngn} onChange={e => setFormat(f.type, 'price_ngn', e.target.value)} /></div>
                {f.type === 'ebook' && <div><label style={lab}>Price (USD, optional)</label><input className="form-input" type="number" min={0} step="0.01" value={f.price_usd} onChange={e => setFormat(f.type, 'price_usd', e.target.value)} /></div>}
                {f.type !== 'ebook' && <div><label style={lab}>Stock</label><input className="form-input" type="number" min={0} value={f.stock} placeholder="blank = unlimited" onChange={e => setFormat(f.type, 'stock', e.target.value)} /></div>}
                {f.type !== 'ebook' && <div><label style={lab}>Print cost (₦ per copy)</label><input className="form-input" type="number" min={0} value={f.print_cost_ngn} onChange={e => setFormat(f.type, 'print_cost_ngn', e.target.value)} />
                  {f.on && f.print_cost_ngn === '' && <div role="alert" style={{ color: '#b91c1c', fontSize: 12, fontWeight: 700, marginTop: 4 }}>Print cost missing: sales of this format are flagged "needs print cost" and the author share stays 0 until it is set.</div>}</div>}
              </div>
            ))}
          </div>

          <div style={card}>
            <h2 style={{ fontSize: 16, marginBottom: 4 }}>Files</h2>
            <p style={{ fontSize: 12, color: 'var(--gray)', marginBottom: 12 }}>Save the book (with an ebook format) before uploading. Ebook files go to a private store and are never shown publicly. Every file is checked after upload.</p>
            {(['cover', 'preview', 'ebook_pdf', 'ebook_epub'] as UploadKind[]).map(k => {
              const have = k === 'cover' ? !!editing.cover_url : k === 'preview' ? !!editing.preview_url : k === 'ebook_pdf' ? editing.formats.find((f: any) => f.type === 'ebook')?.has_pdf : editing.formats.find((f: any) => f.type === 'ebook')?.has_epub
              return (
                <div key={k} style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 260px' }}><label style={lab} htmlFor={`up-${k}`}>{UPLOAD_RULES[k].label}</label>
                    <input id={`up-${k}`} type="file" disabled={uploading === k} accept={UPLOAD_RULES[k].exts.map(e => `.${e}`).join(',')} onChange={e => { const f = e.target.files?.[0]; if (f) upload(k, f); e.target.value = '' }} /></div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: have ? '#166534' : '#b45309' }}>{uploading === k ? 'Uploading…' : have ? 'Uploaded' : 'Not uploaded'}</span>
                </div>
              )
            })}
          </div>

          <div style={card}>
            <h2 style={{ fontSize: 16, marginBottom: 4 }}>Royalty rule for this book</h2>
            <p style={{ fontSize: 12, color: 'var(--gray)', marginBottom: 12 }}>Leave blank to use the default rule (Defaults and settings). Percentages are stored in the database. With no rule at all, sales are recorded with an author share of 0 and a note.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
              <div><label style={lab}>Option name</label><input className="form-input" value={editing.rule.option_name} onChange={e => setRule('option_name', e.target.value)} /></div>
              <div><label style={lab}>Ebook author share %</label><input className="form-input" type="number" min={0} max={100} value={editing.rule.ebook_author_share_pct} onChange={e => setRule('ebook_author_share_pct', e.target.value)} /></div>
              <div><label style={lab}>Print author share %</label><input className="form-input" type="number" min={0} max={100} value={editing.rule.print_author_share_pct} onChange={e => setRule('print_author_share_pct', e.target.value)} /></div>
              <div><label style={lab}>Referral share %</label><input className="form-input" type="number" min={0} max={100} value={editing.rule.referral_share_pct} onChange={e => setRule('referral_share_pct', e.target.value)} /></div>
              <div><label style={lab}>Hold days</label><input className="form-input" type="number" min={0} value={editing.rule.hold_days} onChange={e => setRule('hold_days', e.target.value)} /></div>
              <div><label style={lab}>Minimum payout</label><input className="form-input" type="number" min={0} value={editing.rule.minimum_payout} onChange={e => setRule('minimum_payout', e.target.value)} /></div>
            </div>
          </div>

          <div style={card}>
            <h2 style={{ fontSize: 16, marginBottom: 4 }}>Rights and publishing</h2>
            <p style={{ fontSize: 12, color: 'var(--gray)', marginBottom: 12 }}>A book cannot be published until the rights are confirmed. Your name and the time are recorded.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
              <div><label style={lab} htmlFor="r-ref">Rights document reference</label><input id="r-ref" className="form-input" value={editing.rights_document_ref} onChange={e => set('rights_document_ref', e.target.value)} placeholder="e.g. signed author agreement, 12 Mar 2026" /></div>
              <div><label style={lab} htmlFor="r-note">Confirmation note (required)</label><input id="r-note" className="form-input" value={rightsNote} onChange={e => setRightsNote(e.target.value)} /></div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, color: editing.rights_confirmed ? '#166534' : '#b91c1c' }}>{editing.rights_confirmed ? 'Rights confirmed' : 'Rights not confirmed'}</span>
              {!editing.rights_confirmed ? <button style={btn} onClick={() => setRights(true)}>Confirm rights</button> : <button style={ghost} onClick={() => setRights(false)}>Withdraw confirmation (unpublishes)</button>}
              <span style={{ marginLeft: 'auto', fontWeight: 700 }}>Status: {editing.status}</span>
              {editing.status === 'published' ? <button style={ghost} onClick={() => publish(false)}>Unpublish</button> : <button style={btn} onClick={() => publish(true)} disabled={!editing.id}>Publish</button>}
            </div>
            {blockers.length > 0 && (
              <div role="alert" style={{ marginTop: 12, padding: 12, background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, color: '#991b1b', fontSize: 13 }}>
                <strong>Not published. Fix these first:</strong>
                <ul style={{ margin: '6px 0 0 18px' }}>{blockers.map((b, i) => <li key={i}>{b}</li>)}</ul>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button style={btn} onClick={saveBook}>Save book</button>
            <button style={ghost} onClick={() => { setEditing(null); load() }}>Back to list</button>
          </div>
        </div>
      )}

      {tab === 'authors' && !authorForm && (
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}><strong>{data.authors.length} author{data.authors.length === 1 ? '' : 's'}</strong>
            <button style={btn} onClick={() => setAuthorForm({ name: '', slug: '', bio: '', photo_url: '', website: '', twitter: '', instagram: '', payout_details_ref: '', referral_code: '', status: 'draft' })}>New author</button></div>
          {data.authors.map((a: any) => (
            <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <span><strong>{a.name}</strong> <span style={{ fontSize: 12, color: 'var(--gray)' }}>/{a.slug} · {a.status}{a.referral_code ? ` · code ${a.referral_code}` : ''}</span></span>
              <button style={ghost} onClick={() => setAuthorForm({ ...a, bio: a.bio || '', photo_url: a.photo_url || '', website: a.social_links?.website || '', twitter: a.social_links?.twitter || '', instagram: a.social_links?.instagram || '', payout_details_ref: a.payout_details_ref || '', referral_code: a.referral_code || '' })}>Edit</button>
            </div>))}
        </div>
      )}
      {tab === 'authors' && authorForm && (
        <div style={card}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
            {[['name', 'Name'], ['slug', 'Slug'], ['photo_url', 'Photo URL'], ['website', 'Website'], ['twitter', 'X / Twitter URL'], ['instagram', 'Instagram URL'], ['payout_details_ref', 'Payout details reference (not bank details)'], ['referral_code', 'Referral code (for ?aref= links)']].map(([k, l]) => (
              <div key={k}><label style={lab} htmlFor={`a-${k}`}>{l}</label><input id={`a-${k}`} className="form-input" value={authorForm[k] || ''} onChange={e => setAuthorForm((x: any) => ({ ...x, [k]: e.target.value }))} /></div>))}
            <div><label style={lab} htmlFor="a-status">Status</label><select id="a-status" className="form-input" value={authorForm.status} onChange={e => setAuthorForm((x: any) => ({ ...x, status: e.target.value }))}><option value="draft">Draft</option><option value="published">Published</option></select></div>
          </div>
          <div style={{ marginTop: 12 }}><label style={lab} htmlFor="a-bio">Bio</label><textarea id="a-bio" className="form-input" rows={4} value={authorForm.bio} onChange={e => setAuthorForm((x: any) => ({ ...x, bio: e.target.value }))} /></div>
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button style={btn} onClick={saveAuthor}>Save author</button>
            <button style={ghost} onClick={() => setAuthorForm(null)}>Cancel</button>
          </div>
        </div>
      )}

      {tab === 'settings' && (
        <div style={{ display: 'grid', gap: 16 }}>
          {[['distribution', 'Distribution-only authors (default)'], ['package', 'C-Chu publishing package books']].map(([key, title]) => {
            const initial = (data.optionRules || []).find((r: any) => r.option_key === key) || (key === 'distribution' ? data.defaultRule : null)
            return (
              <div key={key} style={card}>
                <h2 style={{ fontSize: 16, marginBottom: 4 }}>{title}</h2>
                <p style={{ fontSize: 12, color: 'var(--gray)', marginBottom: 12 }}>
                  {initial ? 'Percentages are stored in the database. Referral share applies to ebook sales through the author\'s own link or code.' : 'Not set yet: run books-royalty-seed.sql or enter the percentages here. Until then, sales are recorded with an author share of 0 and a note.'}
                </p>
                <DefaultRule key={key + (initial?.id || 'new')} initial={initial} onSave={async rule => { const r = await api({ action: 'save_option_rule', optionKey: key, rule }); r.ok ? (toast.success('Saved'), load()) : toast.error(r.error) }} />
              </div>
            )
          })}
          <div style={card}>
            <h2 style={{ fontSize: 16, marginBottom: 4 }}>Affiliate commission on books</h2>
            <p style={{ fontSize: 12, color: 'var(--gray)', marginBottom: 12 }}>Separate from the 10% / 5% / 3% product tiers, which do not apply to book lines. Default 0%.</p>
            <SettingsRate initial={data.settings?.book_affiliate_rate ?? 0} onSave={async v => { const r = await api({ action: 'save_settings', book_affiliate_rate: v }); r.ok ? toast.success('Saved') : toast.error(r.error) }} />
          </div>
        </div>
      )}
    </div>
  )
}

function DefaultRule({ initial, onSave }: { initial: any; onSave: (r: any) => void }) {
  const [r, setR] = useState({ option_name: initial?.option_name || '', ebook_author_share_pct: initial?.ebook_author_share_pct ?? '', print_author_share_pct: initial?.print_author_share_pct ?? '', referral_share_pct: initial?.referral_share_pct ?? '', hold_days: initial?.hold_days ?? 30, minimum_payout: initial?.minimum_payout ?? 5000 })
  const f = (k: string, l: string) => <div key={k}><label style={lab}>{l}</label><input className="form-input" type={k === 'option_name' ? 'text' : 'number'} value={(r as any)[k]} onChange={e => setR(x => ({ ...x, [k]: e.target.value }))} /></div>
  return (<div><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
    {f('option_name', 'Option name')}{f('ebook_author_share_pct', 'Ebook author share %')}{f('print_author_share_pct', 'Print author share %')}{f('referral_share_pct', 'Referral share %')}{f('hold_days', 'Hold days')}{f('minimum_payout', 'Minimum payout')}</div>
    <button style={{ ...btn, marginTop: 12 }} onClick={() => onSave(r)}>Save default rule</button></div>)
}
function SettingsRate({ initial, onSave }: { initial: number; onSave: (v: number) => void }) {
  const [v, setV] = useState(String(initial))
  return (<div style={{ display: 'flex', gap: 10, alignItems: 'end' }}><div><label style={lab}>Book affiliate rate %</label><input className="form-input" type="number" min={0} max={100} value={v} onChange={e => setV(e.target.value)} /></div><button style={btn} onClick={() => onSave(Number(v))}>Save</button></div>)
}
