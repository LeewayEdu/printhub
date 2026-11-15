import type { Metadata } from 'next'
import { pageMetadata } from '@/components/seo'

export const metadata: Metadata = pageMetadata({
  title: 'Contact Us — Karu, Abuja Print Shop',
  description: 'Get in touch with PrintHub by C-Chu Media. Visit us at Suite 38 Mazfallah Complex, Karu, Abuja or call +234 805 292 9523. Open Mon-Sat 8AM-7PM.',
  path: '/contact',
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
