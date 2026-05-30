import type { Metadata } from 'next'
export const metadata: Metadata = {
  title: 'Election Campaign Printing Nigeria — Posters, Shirts, Banners | PrintHub',
  description: 'Professional campaign materials in Nigeria. Flex banners, campaign T-shirts, posters, branded vests, calendars. Bulk discounts. Fast turnaround. Abuja-based.',
}
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}