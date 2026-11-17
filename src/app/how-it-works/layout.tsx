import type { Metadata } from 'next'
import { pageMetadata, FAQSchema } from '@/components/seo'
import { FAQS } from './faqs'

export const metadata: Metadata = pageMetadata({
  title: 'How It Works — Order Print Online',
  description: 'Create an account, configure your product, upload your design, choose delivery and pay securely with Paystack. Read each step and our FAQs.',
  path: '/how-it-works',
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <FAQSchema faqs={FAQS.map(f => ({ question: f.q, answer: f.a }))} />
      {children}
    </>
  )
}
