import type { Metadata } from 'next'
import { pageMetadata } from '@/components/seo'

export const metadata: Metadata = pageMetadata({
  title: 'About Us — Printing & Publishing in Abuja',
  description: 'C-Chu Media Limited, the company behind PrintHub, has been printing, branding and publishing from Karu, Abuja since 2011. Meet the team.',
  path: '/about',
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
