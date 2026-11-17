'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { ShoppingCart, MessageCircle } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import { displayCurrency, canShipPrintTo, formatMoney, unitPrice } from '@/lib/books/currency'
import { bulkOrderWhatsAppUrl, internationalPrintWhatsAppUrl } from '@/lib/books/seo'
import type { BookPublic, BookFormatPublic } from '@/lib/books/types'

const LABEL: Record<string, string> = { ebook: 'Ebook', print: 'Print copy', bundle: 'Print + Ebook bundle' }
const BLURB: Record<string, string> = {
  ebook: 'Instant digital download (PDF or EPUB), personal to your account.',
  print: 'Printed and delivered within Nigeria, or pick up in Karu.',
  bundle: 'The printed book plus the ebook. Delivered within Nigeria.',
}
const ORDER = ['ebook', 'print', 'bundle']

// The one buy path on a book page: each format shows its price once with its own Add to cart button.
// Outside Nigeria print and bundle are replaced by an "ask us" link, and USD shows only when it is switched on.
export default function BookBuyPanel({ book, country, usdOn }: { book: BookPublic; country: string | null; usdOn: boolean }) {
  const addBook = useCartStore(s => s.addBookToCart)
  const [qty, setQty] = useState<Record<string, number>>({})
  const printOk = canShipPrintTo(country)
  // the page needs room for the fixed bar on phones (same rule the product pages use)
  useEffect(() => { document.body.classList.add('has-buy-bar'); return () => document.body.classList.remove('has-buy-bar') }, [])
  const formats = [...book.formats].sort((a, b) => ORDER.indexOf(a.type) - ORDER.indexOf(b.type))

  const add = (f: BookFormatPublic) => {
    const currency = displayCurrency(f, country, usdOn)
    const price = unitPrice(f, currency)
    if (price == null) return
    const q = f.type === 'ebook' ? 1 : Math.max(1, Math.min(50, qty[f.id] || 1))
    const r = addBook({ bookId: book.id, bookFormatId: f.id, title: book.title, type: f.type, unitPrice: price, quantity: q, currency, image: book.cover_url || undefined })
    if (!r.ok) toast.error(r.reason)
  }

  const primary = formats.find(f => f.type === 'ebook') || formats.find(f => printOk && f.type !== 'ebook') || formats[0]

  return (
    <div>
      <div style={{ display: 'grid', gap: 12 }}>
        {formats.map(f => {
          const blockedPrint = f.type !== 'ebook' && !printOk
          const currency = displayCurrency(f, country, usdOn)
          const price = unitPrice(f, currency) as number
          const out = f.type !== 'ebook' && f.stock != null && f.stock <= 0
          return (
            <section key={f.id} aria-label={LABEL[f.type]} style={{ border: '1px solid var(--border-color, #e8e8e5)', borderRadius: 12, padding: 16, background: 'var(--bg-card, #fff)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline', flexWrap: 'wrap' }}>
                <h3 style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 16, margin: 0 }}>{LABEL[f.type]}</h3>
                {!blockedPrint && <div style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 20, color: 'var(--red)' }}>{formatMoney(price, currency)}</div>}
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary, #6b6b6b)', margin: '6px 0 12px', lineHeight: 1.6 }}>{BLURB[f.type]}</p>
              {blockedPrint ? (
                <a href={internationalPrintWhatsAppUrl(book.title)} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-flex', gap: 8, alignItems: 'center', fontWeight: 700, fontSize: 14, color: '#128C7E', textDecoration: 'none' }}>
                  <MessageCircle size={16} aria-hidden="true" /> Ask us about international print
                </a>
              ) : (
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  {f.type !== 'ebook' && (
                    <label style={{ fontSize: 13 }}>Copies{' '}
                      <input type="number" min={1} max={50} value={qty[f.id] || 1}
                        onChange={e => setQty(p => ({ ...p, [f.id]: Math.max(1, Math.min(50, Number(e.target.value) || 1)) }))}
                        style={{ width: 64, padding: 8, border: '1px solid var(--border-color, #ddd)', borderRadius: 8, marginLeft: 4 }} />
                    </label>
                  )}
                  <button type="button" onClick={() => add(f)} disabled={out}
                    style={{ flex: 1, minWidth: 160, display: 'inline-flex', gap: 8, alignItems: 'center', justifyContent: 'center', padding: '12px 18px', border: 'none', borderRadius: 10, background: out ? '#d1d5db' : 'var(--red)', color: out ? '#6b7280' : '#fff', fontFamily: 'Montserrat', fontWeight: 700, fontSize: 15, cursor: out ? 'not-allowed' : 'pointer' }}>
                    <ShoppingCart size={17} aria-hidden="true" /> {out ? 'Out of stock' : 'Add to cart'}
                  </button>
                </div>
              )}
            </section>
          )
        })}
      </div>

      <a href={bulkOrderWhatsAppUrl(book.title)} target="_blank" rel="noopener noreferrer"
        style={{ marginTop: 14, width: '100%', padding: 13, background: '#25D366', color: '#fff', borderRadius: 10, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, textDecoration: 'none', boxSizing: 'border-box' }}>
        <MessageCircle size={18} aria-hidden="true" /> Bulk order for schools and churches
      </a>
      <p style={{ fontSize: 12, color: 'var(--text-secondary, #6b6b6b)', marginTop: 10 }}>
        You need to be signed in to buy. <Link href="/auth?tab=login" style={{ color: 'var(--red)' }}>Sign in</Link> or <Link href="/auth?tab=register" style={{ color: 'var(--red)' }}>create an account</Link> at checkout.
      </p>

      {/* Sticky buy bar on phones: the default format, one tap */}
      {primary && (() => {
        const blocked = primary.type !== 'ebook' && !printOk
        const cur = displayCurrency(primary, country, usdOn)
        return (
          <div className="mobile-buy-bar" role="region" aria-label="Buy this book">
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, color: 'var(--gray)' }}>{LABEL[primary.type]}</div>
              <div style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 18, color: 'var(--red)', lineHeight: 1.1 }}>{formatMoney(unitPrice(primary, cur) as number, cur)}</div>
            </div>
            {blocked ? (
              <a href={internationalPrintWhatsAppUrl(book.title)} target="_blank" rel="noopener noreferrer" style={{ flex: 1, textAlign: 'center', padding: '12px 14px', borderRadius: 10, background: '#25D366', color: '#fff', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>Ask about print</a>
            ) : (
              <button type="button" onClick={() => add(primary)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 14px', border: 'none', borderRadius: 10, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, background: 'var(--red)', color: '#fff', cursor: 'pointer' }}>
                <ShoppingCart size={16} aria-hidden="true" /> Add to cart
              </button>
            )}
          </div>
        )
      })()}
    </div>
  )
}
