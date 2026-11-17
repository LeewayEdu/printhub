'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import Script from 'next/script'
import { META_PIXEL_ID, fbPageview } from '@/lib/meta-pixel'
import { CONSENT_EVENT, readConsent, type Consent } from './consent'

// Fires PageView on every client-side route change. App Router navigations
// don't reload the page, so the base pixel script's own automatic PageView
// (which only fires once, on initial script load) would miss every
// subsequent navigation without this. Deliberately keyed on pathname only
// (not search params) so it stays a plain client component with no
// Suspense-boundary requirement — every page (including static ones) mounts
// this from the root layout.
function RouteChangePageview() {
  const pathname = usePathname()
  const isFirstRun = useRef(true)

  useEffect(() => {
    // Skip the very first run — the base pixel snippet below already fires
    // an initial PageView itself; firing again here would double-count it.
    if (isFirstRun.current) {
      isFirstRun.current = false
      return
    }
    fbPageview()
  }, [pathname])

  return null
}

export default function MetaPixel() {
  // The pixel only loads after the visitor accepts (see ConsentBanner).
  const [consent, setConsent] = useState<Consent>(null)
  useEffect(() => {
    setConsent(readConsent())
    const sync = () => setConsent(readConsent())
    window.addEventListener(CONSENT_EVENT, sync)
    return () => window.removeEventListener(CONSENT_EVENT, sync)
  }, [])

  if (!META_PIXEL_ID || consent !== 'granted') return null

  return (
    <>
      <Script id="meta-pixel-base" strategy="afterInteractive">
        {`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window,document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${META_PIXEL_ID}');
          fbq('track', 'PageView');
        `}
      </Script>
      {/* No <noscript> fallback pixel: it would load without the visitor's consent. */}
      <RouteChangePageview />
    </>
  )
}
