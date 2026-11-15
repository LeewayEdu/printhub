'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { META_PIXEL_ID } from '@/lib/meta-pixel'
import { readConsent, writeConsent } from './consent'

// Asks once before the Meta Pixel is allowed to load. Not shown when no pixel is configured.
export default function ConsentBanner() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (META_PIXEL_ID && readConsent() === null) setShow(true)
  }, [])

  if (!show) return null

  const choose = (value: 'granted' | 'denied') => {
    writeConsent(value)
    setShow(false)
  }

  return (
    <div role="dialog" aria-label="Tracking preferences"
      style={{ position: 'fixed', left: 16, right: 96, bottom: 16, maxWidth: 520, zIndex: 997, background: '#111', color: 'white', borderRadius: 12, padding: '16px 18px', boxShadow: '0 8px 30px rgba(0,0,0,0.35)', fontFamily: 'Open Sans, sans-serif' }}>
      <p style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 12, color: 'rgba(255,255,255,0.85)' }}>
        We use the Meta Pixel to measure how our adverts perform. It only loads if you accept.{' '}
        <Link href="/privacy" style={{ color: 'white', textDecoration: 'underline' }}>Privacy policy</Link>
      </p>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={() => choose('granted')}
          style={{ background: 'var(--red)', color: 'white', border: 'none', borderRadius: 8, padding: '9px 18px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
          Accept
        </button>
        <button onClick={() => choose('denied')}
          style={{ background: 'transparent', color: 'white', border: '1px solid rgba(255,255,255,0.5)', borderRadius: 8, padding: '9px 18px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
          Decline
        </button>
      </div>
    </div>
  )
}
