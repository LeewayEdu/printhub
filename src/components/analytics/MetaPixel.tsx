'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import Script from 'next/script'
import { META_PIXEL_ID, fbPageview } from '@/lib/meta-pixel'

// Staff areas are never tracked: the Pixel is not loaded there and no PageView is sent from them.
export function isTrackingExcluded(pathname: string | null): boolean {
  if (!pathname) return false
  return pathname === '/admin' || pathname.startsWith('/admin/')
    || pathname === '/dashboard/admin' || pathname.startsWith('/dashboard/admin/')
}

// Fires PageView on every client-side route change. App Router navigations
// don't reload the page, so the base pixel script's own automatic PageView
// (which only fires once, on initial script load) would miss every
// subsequent navigation without this. Deliberately keyed on pathname only
// (not search params) so it stays a plain client component with no
// Suspense-boundary requirement — every page (including static ones) mounts
// this from the root layout.
function RouteChangePageview() {
  const pathname = usePathname()
  const baseLoaded = useRef(false)

  useEffect(() => {
    if (isTrackingExcluded(pathname)) return
    // The first tracked page of a visit: the base pixel snippet below fires its own
    // PageView when it loads; firing again here would double-count it.
    if (!baseLoaded.current) {
      baseLoaded.current = true
      return
    }
    fbPageview()
  }, [pathname])

  return null
}

export default function MetaPixel() {
  const pathname = usePathname()
  if (!META_PIXEL_ID || isTrackingExcluded(pathname)) return null

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
      <RouteChangePageview />
    </>
  )
}
