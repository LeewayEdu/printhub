'use client'

import { useEffect, useState } from 'react'
import { BRAND, BANK_DETAILS, PROFORMA_VALIDITY_DAYS } from '@/lib/constants'
import { PROFORMA_STORAGE_KEY, type Proforma } from '@/lib/proforma'

const money = (n: number) => `₦${Math.round(n).toLocaleString('en-NG')}`
const date = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

// Plain black-and-white, Arial, print-ready. "Save as PDF" in the print dialog gives the PDF
// (no PDF library is needed).
export default function ProformaPage() {
  const [doc, setDoc] = useState<Proforma | null>(null)
  const [missing, setMissing] = useState(false)

  // the chat launcher would sit on top of the totals
  useEffect(() => {
    document.body.classList.add('hide-launcher')
    return () => document.body.classList.remove('hide-launcher')
  }, [])

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(PROFORMA_STORAGE_KEY)
      if (raw) setDoc(JSON.parse(raw)); else setMissing(true)
    } catch { setMissing(true) }
  }, [])

  if (missing) {
    return (
      <div style={{ maxWidth: 560, margin: '80px auto', padding: 24, fontFamily: 'Arial, sans-serif' }}>
        <h1 style={{ fontSize: 22, marginBottom: 12 }}>No invoice to show</h1>
        <p style={{ lineHeight: 1.6 }}>Open your cart and choose “Request pro-forma invoice” to create one.</p>
        <a href="/cart" style={{ color: '#000' }}>Go to cart</a>
      </div>
    )
  }
  if (!doc) return null

  const th: React.CSSProperties = { textAlign: 'left', padding: '8px 6px', borderBottom: '2px solid #000', fontSize: 12 }
  const td: React.CSSProperties = { padding: '8px 6px', borderBottom: '1px solid #ccc', verticalAlign: 'top', fontSize: 13 }
  const num: React.CSSProperties = { textAlign: 'right', whiteSpace: 'nowrap' }

  return (
    <div style={{ background: '#fff', color: '#000', fontFamily: 'Arial, Helvetica, sans-serif' }}>
      <div className="no-print" style={{ maxWidth: 820, margin: '0 auto', padding: '16px 24px', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button onClick={() => window.print()} style={{ padding: '10px 18px', background: '#000', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer', fontFamily: 'Arial' }}>
          Print or save as PDF
        </button>
      </div>

      <article style={{ maxWidth: 820, margin: '0 auto', padding: '8px 24px 48px' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', gap: 24, borderBottom: '2px solid #000', paddingBottom: 14, marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{BRAND.company}</div>
            <div style={{ fontSize: 12, lineHeight: 1.6, marginTop: 4 }}>
              {BRAND.address}<br />Tel: {BRAND.phone1} · {BRAND.phone2}<br />{BRAND.email}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 22, fontWeight: 700 }}>PRO-FORMA INVOICE</div>
            <div style={{ fontSize: 12, lineHeight: 1.7, marginTop: 4 }}>
              No: <strong>{doc.number}</strong><br />
              Date: {date(doc.issued)}<br />
              Valid until: {date(doc.validUntil)}
            </div>
          </div>
        </header>

        <section style={{ marginBottom: 18, fontSize: 13, lineHeight: 1.6 }}>
          <div style={{ fontWeight: 700 }}>Bill to</div>
          {doc.customer.name}{doc.customer.company ? ` — ${doc.customer.company}` : ''}<br />
          {doc.customer.phone}{doc.customer.email ? ` · ${doc.customer.email}` : ''}
        </section>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr><th style={th}>Item and options</th><th style={{ ...th, ...num }}>Qty</th><th style={{ ...th, ...num }}>Unit price</th><th style={{ ...th, ...num }}>Design fee</th><th style={{ ...th, ...num }}>Amount</th></tr>
          </thead>
          <tbody>
            {doc.lines.map((l, i) => (
              <tr key={i}>
                <td style={td}>
                  <strong>{l.name}</strong>
                  {l.options.length > 0 && <div style={{ fontSize: 12, marginTop: 3 }}>{l.options.join(' · ')}</div>}
                  {l.designNote && <div style={{ fontSize: 12, marginTop: 2 }}>{l.designNote}</div>}
                </td>
                <td style={{ ...td, ...num }}>{l.qtyLabel}</td>
                <td style={{ ...td, ...num }}>{l.unitPrice !== null ? money(l.unitPrice) : '—'}</td>
                <td style={{ ...td, ...num }}>{l.designFee > 0 ? money(l.designFee) : '—'}</td>
                <td style={{ ...td, ...num }}>{money(l.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <table style={{ width: 300, marginLeft: 'auto', marginTop: 14, borderCollapse: 'collapse', fontSize: 13 }}>
          <tbody>
            <tr><td style={{ padding: '4px 6px' }}>Items (VAT inclusive)</td><td style={{ ...num, padding: '4px 6px' }}>{money(doc.itemsTotal)}</td></tr>
            <tr><td style={{ padding: '4px 6px', fontSize: 12 }}>of which VAT ({doc.vatRate}%)</td><td style={{ ...num, padding: '4px 6px', fontSize: 12 }}>{money(doc.vatIncluded)}</td></tr>
            <tr><td style={{ padding: '4px 6px' }}>Delivery{doc.delivery ? ` (${doc.delivery.label})` : ''}</td><td style={{ ...num, padding: '4px 6px' }}>{doc.delivery ? (doc.delivery.fee === 0 ? 'Free' : money(doc.delivery.fee)) : 'To be confirmed'}</td></tr>
            <tr><td style={{ padding: '8px 6px', borderTop: '2px solid #000', fontWeight: 700 }}>Total{doc.delivery ? '' : ' (excl. delivery)'}</td><td style={{ ...num, padding: '8px 6px', borderTop: '2px solid #000', fontWeight: 700 }}>{money(doc.total)}</td></tr>
          </tbody>
        </table>

        <section style={{ marginTop: 28, fontSize: 13, lineHeight: 1.6 }}>
          <div style={{ fontWeight: 700 }}>Payment details</div>
          Bank: {BANK_DETAILS.bankName}<br />
          Account name: {BANK_DETAILS.accountName}<br />
          Account number: {BANK_DETAILS.accountNumber}<br />
          Please use <strong>{doc.number}</strong> as the payment reference.
        </section>

        <section style={{ marginTop: 20, fontSize: 12, lineHeight: 1.6 }}>
          This is a pro-forma invoice (a price quotation), not a receipt. It is valid for {PROFORMA_VALIDITY_DAYS} days from the date above. Production begins once full payment is received; see our Terms of Service at printhub.cchumedia.com/terms.
        </section>
      </article>

      <style>{`
        @media print {
          .no-print, .skip-link, nav, header.site-header { display: none !important; }
          body { background: #fff !important; }
          @page { margin: 14mm; }
        }
      `}</style>
    </div>
  )
}
