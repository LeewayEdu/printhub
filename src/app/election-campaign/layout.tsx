import type { Metadata } from 'next'
import { pageMetadata } from '@/components/seo'

export const metadata: Metadata = pageMetadata({
  title: 'Election Campaign Printing — Posters & Shirts',
  description: 'Professional campaign materials in Nigeria. Flex banners, campaign T-shirts, posters, branded vests, calendars. Bulk discounts. Abuja-based.',
  path: '/election-campaign',
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
