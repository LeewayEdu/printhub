import type { Metadata } from 'next'
import { pageMetadata } from '@/components/seo'

export const metadata: Metadata = pageMetadata({
  title: 'Affiliate Programme — Earn on Every Referral',
  description: 'Refer clients to PrintHub and earn commission on their orders: 10% on orders 1–5, 5% on orders 6–10 and 3% on every order after that.',
  path: '/affiliate',
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
