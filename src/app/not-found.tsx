import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--black)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 30% 50%, rgba(192,57,43,0.15) 0%, transparent 50%)' }} />
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
      <div style={{ textAlign: 'center' as const, position: 'relative', zIndex: 2 }}>
        <div style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 'clamp(80px, 15vw, 160px)', color: 'var(--red)', lineHeight: 1, marginBottom: 8, opacity: 0.8 }}>
          404
        </div>
        <h1 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 'clamp(24px, 4vw, 36px)', color: 'white', marginBottom: 16 }}>
          Page not found
        </h1>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', maxWidth: 400, margin: '0 auto 36px', lineHeight: 1.7 }}>
          The page you are looking for does not exist or has been moved.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' as const }}>
          <Link href="/"
            style={{ background: 'var(--red)', color: 'white', fontFamily: 'Montserrat', fontWeight: 700, fontSize: 15, padding: '13px 28px', borderRadius: 9, textDecoration: 'none' }}>
            Go to Homepage
          </Link>
          <Link href="/shop"
            style={{ background: 'rgba(255,255,255,0.08)', color: 'white', fontFamily: 'Montserrat', fontWeight: 700, fontSize: 15, padding: '13px 28px', borderRadius: 9, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.15)' }}>
            Browse Shop
          </Link>
        </div>
      </div>
    </div>
  )
}