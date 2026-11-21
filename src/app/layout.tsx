import type { Metadata, Viewport } from 'next'
import { Suspense } from 'react'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import MiniCartNotice from '@/components/layout/MiniCartNotice'
import ThemeProvider from '@/components/layout/ThemeProvider'
import ChatWidget from '@/components/layout/ChatWidget'
import ReferralCapture from '@/components/layout/ReferralCapture'
import Script from 'next/script'
import { Montserrat, Open_Sans } from 'next/font/google'
import { SITE_URL } from '@/lib/site-url'
import MetaPixel from '@/components/analytics/MetaPixel'

// Self-hosted by Next at build time (no render-blocking request to Google Fonts).
// Both are variable fonts, so every weight the site uses is available.
const montserrat = Montserrat({ subsets: ['latin'], display: 'swap', variable: '--font-montserrat', style: ['normal', 'italic'] })
const openSans = Open_Sans({ subsets: ['latin'], display: 'swap', variable: '--font-open-sans', style: ['normal', 'italic'] })

export const viewport: Viewport = {
  themeColor: '#C0392B',
}

export const metadata: Metadata = {
  metadataBase: new URL('https://printhub.cchumedia.com'),
  title: {
    default: 'PrintHub — Professional Printing in Abuja | C-Chu Media',
    template: '%s | PrintHub',
  },
  description: 'Order professional printing online in Abuja: banners, business cards, branded souvenirs, uniforms and campaign materials. Trusted since 2011.',
  keywords: ['printing abuja', 'print shop abuja', 'business cards abuja', 'banners abuja', 'branded souvenirs nigeria', 'campaign materials abuja', 'book publishing nigeria', 'printhub'],
  openGraph: {
    type: 'website',
    locale: 'en_NG',
    siteName: 'PrintHub by C-Chu Media',
    title: 'PrintHub — Professional Printing in Abuja | C-Chu Media',
    description: 'Order professional printing online in Abuja: banners, business cards, branded souvenirs, uniforms and campaign materials. Trusted since 2011.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'PrintHub by C-Chu Media' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PrintHub — Professional Printing in Abuja',
    description: 'Professional printing and branding in Abuja, Nigeria. Order online.',
    images: ['/og-image.png'],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${montserrat.variable} ${openSans.variable}`}>
      <head>
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/favicon.png" />
      </head>
      <body>
        <a href="#main-content" className="skip-link">Skip to content</a>
        <MetaPixel />
        <Suspense fallback={null}>
          <ReferralCapture />
        </Suspense>
        <ThemeProvider>
          {children}
        </ThemeProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              fontFamily: 'Open Sans, sans-serif',
              fontSize: '14px',
              borderRadius: '9px',
            },
            success: { iconTheme: { primary: '#C0392B', secondary: 'white' } },
          }}
        />
        <MiniCartNotice />
        <ChatWidget />
      </body>
    </html>
  )
}