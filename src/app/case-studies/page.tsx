import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { Breadcrumbs } from '@/components/seo'
import CaseCard from '@/components/case-studies/CaseCard'
import { publishedCaseViews } from '@/lib/case-studies'
import { caseIndexMetadata } from '@/lib/case-studies-seo'

export function generateMetadata() {
  return caseIndexMetadata(publishedCaseViews().length > 0)
}

export default function CaseStudiesIndex() {
  const cases = publishedCaseViews()          // published cases only; unpublished ones never reach this page
  return (
    <>
      <Navbar />
      <main id="main-content" style={{ background: 'var(--bg-secondary)', padding: '28px 16px 64px', minHeight: '65vh' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <Breadcrumbs items={[{ name: 'Home', href: '/' }, { name: 'Our work' }]} />
          <h1 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 'clamp(26px, 4vw, 38px)', margin: '0 0 8px' }}>Our work</h1>
          <p style={{ color: 'var(--text-secondary)', maxWidth: 640, lineHeight: 1.7, margin: '0 0 28px' }}>Recent jobs from C-Chu Media, with the numbers behind each one.</p>

          {cases.length === 0 ? (
            <div role="status" style={{ textAlign: 'center', padding: '56px 16px', background: 'var(--bg-card, #fff)', border: '1px solid var(--border-color, #e8e8e5)', borderRadius: 14 }}>
              <h2 style={{ fontFamily: 'Montserrat', fontSize: 20, margin: '0 0 8px' }}>Our first case studies are coming soon</h2>
              <p style={{ color: 'var(--text-secondary)', margin: '0 0 18px' }}>In the meantime, see what you can order online.</p>
              <Link href="/shop" className="btn btn-primary" style={{ display: 'inline-flex' }}>Browse the shop</Link>
            </div>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
              {cases.map(c => (
                <li key={c.slug}><CaseCard c={{ slug: c.slug, title: c.title, summary: c.summary, category: c.category, stats: c.stats, heroSrc: c.hero?.src ?? null, heroAlt: c.hero?.alt ?? null }} /></li>
              ))}
            </ul>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
