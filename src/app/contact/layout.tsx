import type { Metadata } from 'next'
import { pageMetadata } from '@/components/seo'
import { BRAND } from '@/lib/constants'

export const metadata: Metadata = pageMetadata({
  title: 'Contact Us — Karu, Abuja Print Shop',
  description: `Get in touch with PrintHub by C-Chu Media. Visit us at ${BRAND.addressStreet}, Karu, Abuja or call ${BRAND.phone1}. Open Mon-Sat 8AM-7PM.`,
  path: '/contact',
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
