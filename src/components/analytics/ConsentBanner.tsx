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

  // Same style for both buttons so neither choice is nudged.
  const btn: React.CSSProperties = {
    background: 'transparent', color: 'white', border: '1px solid rgba(255,255,255,0.7)', borderRadius: 6,
    padding: '5px 12px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap',
  }

  // A slim one-line bar in normal page flow at the very top (not fixed), so it can never
  // cover the sticky buy bar, the chat launcher or the footer; it scrolls away with the page.
  return (
    <div role="region" aria-label="Tracking preferences" className="no-print"
      style={{ background: '#111', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '6px 12px', fontFamily: 'Open Sans, sans-serif', fontSize: 12, lineHeight: 1.3 }}>
      <span>
        <span className="consent-long">We use the Meta Pixel to measure our adverts. It only loads if you accept.</span>
        <span className="consent-short">Allow ad tracking?</span>
      </span>
      <button onClick={() => choose('granted')} style={btn}>Accept</button>
      <button onClick={() => choose('denied')} style={btn}>Decline</button>
      <Link href="/privacy" style={{ color: 'white', textDecoration: 'underline', whiteSpace: 'nowrap' }}>Privacy</Link>
      <style>{`
        .consent-short { display: none; }
        @media (max-width: 600px) { .consent-long { display: none; } .consent-short { display: inline; } }
      `}</style>
    </div>
  )
}
