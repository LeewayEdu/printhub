'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { NAV_LINKS } from '@/lib/constants'
import { ShoppingCart, User, Menu, X } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import { useThemeStore } from '@/store/themeStore'
import { Sun, Moon } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import NotificationBar from './NotificationBar'
import FlashSaleBanner from './FlashSaleBanner'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const cartCount = useCartStore(state => state.totalItems())
  const { theme, toggleTheme } = useThemeStore()
  const [isLoggedIn, setIsLoggedIn] = useState(false)

useEffect(() => {
  supabase.auth.getSession().then(({ data: { session } }) => {
    setIsLoggedIn(!!session)
  })
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
    setIsLoggedIn(!!session)
  })
  return () => subscription.unsubscribe()
}, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      <NotificationBar />
      <FlashSaleBanner />
      <nav
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: scrolled ? 'rgba(255,255,255,0.97)' : 'rgba(255,255,255,0.96)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--border)',
          padding: '0 40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '68px',
          transition: 'box-shadow 0.3s',
          boxShadow: scrolled ? '0 2px 20px rgba(0,0,0,0.06)' : 'none',
        }}
      >
        {/* LOGO */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <img
  src="/C-Chu_media_Logo_.png"
  alt="C-Chu Media"
  style={{ width: 40, height: 40, objectFit: 'contain' }}
/>
          <div>
            <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 16, color: 'var(--black)', lineHeight: 1.2 }}>
              PrintHub
            </div>
            <div style={{ fontSize: 11, color: 'var(--gray)', fontWeight: 400 }}>
              by C-Chu Media Ltd
            </div>
          </div>
        </Link>

        {/* DESKTOP NAV LINKS */}
        <div style={{ display: 'flex', gap: 28, alignItems: 'center' }} className="desktop-nav">
          {NAV_LINKS.map(link => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                fontSize: 14,
                color: 'var(--gray)',
                textDecoration: 'none',
                transition: 'color 0.2s',
                fontFamily: 'Open Sans',
                fontWeight: 400,
              }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--red)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--gray)')}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* RIGHT CTAs */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 38, height: 38, borderRadius: 8,
                border: '1px solid var(--border-color)',
                background: 'transparent', cursor: 'pointer',
                color: 'var(--text-primary)', transition: 'all 0.2s',
              }}
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>
          {/* Cart */}        
          <Link
            href="/cart"
            style={{
              position: 'relative', display: 'flex', alignItems: 'center',
              justifyContent: 'center', width: 38, height: 38,
              borderRadius: 8, border: '1px solid var(--border)',
              color: 'var(--dark)', transition: 'all 0.2s',
              textDecoration: 'none',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--red)'
              e.currentTarget.style.color = 'var(--red)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--border)'
              e.currentTarget.style.color = 'var(--dark)'
            }}
          >
            <ShoppingCart size={17} />
            {cartCount > 0 && (
              <span style={{
                position: 'absolute', top: -4, right: -4,
                background: 'var(--red)', color: 'white',
                fontSize: 10, fontWeight: 700, width: 16, height: 16,
                borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {cartCount}
              </span>
            )}
          </Link>

          {/* Dashboard / Login — always visible as icon */}
          <Link
            href={isLoggedIn ? '/dashboard' : '/auth'}
            title={isLoggedIn ? 'Dashboard' : 'Login'}
            style={{
              position: 'relative', display: 'flex', alignItems: 'center',
              justifyContent: 'center', width: 38, height: 38,
              borderRadius: 8, border: '1px solid var(--border-color)',
              color: 'var(--text-primary)', textDecoration: 'none', transition: 'all 0.2s',
              background: isLoggedIn ? 'var(--red)' : 'transparent',
              borderColor: isLoggedIn ? 'var(--red)' : 'var(--border-color)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--red)'
              e.currentTarget.style.color = isLoggedIn ? 'white' : 'var(--red)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = isLoggedIn ? 'var(--red)' : 'var(--border-color)'
              e.currentTarget.style.color = isLoggedIn ? 'white' : 'var(--text-primary)'
            }}
          >
            <User size={17} color={isLoggedIn ? 'white' : 'currentColor'} />
          </Link>

          {/* Order Now */}
          <Link
            href="/auth?tab=register"
            className="nav-order-btn"
            style={{
              fontSize: 13, fontWeight: 700, padding: '9px 20px',
              background: 'var(--red)', color: 'white', borderRadius: 8,
              textDecoration: 'none', transition: 'all 0.2s',
              fontFamily: 'Montserrat',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--red-dark)'
              e.currentTarget.style.transform = 'translateY(-1px)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'var(--red)'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            Order Now →
          </Link>

          {/* Hamburger (mobile) */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              display: 'none', background: 'none', border: 'none',
              cursor: 'pointer', color: 'var(--dark)', padding: 4,
            }}
            className="mobile-menu-btn"
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {/* MOBILE MENU OVERLAY */}
      {menuOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 99,
            background: 'rgba(26,26,26,0.97)',
            display: 'flex', flexDirection: 'column',
            padding: '100px 32px 40px',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          {NAV_LINKS.map(link => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              style={{
                fontFamily: 'Montserrat', fontWeight: 700, fontSize: 28,
                color: 'white', textDecoration: 'none',
                padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.06)',
                transition: 'color 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--red)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'white')}
            >
              {link.label}
            </Link>
          ))}
          <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
            <Link
              href={isLoggedIn ? '/dashboard' : '/auth'}
              onClick={() => setMenuOpen(false)}
              className="btn btn-ghost"
              style={{ flex: 1, justifyContent: 'center' }}
            >
              {isLoggedIn ? 'Dashboard' : 'Login'}
            </Link>
            <Link
              href="/auth?tab=register"
              onClick={() => setMenuOpen(false)}
              className="btn btn-primary"
              style={{ flex: 1, justifyContent: 'center' }}
            >
              Order Now →
            </Link>
          </div>
        </div>
      )}

      <style>{`
        /* Shrink nav gap + font on large tablets */
        @media (max-width: 1200px) {
          nav { padding: 0 20px !important; }
          .desktop-nav { gap: 18px !important; }
          .desktop-nav a { font-size: 13px !important; }
        }
        @media (max-width: 1060px) {
          .desktop-nav { gap: 12px !important; }
          .desktop-nav a { font-size: 12px !important; }
        }
        /* Collapse to hamburger at 940px */
        @media (max-width: 940px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
          nav { padding: 0 16px !important; }
          .nav-order-btn { display: none !important; }
        }
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
      `}</style>
    </>
  )
}