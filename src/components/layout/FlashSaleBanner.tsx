'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { Zap, X } from 'lucide-react'
import { useFlashSaleStore } from '@/store/flashSaleStore'

interface FlashSale {
  id: string
  label: string
  description: string
  promo_code: string | null
  ends_at: string
}

function useCountdown(target: string | null) {
  const calc = () => {
    if (!target) return null
    const diff = new Date(target).getTime() - Date.now()
    if (diff <= 0) return null
    return {
      h: Math.floor(diff / 3600000),
      m: Math.floor((diff % 3600000) / 60000),
      s: Math.floor((diff % 60000) / 1000),
    }
  }
  const [time, setTime] = useState(calc)
  useEffect(() => {
    if (!target) return
    const t = setInterval(() => setTime(calc()), 1000)
    return () => clearInterval(t)
  }, [target])
  return time
}

export default function FlashSaleBanner() {
  const [sale, setSale] = useState<FlashSale | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const countdown = useCountdown(sale?.ends_at || null)

  useEffect(() => {
    // Filter by ends_at directly in the query — previously this only
    // filtered by is_active and relied on a client-side re-check after
    // fetching. Adding .gt('ends_at', ...) means an expired-but-still
    // -marked-active row (the database-side bug fixed in the admin page)
    // never even gets fetched here in the first place, as a second
    // layer of defence on top of that fix.
    supabase
      .from('flash_sale')
      .select('*')
      .eq('is_active', true)
      .gt('ends_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const s = data[0]
          setSale(s)
          useFlashSaleStore.getState().setIsActive(true)
        }
      })
  }, [])

  // Auto-hide when countdown expires
  useEffect(() => {
    if (sale && !countdown) { setSale(null); useFlashSaleStore.getState().setIsActive(false) }
  }, [countdown, sale])

  if (!sale || !countdown || dismissed) return null

  const pad = (n: number) => String(n).padStart(2, '0')

  return (
    <div style={{ background: '#111', padding: '9px clamp(12px, 3vw, 16px)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, flexWrap: 'wrap' as const, position: 'relative' as const }}>
      {/* Label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <Zap size={13} color="#f59e0b" fill="#f59e0b" />
        <span style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 11, color: '#f59e0b', textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>
          {sale.label}
        </span>
      </div>

      {/* Description */}
      <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>{sale.description}</span>

      {/* Promo code */}
      {sale.promo_code && (
        <span style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)', color: '#f59e0b', fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20, fontFamily: 'Montserrat', letterSpacing: '0.06em', flexShrink: 0 }}>
          {sale.promo_code}
        </span>
      )}

      {/* Countdown */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Ends in</span>
        {[{ v: countdown.h, l: 'h' }, { v: countdown.m, l: 'm' }, { v: countdown.s, l: 's' }].map(({ v, l }, i) => (
          <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {i > 0 && <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14, fontWeight: 700, margin: '0 1px' }}>:</span>}
            <span style={{ fontFamily: 'Montserrat', fontWeight: 900, fontSize: 15, color: 'white', minWidth: 22, textAlign: 'center' as const }}>{pad(v)}</span>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.04em' }}>{l}</span>
          </span>
        ))}
      </div>

      {/* Shop now link */}
      <Link href="/shop" style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 11, color: '#f59e0b', textDecoration: 'none', letterSpacing: '0.04em', borderBottom: '1px solid rgba(245,158,11,0.5)', flexShrink: 0 }}>
        Shop Now →
      </Link>

      {/* Dismiss */}
      <button onClick={() => { setDismissed(true); useFlashSaleStore.getState().setIsActive(false) }}
        style={{ position: 'absolute' as const, right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 4, display: 'flex', alignItems: 'center' }}>
        <X size={14} />
      </button>
    </div>
  )
}