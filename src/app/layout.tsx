import type { Metadata } from 'next'
import { Suspense } from 'react'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import ThemeProvider from '@/components/layout/ThemeProvider'
import ChatWidget from '@/components/layout/ChatWidget'
import ReferralCapture from '@/components/layout/ReferralCapture'
import Script from 'next/script'
import { SITE_URL } from '@/lib/site-url'

export const metadata: Metadata = {
  title: {
    default: 'PrintHub — Professional Printing & Branding in Abuja | C-Chu Media',
    template: '%s | PrintHub Abuja',
  },
  description: 'Order professional printing online in Abuja, Nigeria. Banners, business cards, branded souvenirs, uniforms, campaign materials, book publishing and more. Free design review. Trusted since 2011.',
  metadataBase: new URL(SITE_URL),
  keywords: ['printing abuja', 'print shop abuja', 'business cards abuja', 'banners abuja', 'branded souvenirs nigeria', 'campaign materials abuja', 'book publishing nigeria', 'printhub'],
  openGraph: {
    type: 'website',
    locale: 'en_NG',
    url: 'https://printhub.cchumedia.com',
    siteName: 'PrintHub by C-Chu Media',
    title: 'PrintHub — Professional Printing & Branding in Abuja',
    description: 'Order professional printing online. Banners, business cards, branded souvenirs, campaign materials and more. Free design review. Trusted since 2011.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'PrintHub by C-Chu Media' }],
  },
  twitter: { card: 'summary_large_image', title: 'PrintHub Abuja', description: 'Professional printing & branding in Abuja, Nigeria.' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/favicon.png" /> 
        <link
          href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400&family=Open+Sans:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&display=swap"
          rel="stylesheet"
        
        />
      </head>
      <body>
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
        <ChatWidget />
      </body>
    </html>
  )
}