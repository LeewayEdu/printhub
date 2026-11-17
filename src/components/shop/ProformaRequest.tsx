'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { FileText } from 'lucide-react'
import { buildProforma, PROFORMA_STORAGE_KEY, type ProformaCartItem, type ProformaDelivery } from '@/lib/proforma'

// "Request pro-forma" button with a small inline form. On submit it records a lead
// (source quote_form) without waiting for the result, stores the invoice for the
// printable page and opens /pro-forma in a new tab.
export default function ProformaRequest({ items, delivery, prefill }: {
  items: ProformaCartItem[]
  delivery?: ProformaDelivery | null
  prefill?: { name?: string; phone?: string; email?: string }
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(prefill?.name || '')
  const [company, setCompany] = useState('')
  const [phone, setPhone] = useState(prefill?.phone || '')
  const [email, setEmail] = useState(prefill?.email || prefill?.email || '')
  const [hp, setHp] = useState('')   // honeypot, must stay empty

  if (items.length === 0) return null

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { toast.error('Please enter your name'); return }
    if (phone.replace(/\D/g, '').length < 10) { toast.error('Please enter a phone number we can reach you on'); return }
    const doc = buildProforma(items, delivery ?? null, { name: name.trim(), company: company.trim() || undefined, phone: phone.trim(), email: email.trim() || undefined })
    try { sessionStorage.setItem(PROFORMA_STORAGE_KEY, JSON.stringify(doc)) } catch { /* private mode */ }

    // Record the lead, never blocking the invoice if it fails
    try {
      fetch('/api/leads', {
        method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'quote_form', website: hp, name: name.trim(), phone: phone.trim(), email: email.trim() || undefined,
          product_interest: doc.lines.map(l => l.name).join('; ').slice(0, 200),
          notes: `Pro-forma ${doc.number}${company.trim() ? ` for ${company.trim()}` : ''}. Total ₦${doc.total.toLocaleString()}. ${doc.lines.length} item(s).`,
        }),
      }).catch(() => {})
    } catch { /* ignore */ }

    window.open('/pro-forma', '_blank')
    setOpen(false)
  }

  const input: React.CSSProperties = { padding: '8px 10px', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 14, fontFamily: 'Open Sans', width: '100%' }

  return (
    <div style={{ marginTop: 12 }}>
      {!open ? (
        <button type="button" onClick={() => setOpen(true)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px', background: 'white', color: 'var(--text-primary)', border: '1.5px solid var(--border-color)', borderRadius: 10, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
          <FileText size={16} /> Request pro-forma invoice
        </button>
      ) : (
        <form onSubmit={submit} style={{ border: '1px solid var(--border-color)', borderRadius: 12, padding: 14, display: 'grid', gap: 8 }}>
          <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14 }}>Pro-forma invoice</div>
          <input aria-label="Your name" placeholder="Your name *" value={name} onChange={e => setName(e.target.value)} style={input} />
          <input aria-label="Company (optional)" placeholder="Company (optional)" value={company} onChange={e => setCompany(e.target.value)} style={input} />
          <input aria-label="Phone number" placeholder="Phone / WhatsApp *" inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)} style={input} />
          <input aria-label="Email (optional)" placeholder="Email (optional)" type="email" value={email} onChange={e => setEmail(e.target.value)} style={input} />
          <input name="website" value={hp} onChange={e => setHp(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true"
            style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => setOpen(false)} style={{ flex: 1, padding: 10, background: 'white', border: '1px solid var(--border-color)', borderRadius: 8, cursor: 'pointer', fontFamily: 'Montserrat', fontWeight: 600, fontSize: 13 }}>Cancel</button>
            <button type="submit" style={{ flex: 2, padding: 10, background: 'var(--red)', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'Montserrat', fontWeight: 700, fontSize: 13 }}>Create invoice</button>
          </div>
        </form>
      )}
    </div>
  )
}
