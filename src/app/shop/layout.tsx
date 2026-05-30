import type { Metadata } from 'next'
export const metadata: Metadata = {
  title: 'Shop — Banners, Business Cards, Branded Souvenirs & More | PrintHub',
  description: 'Browse and order professional printing in Abuja. Business cards, banners, branded souvenirs, uniforms, campaign materials, book publishing and more.',
}
export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}