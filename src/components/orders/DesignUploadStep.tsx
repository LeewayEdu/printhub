'use client'

import { useState } from 'react'
import { Upload, Link2, Loader2, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase/client'
import { itemAwaitingDesign } from '@/lib/design-status'
import { BRAND } from '@/lib/constants'

const PRINT_ACCEPT = '.pdf,.png,.jpg,.jpeg,.tif,.tiff,.ai,.eps,.psd,.cdr'
const MAX_MB = 50

interface Item { id: string; name: string; has_own_design?: boolean | null; design_file_url?: string | null; design_link?: string | null }

// "Upload your design file" step shown after payment: on the order confirmation page, in My orders, and
// (for an admin attaching a file on the customer's behalf) in the admin order view.
export default function DesignUploadStep({ orderId, orderRef, items, onChanged, adminMode = false }: {
  orderId: string; orderRef: string; items: Item[]; onChanged: () => void; adminMode?: boolean
}) {
  const waiting = items.filter(itemAwaitingDesign)
  const [mode, setMode] = useState<Record<string, 'file' | 'link'>>({})
  const [links, setLinks] = useState<Record<string, string>>({})
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)

  if (waiting.length === 0) return null

  const send = async (itemId: string, payload: { fileUrl?: string; link?: string }) => {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/orders/design', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
      body: JSON.stringify({ orderId, itemId, notes: notes[itemId] || '', ...payload }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json.error || 'Could not save your design')
  }

  const upload = async (itemId: string, file: File) => {
    if (file.size > MAX_MB * 1024 * 1024) { toast.error(`That file is over ${MAX_MB} MB. Please paste a link instead.`); return }
    setBusy(itemId)
    try {
      const ext = (file.name.split('.').pop() || 'bin').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8) || 'bin'
      const path = `design-files/${orderId}-${itemId}-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('products').upload(path, file, { upsert: false })
      if (upErr) throw upErr
      const { data } = supabase.storage.from('products').getPublicUrl(path)
      await send(itemId, { fileUrl: data.publicUrl })
      toast.success('Design file received. Thank you!')
      onChanged()
    } catch (e: any) { toast.error(e?.message || 'Upload failed. Please try again.') }
    setBusy(null)
  }

  const saveLink = async (itemId: string) => {
    const url = (links[itemId] || '').trim()
    if (!url) { toast.error('Please paste a link first'); return }
    setBusy(itemId)
    try { await send(itemId, { link: url }); toast.success('Design link received. Thank you!'); onChanged() }
    catch (e: any) { toast.error(e?.message || 'Could not save the link') }
    setBusy(null)
  }

  return (
    <section aria-labelledby={`design-step-${orderId}`} style={{ background: '#fffbeb', border: '2px solid #f59e0b', borderRadius: 12, padding: '18px 20px', textAlign: 'left' }}>
      <h2 id={`design-step-${orderId}`} style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 17, color: '#78350f', marginBottom: 6 }}>
        {adminMode ? 'Design file still missing' : 'Next step: upload your design file'}
      </h2>
      <p style={{ fontSize: 13, color: '#92400e', lineHeight: 1.6, marginBottom: 14 }}>
        {adminMode
          ? 'Production cannot start until a file or link is attached to each item below. Attach one here if the customer sent it another way.'
          : <>We will not start printing until we have your file. You can upload it now or come back later from <strong>My orders</strong>. PDF, PNG, JPG, AI, PSD, EPS, TIFF or CDR, up to {MAX_MB} MB. Prefer WhatsApp? <a href={`https://wa.me/${BRAND.whatsapp}?text=${encodeURIComponent(`Hello, I am sending the design file for order #${orderRef}`)}`} target="_blank" rel="noopener noreferrer" style={{ color: '#92400e', fontWeight: 700 }}>Send it to us there</a>.</>}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {waiting.map(item => {
          const m = mode[item.id] || 'file'
          const working = busy === item.id
          return (
            <div key={item.id} style={{ background: 'white', border: '1px solid #fcd34d', borderRadius: 10, padding: 14 }}>
              <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 13, marginBottom: 10 }}>{item.name}</div>
              <div role="group" aria-label="How to send your design" style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                {(['file', 'link'] as const).map(k => (
                  <button key={k} type="button" aria-pressed={m === k} onClick={() => setMode(p => ({ ...p, [item.id]: k }))}
                    style={{ padding: '7px 14px', borderRadius: 8, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 12, cursor: 'pointer', border: '2px solid #92400e', background: m === k ? '#92400e' : 'white', color: m === k ? 'white' : '#92400e' }}>
                    {k === 'file' ? 'Upload file' : 'Paste link'}
                  </button>
                ))}
              </div>
              {m === 'file' ? (
                <label style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', border: '2px dashed #f59e0b', borderRadius: 9, cursor: working ? 'wait' : 'pointer', fontSize: 13, color: '#78350f' }}>
                  {working ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Uploading…</> : <><Upload size={15} /> Choose a file to upload</>}
                  <input type="file" accept={PRINT_ACCEPT} disabled={working} style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}
                    aria-label={`Upload design file for ${item.name}`}
                    onChange={e => { const f = e.target.files?.[0]; if (f) upload(item.id, f); e.target.value = '' }} />
                </label>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input value={links[item.id] || ''} onChange={e => setLinks(p => ({ ...p, [item.id]: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') saveLink(item.id) }}
                    aria-label={`Design link for ${item.name}`} placeholder="https://drive.google.com/… or Dropbox / WeTransfer link"
                    className="form-input" style={{ flex: 1, fontSize: 13 }} />
                  <button type="button" onClick={() => saveLink(item.id)} disabled={working}
                    style={{ padding: '10px 16px', background: '#92400e', color: 'white', border: 'none', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Link2 size={14} /> {working ? 'Saving…' : 'Save'}
                  </button>
                </div>
              )}
              <input value={notes[item.id] || ''} onChange={e => setNotes(p => ({ ...p, [item.id]: e.target.value }))}
                aria-label={`Notes for the design team for ${item.name}`} placeholder="Notes for the design team (optional)"
                className="form-input" style={{ fontSize: 12, marginTop: 10 }} />
            </div>
          )
        })}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </section>
  )
}

export function DesignReceivedNote() {
  return (
    <div role="status" style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: '10px 14px', fontSize: 13, fontWeight: 600, color: '#166534' }}>
      <CheckCircle size={15} /> Design file received. We will send you a proof before printing.
    </div>
  )
}
