'use client'

import Link from 'next/link'
import { BRAND } from '@/lib/constants'

// WhatsApp call to action with the prefilled message from the case-study data. Tapping it records a lead
// (source "case_study", product_interest = the case slug) in the background: the link opens straight away
// and a failed or slow request never blocks it. Preview visits do not record leads.
export default function CaseCta({ slug, label, message, serviceHref, serviceLabel, track }: {
  slug: string; label: string; message: string; serviceHref: string; serviceLabel: string; track: boolean
}) {
  const href = `https://wa.me/${BRAND.whatsapp}?text=${encodeURIComponent(message)}`
  const onTap = () => {
    if (!track) return
    try {
      fetch('/api/leads', {
        method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'case_study', product_interest: slug, notes: 'Tapped the WhatsApp button on a case study page' }),
      }).catch(() => {})
    } catch { /* never block the link */ }
  }
  return (
    <section aria-labelledby="case-cta" style={{ background: 'var(--black, #111)', color: '#fff', borderRadius: 16, padding: 'clamp(20px, 4vw, 36px)', textAlign: 'center' }}>
      <h2 id="case-cta" style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 'clamp(20px, 3vw, 26px)', lineHeight: 1.25, margin: '0 0 18px' }}>{label}</h2>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <a href={href} target="_blank" rel="noopener noreferrer" onClick={onTap}
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#25D366', color: '#fff', fontFamily: 'Montserrat', fontWeight: 700, fontSize: 15, padding: '14px 24px', borderRadius: 10, textDecoration: 'none', minHeight: 48 }}>
          <span aria-hidden="true">💬</span> Get a quote on WhatsApp
        </a>
        <Link href={serviceHref}
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.5)', color: '#fff', fontFamily: 'Montserrat', fontWeight: 700, fontSize: 15, padding: '14px 24px', borderRadius: 10, textDecoration: 'none', minHeight: 48 }}>
          {serviceLabel}
        </Link>
      </div>
    </section>
  )
}
