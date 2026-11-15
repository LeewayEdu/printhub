import type { Metadata } from 'next'
import HomeClient from './HomeClient'
import { LocalBusinessSchema } from '@/components/seo'

const DESCRIPTION = 'Order professional printing online in Abuja: banners, business cards, branded souvenirs, uniforms and campaign materials. Trusted since 2011.'

export const metadata: Metadata = {
  title: { absolute: 'PrintHub — Professional Printing in Abuja | C-Chu Media' },
  description: DESCRIPTION,
  alternates: { canonical: 'https://printhub.cchumedia.com' },
  openGraph: {
    type: 'website',
    locale: 'en_NG',
    url: 'https://printhub.cchumedia.com',
    siteName: 'PrintHub by C-Chu Media',
    title: 'PrintHub — Professional Printing in Abuja | C-Chu Media',
    description: DESCRIPTION,
    images: [{ url: 'https://printhub.cchumedia.com/og-image.png', width: 1200, height: 630, alt: 'PrintHub by C-Chu Media' }],
  },
}

export default function Page() {
  return (
    <>
      <LocalBusinessSchema />
      <HomeClient />
    </>
  )
}
