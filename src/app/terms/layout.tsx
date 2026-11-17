import type { Metadata } from 'next'
import { pageMetadata } from '@/components/seo'

export const metadata: Metadata = pageMetadata({
  title: 'Terms of Service',
  description: 'The terms that apply when you order printing and related services from PrintHub by C-Chu Media, including payment, production and delivery.',
  path: '/terms',
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
