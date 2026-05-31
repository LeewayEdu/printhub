'use client'

import Link from 'next/link'
import { BRAND } from '@/lib/constants'

export default function Footer() {
  return (
    <footer style={{ background: '#111', padding: '60px 40px 32px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 48, marginBottom: 48 }} className="footer-grid">

          {/* Brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <img src="/C-Chu_media_Logo_.png" alt="C-Chu Media" style={{ width: 36, height: 36, objectFit: 'contain' }} />
              <div>
                <div style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 18, color: 'white' }}>PrintHub</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontStyle: 'italic' }}>by C-Chu Media Limited</div>
              </div>
            </div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, maxWidth: 280, marginBottom: 16 }}>
              Professional printing and branding solutions for businesses, organisations, and individuals across Nigeria. Established 2011.
            </p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', fontStyle: 'italic', marginBottom: 16 }}>
              {BRAND.tagline}
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              {[
                { label: 'f', href: 'https://www.facebook.com/cchumedia', title: 'Facebook' },
                { label: 'in', href: 'https://www.instagram.com/cchumedia', title: 'Instagram' },
                { label: 'x', href: 'https://www.twitter.com/cchumedia', title: 'Twitter' },
              ].map(({ label, href, title }) => (
                <a key={title} href={href} target="_blank" rel="noopener noreferrer" aria-label={title}
                  style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: 700, fontFamily: 'Montserrat' }}>
                  {label}
                </a>
              ))}
            </div>
          </div>

          {/* Services */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.35)', marginBottom: 16 }}>Services</div>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
              {[
                { label: 'All Services', href: '/shop' },
                { label: 'Starter Kits', href: '/starter-kits' },
                { label: 'Campaign Materials', href: '/election-campaign' },
                { label: 'Book Publishing', href: '/book-publishing' },
                { label: 'Affiliate Program', href: '/affiliate' },
              ].map(item => (
                <Link key={item.label} href={item.href}
                  style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', textDecoration: 'none' }}>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Company */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.35)', marginBottom: 16 }}>Company</div>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
              {[
                { label: 'About Us', href: '/about' },
                { label: 'How it works', href: '/how-it-works' },
                { label: 'Contact', href: '/contact' },
                { label: 'Login', href: '/auth' },
                { label: 'Register Free', href: '/auth?tab=register' },
              ].map(item => (
                <Link key={item.label} href={item.href}
                  style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', textDecoration: 'none' }}>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.35)', marginBottom: 16 }}>Contact</div>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
              <a href="tel:+2348063753209" style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', textDecoration: 'none' }}>+234 806 375 3209</a>
              <a href="tel:+2348052929523" style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', textDecoration: 'none' }}>+234 805 292 9523</a>
              <a href="mailto:info@cchumedia.com" style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', textDecoration: 'none' }}>info@cchumedia.com</a>
              <a href="https://wa.me/2348052929523" target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', textDecoration: 'none' }}>WhatsApp us</a>
              <a href="https://maps.google.com/?q=C-Chu+Media+Ltd+Karu+Abuja" target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', lineHeight: 1.5, textDecoration: 'none' }}>
                Suite 38, Mazfallah Plaza, Karu, Abuja
              </a>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>Mon - Sat: 8am - 7pm</span>
            </div>
          </div>
        </div>


        {/* Bottom bar */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: 12 }}>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>
            2026 C-Chu Media Limited. All rights reserved.
          </span>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>printhub.cchumedia.com</span>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .footer-grid { grid-template-columns: 1fr 1fr !important; gap: 32px !important; }
          footer { padding: 48px 24px 24px !important; }
        }
        @media (max-width: 640px) {
          footer { padding: 40px 16px 20px !important; }
        }
        @media (max-width: 500px) {
          .footer-grid { grid-template-columns: 1fr !important; gap: 28px !important; }
        }
      `}</style>
    </footer>
  )
}