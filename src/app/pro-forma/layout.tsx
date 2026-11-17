import type { Metadata } from 'next'

// A personal quote document: kept out of search results.
export const metadata: Metadata = {
  title: 'Pro-forma invoice',
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <main id="main-content">{children}</main>
}
