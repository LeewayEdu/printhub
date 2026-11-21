import Link from 'next/link'
import Image from 'next/image'

// Display-safe props only (already passed through the consent rules). One consistent 4:3 crop for every card,
// centred on the middle of the picture so the subject stays in frame for square, portrait and landscape photos.
export interface CaseCardData {
  slug: string; title: string; summary: string; category: string
  stats: { value: string; label: string }[]
  heroSrc?: string | null; heroAlt?: string | null
}

export default function CaseCard({ c, headingLevel = 'h2' }: { c: CaseCardData; headingLevel?: 'h2' | 'h3' }) {
  const H = headingLevel
  return (
    <Link href={`/case-studies/${c.slug}`} style={{ display: 'flex', flexDirection: 'column', height: '100%', textDecoration: 'none', color: 'inherit', background: 'var(--bg-card, #fff)', border: '1px solid var(--border-color, #e8e8e5)', borderRadius: 14, overflow: 'hidden' }}>
      {c.heroSrc && (
      <span style={{ display: 'block', position: 'relative', aspectRatio: '4 / 3', background: '#eee' }}>
        <Image src={c.heroSrc} alt={c.heroAlt || ''} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px" style={{ objectFit: 'cover', objectPosition: 'center 40%' }} />
      </span>
      )}
      <span style={{ display: 'block', padding: '16px 18px 18px' }}>
        <span style={{ display: 'block', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--red)', marginBottom: 6 }}>{c.category}</span>
        <H style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 18, lineHeight: 1.3, margin: '0 0 8px', color: 'var(--text-primary)' }}>{c.title}</H>
        <span style={{ display: 'block', fontSize: 14, lineHeight: 1.6, color: 'var(--text-secondary, #6b6b6b)', marginBottom: 12 }}>{c.summary}</span>
        <span style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px' }}>
          {c.stats.slice(0, 3).map(s => (
            <span key={s.label} style={{ fontSize: 12, color: 'var(--text-secondary, #6b6b6b)' }}>
              <strong style={{ fontFamily: 'Montserrat', fontSize: 16, color: 'var(--text-primary)' }}>{s.value}</strong> {s.label}
            </span>
          ))}
        </span>
      </span>
    </Link>
  )
}
