import type { Metadata } from 'next'
export const metadata: Metadata = {
  title: 'Contact PrintHub — Karu, Abuja Print Shop',
  description: 'Get in touch with PrintHub by C-Chu Media. Visit us at Suite 38 Mazfallah Complex, Karu, Abuja or call +234 805 292 9523. Open Mon-Sat 8AM-7PM.',
}
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}