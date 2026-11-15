import type { Metadata } from 'next'
import { pageMetadata } from '@/components/seo'
import { STARTER_KITS } from '@/lib/constants'

// "From" price is the cheapest kit in the shared STARTER_KITS list.
const fromPrice = Math.min(...STARTER_KITS.map(k => k.price)).toLocaleString('en-NG')

export const metadata: Metadata = pageMetadata({
  title: 'Business Starter Kits — Get Your Brand Ready',
  description: `All-in-one print packages for new businesses: business cards, letterheads, banners, shirts and more at one price. Kits from ₦${fromPrice}.`,
  path: '/starter-kits',
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
