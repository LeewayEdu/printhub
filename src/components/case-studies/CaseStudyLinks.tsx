'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface LinkCase { slug: string; title: string; category: string; serviceHref: string }

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

/** "See a recent job" link on a service page, for the published case that belongs to that page. */
export function RelatedCaseLink({ serviceHref }: { serviceHref: string }) {
  const cases = usePublishedCases().filter(c => c.serviceHref === serviceHref)
  if (cases.length === 0) return null
  return (
    <p style={{ textAlign: 'center', margin: '0 auto', padding: '20px 16px', maxWidth: 720, fontSize: 15 }}>
      {cases.map(c => (
        <Link key={c.slug} href={`/case-studies/${c.slug}`} style={{ color: 'var(--red)', fontWeight: 700, display: 'block', marginBottom: 6 }}>
          See a recent job: {c.title} →
        </Link>
      ))}
    </p>
  )
}
