'use client'

import { useState } from 'react'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { useAuthStore } from '@/store/authStore'
import { Check, Copy, Users, TrendingUp, DollarSign, Gift } from 'lucide-react'

const TIERS = [
  { orders: 'Orders 1-5', rate: '10%', desc: 'Earn 10% on every order your referred client places.', color: '#10b981' },
  { orders: 'Orders 6-10', rate: '5%', desc: 'Your referral keeps ordering — you keep earning.', color: '#3b82f6' },
  { orders: 'Order 11+', rate: '3%', desc: '3% on every order they place for life. True passive income.', color: '#8b5cf6' },
]

const STEPS = [
  { icon: '📝', title: 'Register free', desc: 'Create your PrintHub account and tick the affiliate checkbox. Takes 2 minutes.' },
  { icon: '🔗', title: 'Get your link', desc: 'Get your unique referral link from your dashboard. Share it anywhere.' },
  { icon: '📢', title: 'Refer clients', desc: 'Share your link on WhatsApp, Instagram, Facebook, or anywhere you like.' },
  { icon: '💰', title: 'Earn commissions', desc: 'Every time your referral places an order, you earn. Automatically tracked.' },
]

export default function AffiliatePage() {
  const { user } = useAuthStore()
  const [copied, setCopied] = useState(false)

  const referralLink = user
    ? `https://printhub.cchumedia.com?ref=${user.id.slice(0, 8)}`
    : null

  const handleCopy = () => {
    if (!referralLink) return
    navigator.clipboard.writeText(referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <Navbar />
      <main>

        {/* Hero */}
        <section style={{ background: 'var(--black)', padding: '80px 40px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(192,57,43,0.2) 0%, transparent 55%)' }} />
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
          <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 2, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center' }} className="hero-grid">
            <div>
              <div className="badge badge-dark" style={{ marginBottom: 16 }}>Affiliate program</div>
              <h1 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 'clamp(36px, 5vw, 56px)', color: 'white', lineHeight: 1.05, marginBottom: 16 }}>
                Refer clients.<br />
                <span style={{ color: 'var(--red)' }}>Earn for life.</span>
              </h1>
              <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.55)', maxWidth: 440, lineHeight: 1.75, marginBottom: 32 }}>
                Join the C-Chu Media Affiliate Program and earn commission every time someone you refer places a print order. No stock. No investment. Just refer and earn.
              </p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' as const }}>
                {user ? (
                  <Link href="/dashboard/affiliate" className="btn btn-primary" style={{ fontSize: 15, padding: '14px 28px' }}>
                    View My Dashboard
                  </Link>
                ) : (
                  <Link href="/auth?tab=register" className="btn btn-primary" style={{ fontSize: 15, padding: '14px 28px' }}>
                    Join Free Now
                  </Link>
                )}
                <a href="https://wa.me/2348052929523?text=Hello%2C%20I%20want%20to%20join%20the%20affiliate%20program"
                  target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#25D366', color: 'white', fontFamily: 'Montserrat', fontWeight: 700, fontSize: 15, padding: '14px 28px', borderRadius: 9, textDecoration: 'none' }}>
                  Ask us on WhatsApp
                </a>
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {[
                { icon: DollarSign, value: 'Up to 10%', label: 'Commission rate', color: '#10b981' },
                { icon: Users, value: 'Unlimited', label: 'Referrals allowed', color: '#3b82f6' },
                { icon: TrendingUp, value: 'For life', label: 'Earn on every order', color: 'var(--red)' },
                { icon: Gift, value: 'Free', label: 'Zero cost to join', color: '#f59e0b' },
              ].map((stat, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '24px 20px' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: `${stat.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                    <stat.icon size={20} color={stat.color} />
                  </div>
                  <div style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 22, color: 'white', marginBottom: 4 }}>{stat.value}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Referral link (if logged in) */}
        {user && referralLink && (
          <section style={{ background: 'var(--red)', padding: '40px 40px' }}>
            <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' as const }}>
              <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 16, color: 'white', marginBottom: 16 }}>
                Your referral link
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 10, padding: '12px 16px' }}>
                <span style={{ flex: 1, fontSize: 14, color: 'white', fontFamily: 'Montserrat', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                  {referralLink}
                </span>
                <button onClick={handleCopy}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'white', color: 'var(--red)', border: 'none', borderRadius: 8, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 13, cursor: 'pointer', flexShrink: 0 }}>
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* How it works */}
        <section style={{ background: 'var(--bg)', padding: '72px 40px' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ textAlign: 'center' as const, marginBottom: 48 }}>
              <div className="badge badge-red" style={{ marginBottom: 14 }}>How it works</div>
              <h2 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 'clamp(26px, 3vw, 36px)', color: 'var(--text-primary)', marginBottom: 12 }}>
                Start earning in 4 simple steps
              </h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }} className="steps-grid">
              {STEPS.map((step, i) => (
                <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 14, padding: 24, position: 'relative' as const }}>
                  <div style={{ position: 'absolute' as const, top: 16, right: 16, fontFamily: 'Montserrat', fontWeight: 800, fontSize: 48, color: 'var(--red)', opacity: 0.06, lineHeight: 1 }}>
                    {i + 1}
                  </div>
                  <div style={{ fontSize: 36, marginBottom: 16 }}>{step.icon}</div>
                  <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 16, marginBottom: 8, color: 'var(--text-primary)' }}>{step.title}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{step.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Commission tiers */}
        <section style={{ background: 'var(--bg-secondary)', padding: '72px 40px' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ textAlign: 'center' as const, marginBottom: 48 }}>
              <div className="badge badge-red" style={{ marginBottom: 14 }}>Commission structure</div>
              <h2 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 'clamp(26px, 3vw, 36px)', color: 'var(--text-primary)', marginBottom: 12 }}>
                The more they order, the more you earn
              </h2>
              <p style={{ fontSize: 15, color: 'var(--text-secondary)', maxWidth: 480, margin: '0 auto', lineHeight: 1.75 }}>
                Commission is tracked per referred customer. Every time they order, you earn — forever.
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }} className="tiers-grid">
              {TIERS.map((tier, i) => (
                <div key={i} style={{ background: 'var(--bg-card)', border: `2px solid ${tier.color}30`, borderRadius: 16, padding: 32, textAlign: 'center' as const }}>
                  <div style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 56, color: tier.color, lineHeight: 1, marginBottom: 8 }}>
                    {tier.rate}
                  </div>
                  <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', marginBottom: 12 }}>
                    {tier.orders}
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                    {tier.desc}
                  </div>
                </div>
              ))}
            </div>

            {/* Example calculation */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 16, padding: 32, marginTop: 40 }}>
              <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 17, marginBottom: 20, color: 'var(--text-primary)' }}>
                Example: You refer 3 clients who each order monthly
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }} className="example-grid">
                {[
                  { client: 'Client A', orders: 'First 5 orders', avg: 'N50,000/order', rate: '10%', earn: 'N25,000' },
                  { client: 'Client B', orders: 'Orders 6-10', avg: 'N80,000/order', rate: '5%', earn: 'N20,000' },
                  { client: 'Client C', orders: 'Order 11+', avg: 'N100,000/order', rate: '3%', earn: 'N3,000/order forever' },
                ].map((ex, i) => (
                  <div key={i} style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: '18px 20px' }}>
                    <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, marginBottom: 10, color: 'var(--text-primary)' }}>{ex.client}</div>
                    {[
                      ['Orders', ex.orders],
                      ['Avg order', ex.avg],
                      ['Your rate', ex.rate],
                      ['You earn', ex.earn],
                    ].map(([label, value]) => (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                        <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{value}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section style={{ background: 'var(--bg)', padding: '72px 40px' }}>
          <div style={{ maxWidth: 700, margin: '0 auto' }}>
            <div style={{ textAlign: 'center' as const, marginBottom: 40 }}>
              <div className="badge badge-red" style={{ marginBottom: 14 }}>FAQ</div>
              <h2 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 'clamp(24px, 3vw, 32px)', color: 'var(--text-primary)' }}>
                Common questions
              </h2>
            </div>
            {[
              { q: 'How do I get paid?', a: 'We pay commissions via bank transfer. You add your bank details in your affiliate dashboard and request a payout when your balance reaches N5,000.' },
              { q: 'When do commissions get approved?', a: 'Commissions are approved after your referred client completes payment for their order. This usually takes 1-3 business days.' },
              { q: 'Is there a limit on how many people I can refer?', a: 'No limit at all. Refer 1 or 1,000 clients — every single one earns you commission.' },
              { q: 'What if someone I referred already has an account?', a: 'The referral link must be used during registration. If they already have an account, unfortunately the referral cannot be credited retroactively.' },
              { q: 'Does the commission expire?', a: 'No. As long as your referred client keeps ordering from PrintHub, you keep earning commission on every order — for life.' },
            ].map((faq, i) => (
              <div key={i} style={{ borderBottom: '1px solid var(--border-color)', padding: '20px 0' }}>
                <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 15, marginBottom: 8, color: 'var(--text-primary)' }}>{faq.q}</div>
                <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{faq.a}</div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section style={{ background: 'var(--red)', padding: '72px 40px', textAlign: 'center' as const }}>
          <div style={{ maxWidth: 560, margin: '0 auto' }}>
            <h2 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 'clamp(28px, 4vw, 42px)', color: 'white', marginBottom: 14 }}>
              Ready to start earning?
            </h2>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.75)', marginBottom: 32, lineHeight: 1.75 }}>
              Join hundreds of affiliates already earning with PrintHub. Free to join, instant link, lifetime commissions.
            </p>
            {user ? (
              <Link href="/dashboard"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'white', color: 'var(--red)', fontFamily: 'Montserrat', fontWeight: 700, fontSize: 15, padding: '14px 32px', borderRadius: 9, textDecoration: 'none' }}>
                Go to my Dashboard
              </Link>
            ) : (
              <Link href="/auth?tab=register"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'white', color: 'var(--red)', fontFamily: 'Montserrat', fontWeight: 700, fontSize: 15, padding: '14px 32px', borderRadius: 9, textDecoration: 'none' }}>
                Join Free Now
              </Link>
            )}
          </div>
        </section>

      </main>
      <Footer />
      <style>{`
        @media (max-width: 900px) {
          .hero-grid { grid-template-columns: 1fr !important; }
          .steps-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .tiers-grid { grid-template-columns: 1fr !important; }
          .example-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 480px) {
          .steps-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  )
}