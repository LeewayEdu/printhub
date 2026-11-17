'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useCartStore } from '@/store/cartStore'
import { CheckCircle, X } from 'lucide-react'

const SHOW_MS = 6000

// Small panel shown after "Add to cart": what was added, its total, and two next steps. It sits at the
// TOP of the screen, so it never covers the sticky buy bar or the chat launcher at the bottom. It
// closes itself after a few seconds (paused while hovered or focused), closes with Escape, and is
// announced to screen readers through role="status".
export default function MiniCartNotice() {
  const lastAdded = useCartStore(s => s.lastAdded)
  const [shown, setShown] = useState<typeof lastAdded>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const seen = useRef<number | null>(null)

  const start = () => { stop(); timer.current = setTimeout(() => setShown(null), SHOW_MS) }
  const stop = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null } }

  useEffect(() => {
    if (!lastAdded || lastAdded.key === seen.current) return
    seen.current = lastAdded.key
    setShown(lastAdded)
    start()
    return stop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastAdded])

  useEffect(() => {
    if (!shown) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShown(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [shown])

  if (!shown) return <div role="status" aria-live="polite" className="sr-only" />

  return (
    <div role="status" aria-live="polite" className="mini-cart-notice no-print"
      onMouseEnter={stop} onMouseLeave={start} onFocus={stop} onBlur={start}>
      <div className="mini-cart-card">
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <CheckCircle size={20} color="#10b981" style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14, fontFamily: 'Montserrat', color: 'var(--text-primary)' }}>Added to cart</div>
            <div style={{ fontSize: 13, color: 'var(--text-primary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{shown.name}</div>
            {shown.summary && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{shown.summary}</div>}
            <div style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 16, color: 'var(--red)', marginTop: 4 }}>₦{Number(shown.price).toLocaleString()}</div>
          </div>
          <button type="button" aria-label="Close" onClick={() => setShown(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-secondary)' }}><X size={16} /></button>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <Link href="/cart" onClick={() => setShown(null)} className="mini-cart-btn mini-cart-btn-ghost">View cart</Link>
          <Link href="/checkout" onClick={() => setShown(null)} className="mini-cart-btn mini-cart-btn-primary">Checkout</Link>
        </div>
      </div>
      <style>{`
        .mini-cart-notice { position: fixed; top: 84px; right: 16px; z-index: 1000; width: min(360px, calc(100vw - 32px)); animation: miniCartIn 0.2s ease; }
        .mini-cart-card { background: var(--bg-card, #fff); border: 1px solid var(--border-color, #e8e8e5); border-radius: 14px; padding: 14px 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.18); }
        .mini-cart-btn { flex: 1; text-align: center; padding: 10px 12px; border-radius: 9px; font-family: Montserrat, sans-serif; font-weight: 700; font-size: 13px; text-decoration: none; }
        .mini-cart-btn-ghost { border: 1px solid var(--border-color, #ddd); color: var(--text-primary); background: transparent; }
        .mini-cart-btn-primary { background: var(--red); color: #fff; border: 1px solid var(--red); }
        @keyframes miniCartIn { from { opacity: 0; transform: translateY(-8px) } to { opacity: 1; transform: translateY(0) } }
        @media (max-width: 767px) { .mini-cart-notice { top: 76px; left: 16px; right: 16px; width: auto; } }
        @media (prefers-reduced-motion: reduce) { .mini-cart-notice { animation: none; } }
      `}</style>
    </div>
  )
}
