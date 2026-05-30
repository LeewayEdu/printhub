'use client'

import { useState } from 'react'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

const STEPS = [
  {
    num: '01', icon: '📝', title: 'Create your free account',
    desc: 'Register on PrintHub in under 2 minutes. All you need is your name, email, and phone number. Your account gives you access to the full product catalogue, order tracking, loyalty points, and the affiliate program.',
  },
  {
    num: '02', icon: '🛍️', title: 'Browse and configure your product',
    desc: 'Visit the Shop page and browse 65+ products across 14 categories. Click any product to open the order modal. Select your specs — paper weight, lamination, size, finishing — and watch the price update live. For banner printing, enter your width and height in feet and the system calculates the total automatically.',
  },
  {
    num: '03', icon: '🎨', title: 'Submit your design',
    desc: 'At checkout, for each item you can upload your design file (PNG, PDF, AI, PSD), share a Google Drive or Dropbox link, or request our design team to create one for you by filling a simple brief with your business name, colours, and notes.',
  },
  {
    num: '04', icon: '🚚', title: 'Choose your delivery method',
    desc: 'Pick up for free from our Karu, Abuja Office, choose local Abuja delivery to your area, or ship nationwide via waybill. Delivery fees are shown clearly before you confirm.',
  },
  {
    num: '05', icon: '💳', title: 'Pay securely via Paystack',
    desc: 'Pay online using your debit card, bank transfer, or USSD via Paystack — Nigeria\'s most trusted payment gateway. Your order is confirmed immediately after payment.',
  },
  {
    num: '06', icon: '🏭', title: 'We print and produce',
    desc: 'Our team reviews your order and design, confirms details via WhatsApp if needed, and goes into production. You can track your order status in real time from your dashboard.',
  },
  {
    num: '07', icon: '📦', title: 'Receive your order',
    desc: 'Pick up from our studio or receive delivery to your address. A receipt is sent with your order. Rate your experience and earn loyalty points automatically when your order is marked delivered.',
  },
]

const FAQS = [
  {
    q: 'How long does printing take?',
    a: 'Turnaround time depends on the product. Business cards and flyers are typically ready in 2-3 working days. Banners and branded items take 3-5 working days. Books and signage take 7-14 working days. Rush orders can be discussed via WhatsApp.',
  },
  {
    q: 'What file formats do you accept for designs?',
    a: 'We accept PDF, PNG, JPG, AI (Adobe Illustrator), PSD (Photoshop), and CorelDRAW files. For best print quality, files should be at 300 DPI or higher. PDF is preferred.',
  },
  {
    q: 'What if I don\'t have a design?',
    a: 'No problem. At checkout you can request our design team to create one for you. Fill in a brief with your business name, preferred colours, slogan, and any notes or reference images. Design fees vary by product and are included in some packages.',
  },
  {
    q: 'Can I order from outside Abuja?',
    a: 'Yes. We ship nationwide via waybill to all 36 states. Interstate delivery fees range from ₦3,000 to ₦7,000 depending on your state. You can also send a representative to pick up from our Karu Office.',
  },
  {
    q: 'What is the minimum order quantity?',
    a: 'MOQ varies by product. Business cards start at 100 pieces. Flyers at 100 pieces. T-shirts at 6 pieces. Banners and signage start at 1 piece. You can see the MOQ for each product on its order page.',
  },
  {
    q: 'How does the loyalty points system work?',
    a: 'You earn 2% of every order value as loyalty points when your order is delivered. 1 point equals ₦1. Points can be redeemed at checkout. Minimum redemption is 500 points (₦500).',
  },
  {
    q: 'Can I track my order?',
    a: 'Yes. Log into your dashboard and go to My Orders. Every order shows its current status: Pending, Confirmed, In Production, Ready, Shipped, or Delivered. You also receive WhatsApp updates.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept all debit cards, bank transfers, and USSD payments via Paystack. Cash payment is available for pickup orders.',
  },
  {
    q: 'Can I reorder a previous job?',
    a: 'Yes. Go to your dashboard, find the previous order, and click Reorder. Your specs and quantity are pre-filled. You just confirm and pay.',
  },
  {
    q: 'What is the affiliate program?',
    a: 'You earn commission every time someone you referred places an order. The commission is 10% on their first 5 orders, 5% on orders 6-10, and 3% on all orders after that — for life. No investment needed. Just share your unique referral link.',
  },
  {
    q: 'What if I am not happy with my order?',
    a: 'We take quality very seriously. If there is a production error on our part, we reprint at no cost. Contact us via WhatsApp or email within 48 hours of receiving your order with photos of the issue.',
  },
  {
    q: 'Do you offer bulk discounts?',
    a: 'Yes. All our unit-priced products have quantity tiers — the more you order, the lower the cost per unit. The price updates automatically as you adjust quantity on the product page.',
  },
]

export default function HowItWorksPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <>
      <Navbar />
      <main>

        {/* Hero */}
        <section style={{ background: 'var(--black)', padding: '80px 40px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(192,57,43,0.18) 0%, transparent 55%)' }} />
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
          <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 2, textAlign: 'center' as const }}>
            <div className="badge badge-red" style={{ marginBottom: 16 }}>How it works</div>
            <h1 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 'clamp(36px, 5vw, 60px)', color: 'white', lineHeight: 1.05, marginBottom: 16 }}>
              From order to delivery,<br /><span style={{ color: 'var(--red)' }}>we handle everything.</span>
            </h1>
            <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.55)', maxWidth: 520, margin: '0 auto 32px', lineHeight: 1.75 }}>
              PrintHub makes ordering professional printing as simple as shopping online. Here is exactly how it works.
            </p>
            <Link href="/auth?tab=register" className="btn btn-primary" style={{ fontSize: 15, padding: '14px 32px' }}>
              Get started free
            </Link>
          </div>
        </section>

        {/* Steps */}
        <section style={{ background: 'var(--bg)', padding: '80px 40px' }}>
          <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <div style={{ textAlign: 'center' as const, marginBottom: 56 }}>
              <div className="badge badge-red" style={{ marginBottom: 14 }}>Step by step</div>
              <h2 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 'clamp(26px, 3vw, 36px)', color: 'var(--text-primary)' }}>
                7 steps to your finished print order
              </h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 0 }}>
              {STEPS.map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: 24, position: 'relative' as const }}>
                  {/* Timeline */}
                  <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', flexShrink: 0 }}>
                    <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0, zIndex: 1 }}>
                      {step.icon}
                    </div>
                    {i < STEPS.length - 1 && (
                      <div style={{ width: 2, flex: 1, background: 'var(--border-color)', margin: '4px 0' }} />
                    )}
                  </div>
                  {/* Content */}
                  <div style={{ paddingBottom: i < STEPS.length - 1 ? 36 : 0, paddingTop: 8 }}>
                    <div style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 11, color: 'var(--red)', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 4 }}>Step {step.num}</div>
                    <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 18, color: 'var(--text-primary)', marginBottom: 8 }}>{step.title}</div>
                    <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.8 }}>{step.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section style={{ background: 'var(--bg-secondary)', padding: '80px 40px' }}>
          <div style={{ maxWidth: 720, margin: '0 auto' }}>
            <div style={{ textAlign: 'center' as const, marginBottom: 48 }}>
              <div className="badge badge-red" style={{ marginBottom: 14 }}>FAQ</div>
              <h2 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 'clamp(26px, 3vw, 36px)', color: 'var(--text-primary)', marginBottom: 12 }}>
                Frequently asked questions
              </h2>
              <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.75 }}>
                Everything you need to know about ordering from PrintHub.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
              {FAQS.map((faq, i) => (
                <div key={i} style={{ background: 'var(--bg-card)', border: `1px solid ${openFaq === i ? 'var(--red)' : 'var(--border-color)'}`, borderRadius: 12, overflow: 'hidden', transition: 'border-color 0.2s' }}>
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    style={{ width: '100%', padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' as const }}
                  >
                    <span style={{ fontFamily: 'Montserrat', fontWeight: 600, fontSize: 15, color: 'var(--text-primary)', lineHeight: 1.4 }}>{faq.q}</span>
                    <span style={{ fontSize: 20, color: 'var(--red)', flexShrink: 0, transform: openFaq === i ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s', display: 'inline-block' }}>+</span>
                  </button>
                  {openFaq === i && (
                    <div style={{ padding: '0 20px 18px', fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section style={{ background: 'var(--red)', padding: '72px 40px', textAlign: 'center' as const }}>
          <div style={{ maxWidth: 560, margin: '0 auto' }}>
            <h2 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 'clamp(28px, 4vw, 42px)', color: 'white', marginBottom: 14 }}>
              Ready to place your first order?
            </h2>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.75)', marginBottom: 32, lineHeight: 1.75 }}>
              Register free, browse our catalogue, and get your printing done professionally.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' as const }}>
              <Link href="/auth?tab=register" style={{ background: 'white', color: 'var(--red)', fontFamily: 'Montserrat', fontWeight: 700, fontSize: 15, padding: '14px 28px', borderRadius: 9, textDecoration: 'none' }}>
                Register Free
              </Link>
              <a href="https://wa.me/2348052929523?text=Hello%2C%20I%20want%20to%20place%20a%20print%20order" target="_blank" rel="noopener noreferrer"
                style={{ background: 'rgba(255,255,255,0.15)', color: 'white', fontFamily: 'Montserrat', fontWeight: 700, fontSize: 15, padding: '14px 28px', borderRadius: 9, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.3)' }}>
                💬 WhatsApp us
              </a>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </>
  )
}