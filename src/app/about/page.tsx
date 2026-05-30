'use client'

import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { CLIENTS } from '@/lib/constants'

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main>
        {/* Hero */}
        <section style={{ background: 'var(--black)', padding: '80px 40px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(192,57,43,0.15) 0%, transparent 50%)' }} />
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
          <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 2, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center' }} className="about-hero-grid">
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)', marginBottom: 12 }}>About us</div>
              <h1 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 'clamp(32px, 4vw, 52px)', color: 'white', lineHeight: 1.05, marginBottom: 20 }}>
                Birthing your<br /><span style={{ color: 'var(--red)' }}>Imagination</span><br />since 2011.
              </h1>
              <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', lineHeight: 1.8, maxWidth: 460 }}>
                C-Chu Media Limited is a professional printing, branding, and publishing company headquartered in Karu, Abuja. We have served over 3,000 clients — from government agencies to churches, schools, SMEs, and political campaigns — with quality, speed, and integrity.
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {[
                { value: '13+', label: 'Years in business' },
                { value: '3,000+', label: 'Jobs delivered' },
                { value: '14', label: 'Service categories' },
                { value: '65+', label: 'Products available' },
              ].map((stat, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '24px 20px', textAlign: 'center' as const }}>
                  <div style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 36, color: 'var(--red)', lineHeight: 1 }}>{stat.value}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 6 }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Story */}
        <section style={{ background: 'white', padding: '72px 40px' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'start' }} className="story-grid">
            <div>
              <div className="badge badge-red" style={{ marginBottom: 16 }}>Our story</div>
              <h2 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 'clamp(26px, 3vw, 36px)', marginBottom: 20, lineHeight: 1.2 }}>
                From a small studio in Karu to Nigeria's most complete print platform
              </h2>
              <p style={{ fontSize: 15, color: 'var(--gray)', lineHeight: 1.8, marginBottom: 16 }}>
                C-Chu Media was founded in 2011 and incorporated in 2013 with a simple mission: make professional printing accessible to every business owner in Nigeria, regardless of size or budget.
              </p>
              <p style={{ fontSize: 15, color: 'var(--gray)', lineHeight: 1.8, marginBottom: 16 }}>
                Over 13 years we have grown from printing basic flyers to handling full corporate identity packages, book publishing with ISBN registration, election campaign materials, 3D signage installation, and vehicle branding across the FCT.
              </p>
              <p style={{ fontSize: 15, color: 'var(--gray)', lineHeight: 1.8 }}>
                PrintHub is the next step in that journey — bringing our entire catalogue online so you can order, track, and manage your print jobs from anywhere in Nigeria.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 16 }}>
              {[
                { icon: '🎯', title: 'Our Mission', desc: 'To make professional printing accessible, affordable, and trackable for every business in Nigeria.' },
                { icon: '👁️', title: 'Our Vision', desc: "To be Nigeria's leading print-on-demand platform, serving clients from Abuja to Lagos to the diaspora." },
                { icon: '💎', title: 'Our Values', desc: 'Quality without compromise. Speed without cutting corners. Transparency at every step.' },
              ].map((item, i) => (
                <div key={i} style={{ background: 'var(--light)', border: '1px solid var(--border)', borderRadius: 14, padding: 24, display: 'flex', gap: 16 }}>
                  <span style={{ fontSize: 28, flexShrink: 0 }}>{item.icon}</span>
                  <div>
                    <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{item.title}</div>
                    <div style={{ fontSize: 14, color: 'var(--gray)', lineHeight: 1.6 }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Clients */}
        <section style={{ background: 'var(--light)', padding: '72px 40px' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ textAlign: 'center' as const, marginBottom: 48 }}>
              <div className="badge badge-red" style={{ marginBottom: 14 }}>Who trusts us</div>
              <h2 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 'clamp(26px, 3vw, 36px)', marginBottom: 12 }}>
                Clients who have trusted us
              </h2>
              <p style={{ fontSize: 15, color: 'var(--gray)', maxWidth: 480, margin: '0 auto' }}>
                From government agencies to churches, schools, and businesses across Nigeria.
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }} className="clients-grid">
              {CLIENTS.map(client => (
                <div key={client} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 12px', textAlign: 'center' as const }}>
                  <span style={{ fontSize: 12, color: 'var(--dark)', fontWeight: 500, lineHeight: 1.4 }}>{client}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section style={{ background: 'var(--black)', padding: '80px 40px', textAlign: 'center' as const }}>
          <div style={{ maxWidth: 560, margin: '0 auto' }}>
            <h2 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 'clamp(28px, 4vw, 44px)', color: 'white', lineHeight: 1.1, marginBottom: 16 }}>
              Ready to work with us?
            </h2>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)', marginBottom: 32, lineHeight: 1.75 }}>
              Join 3,000+ clients who trust C-Chu Media for their printing and branding needs.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' as const }}>
              <Link href="/shop" style={{ background: 'var(--red)', color: 'white', fontFamily: 'Montserrat', fontWeight: 700, fontSize: 15, padding: '14px 28px', borderRadius: 9, textDecoration: 'none' }}>
                Browse Shop →
              </Link>
              <Link href="/contact" style={{ background: 'transparent', color: 'white', fontFamily: 'Montserrat', fontWeight: 700, fontSize: 15, padding: '14px 28px', borderRadius: 9, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.2)' }}>
                Contact Us
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <style>{`
        @media (max-width: 900px) {
          .about-hero-grid { grid-template-columns: 1fr !important; }
          .story-grid { grid-template-columns: 1fr !important; }
          .clients-grid { grid-template-columns: repeat(3, 1fr) !important; }
        }
        @media (max-width: 480px) {
          .clients-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </>
  )
}