import type { Metadata } from 'next'
import { pageMetadata } from '@/components/seo'

export const metadata: Metadata = pageMetadata({
  title: 'Privacy Policy',
  description: 'How PrintHub by C-Chu Media collects, uses and protects your personal information when you order printing services through our website.',
  path: '/privacy',
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
