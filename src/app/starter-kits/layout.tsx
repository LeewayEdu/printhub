import type { Metadata } from 'next'
export const metadata: Metadata = {
  title: 'Business Starter Kits Abuja — Get Your Brand Ready | PrintHub',
  description: 'Launch your brand with our all-in-one print packages. Business cards, banners, shirts, stationery and more bundled at one price. Starting from ₦75,000.',
}
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}