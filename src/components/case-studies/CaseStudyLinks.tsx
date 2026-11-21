'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface LinkCase { slug: string; title: string; category: string; summary?: string; serviceHref: string }

// One request per page load, shared by every link block. While nothing is published the list is empty
// and these components render nothing at all.
let cache: Promise<LinkCase[]> | null = null
const load = () => (cache ||= fetch('/api/case-studies/links').then(r => (r.ok ? r.json() : { cases: [] })).then(j => (Array.isArray(j.cases) ? j.cases : [])).catch(() => []))

function usePublishedCases() {
  const [cases, setCases] = useState<LinkCase[]>([])
  useEffect(() => { let on = true; load().then(c => { if (on) setCases(c) }); return () => { on = false } }, [])
  return cases
}

/** Footer link "Our work", shown only when at least one case is published. */
export function OurWorkFooterLink({ style }: { style?: React.CSSProperties }) {
  const cases = usePublishedCases()
  if (cases.length === 0) return null
  return <Link href="/case-studies" style={style}>Our work</Link>
}

/** "A recent job" card on a service page, for the published case that belongs to that page. Wording comes from the case study
 *  itself (already through the consent rules); nothing is written here. */
export function RelatedCaseLink({ serviceHref }: { serviceHref: string }) {
  const cases = usePublishedCases().filter(c => c.serviceHref === serviceHref)
  if (cases.length === 0) return null
  return (
    <section aria-label="A recent job" style={{ background: 'var(--bg)', padding: '8px 24px 56px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        {cases.map(c => (
          <Link key={c.slug} href={`/case-studies/${c.slug}`}
            style={{ display: 'block', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 14, padding: '20px 22px', textDecoration: 'none', marginBottom: 12 }}>
            <span style={{ display: 'block', fontFamily: 'Montserrat', fontWeight: 700, fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--red)', marginBottom: 6 }}>A recent job</span>
            <span style={{ display: 'block', fontFamily: 'Montserrat', fontWeight: 800, fontSize: 18, lineHeight: 1.3, color: 'var(--text-primary)', marginBottom: 6 }}>{c.title}</span>
            {c.summary && <span style={{ display: 'block', fontSize: 14, lineHeight: 1.6, color: 'var(--text-secondary)', marginBottom: 10 }}>{c.summary}</span>}
            <span style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, color: 'var(--red)' }}>Read the case study →</span>
          </Link>
        ))}
      </div>
    </section>
  )
}
