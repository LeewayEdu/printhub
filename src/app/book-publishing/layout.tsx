import type { Metadata } from 'next'
export const metadata: Metadata = {
  title: 'Book Publishing & Printing Nigeria — Self-Publish Your Book | PrintHub',
  description: 'Professional book printing and publishing in Nigeria. Hardcover, softcover, perfect binding. Academic texts, novels, devotionals. Nationwide delivery.',
}
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}