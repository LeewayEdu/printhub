import type { Metadata } from 'next'
import { pageMetadata } from '@/components/seo'

export const metadata: Metadata = pageMetadata({
  title: 'Book Publishing & Printing in Nigeria',
  description: 'Professional book printing and publishing in Nigeria. Hardcover, softcover, perfect binding. Academic texts, novels, devotionals. Nationwide delivery.',
  path: '/book-publishing',
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
