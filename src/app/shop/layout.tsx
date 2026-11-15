import type { Metadata } from 'next'
import { pageMetadata } from '@/components/seo'

export const metadata: Metadata = pageMetadata({
  title: 'Shop Print Products Online',
  description: 'Browse and order professional printing in Abuja: business cards, banners, branded souvenirs, uniforms, campaign materials and more.',
  path: '/shop',
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
