'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { stepIndex, trapTab } from '@/lib/lightbox-focus'

export interface GalleryImage { src: string; alt: string; caption: string; width: number; height: number }

// Thumbnails use one consistent 4:3 crop that keeps the middle of the picture. The lightbox always shows the
// WHOLE picture (object-contain), so nothing is cropped destructively. Keyboard: Enter or Space opens a
// picture, Esc closes, arrow keys move between pictures, Tab stays inside the dialog, and focus returns to
// the picture that was opened.
export default function CaseGallery({ images, title }: { images: GalleryImage[]; title: string }) {
  const [open, setOpen] = useState<number | null>(null)
  const opener = useRef<HTMLElement | null>(null)
  const dialog = useRef<HTMLDivElement>(null)
  const isOpen = open !== null

  const close = useCallback(() => { setOpen(null); opener.current?.focus() }, [])

  useEffect(() => {
    if (!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus()
    return () => { document.body.style.overflow = prev }
  }, [isOpen])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); close(); return }
    if (e.key === 'ArrowRight') { e.preventDefault(); setOpen(i => stepIndex(i ?? 0, images.length, 1)); return }
    if (e.key === 'ArrowLeft') { e.preventDefault(); setOpen(i => stepIndex(i ?? 0, images.length, -1)); return }
    if (e.key === 'Tab') {
      const items = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not([disabled])') || [])
      if (!items.length) return
      e.preventDefault()
      items[trapTab(items.indexOf(document.activeElement as HTMLElement), items.length, e.shiftKey)].focus()
    }
  }

  const current = open !== null ? images[open] : null

  return (
    <>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
        {images.map((img, i) => (
          <li key={img.src}>
            <button type="button" aria-haspopup="dialog" aria-label={`Open photo ${i + 1} of ${images.length}: ${img.caption}`}
              onClick={e => { opener.current = e.currentTarget; setOpen(i) }}
              style={{ display: 'block', width: '100%', padding: 0, border: '1px solid var(--border-color, #e8e8e5)', borderRadius: 10, overflow: 'hidden', background: '#eee', cursor: 'zoom-in' }}>
              <span style={{ display: 'block', position: 'relative', aspectRatio: '4 / 3' }}>
                <Image src={img.src} alt={img.alt} fill sizes="(max-width: 640px) 50vw, 220px" style={{ objectFit: 'cover', objectPosition: 'center' }} />
              </span>
            </button>
            <div style={{ fontSize: 12, color: 'var(--text-secondary, #6b6b6b)', marginTop: 4, lineHeight: 1.4 }}>{img.caption}</div>
          </li>
        ))}
      </ul>

      {current && (
        <div ref={dialog} role="dialog" aria-modal="true" aria-label={`${title}: photo gallery`} onKeyDown={onKeyDown}
          onClick={e => { if (e.target === e.currentTarget) close() }}
          style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.92)', display: 'flex', flexDirection: 'column', padding: '12px 12px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff', padding: '4px 4px 8px' }}>
            <span aria-live="polite" style={{ fontSize: 13 }}>Photo {(open as number) + 1} of {images.length}</span>
            <button type="button" data-autofocus onClick={close} aria-label="Close gallery"
              style={{ background: '#fff', color: '#111', border: 'none', borderRadius: 8, padding: '8px 14px', fontWeight: 700, cursor: 'pointer', minHeight: 40 }}>Close</button>
          </div>
          {/* The picture takes the full width; the arrows sit on top of it so they never squeeze it on a phone */}
          <div style={{ flex: 1, minHeight: 0, position: 'relative' }} onClick={e => { if (e.target === e.currentTarget) close() }}>
            <Image key={current.src} src={current.src} alt={current.alt} fill sizes="100vw" style={{ objectFit: 'contain' }} priority />
            {images.length > 1 && <button type="button" aria-label="Previous photo" onClick={() => setOpen(i => stepIndex(i ?? 0, images.length, -1))} style={{ ...navBtn, left: 4 }}>‹</button>}
            {images.length > 1 && <button type="button" aria-label="Next photo" onClick={() => setOpen(i => stepIndex(i ?? 0, images.length, 1))} style={{ ...navBtn, right: 4 }}>›</button>}
          </div>
          <p style={{ color: '#fff', textAlign: 'center', fontSize: 14, margin: '10px 0 0' }}>{current.caption}</p>
        </div>
      )}
    </>
  )
}

const navBtn: React.CSSProperties = { position: 'absolute', top: '50%', transform: 'translateY(-50%)', zIndex: 1, width: 44, height: 44, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.9)', color: '#111', fontSize: 26, lineHeight: 1, cursor: 'pointer' }
