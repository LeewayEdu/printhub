import { notFound } from 'next/navigation'
import Image from 'next/image'
import type { Metadata } from 'next'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { Breadcrumbs, BreadcrumbSchema, JsonLd } from '@/components/seo'
import CaseGallery from '@/components/case-studies/CaseGallery'
import CaseCta from '@/components/case-studies/CaseCta'
import { resolveCase } from '@/lib/case-study-access'
import { articleJsonLd, caseMetadata } from '@/lib/case-studies-seo'

// Rendered per request: the preview token is read from the address, and a preview must never be cached.
export const dynamic = 'force-dynamic'

type Props = { params: { slug: string }; searchParams: { preview?: string | string[] } }

/** Published cases are public; an unpublished one is a 404 unless a valid preview token is given (see lib/case-study-access.ts). */
const resolve = ({ params, searchParams }: Props) => resolveCase(params.slug, searchParams.preview)

export function generateMetadata(props: Props): Metadata {
  const r = resolve(props)
  if (!r) return { title: 'Page not found', robots: { index: false, follow: false } }
  return { ...caseMetadata(r.v, { preview: r.preview }), ...(r.preview ? { referrer: 'no-referrer' as const } : {}) }
}

export default function CaseStudyPage(props: Props) {
  const r = resolve(props)
  if (!r) notFound()
  const { v, preview } = r
  const ratio = v.hero ? v.hero.width / v.hero.height : 1

  return (
    <>
      <Navbar />
      {!preview && (<>
        <JsonLd data={articleJsonLd(v)} />
        <BreadcrumbSchema items={[{ name: 'Home', url: '/' }, { name: 'Our work', url: '/case-studies' }, { name: v.title, url: `/case-studies/${v.slug}` }]} />
      </>)}
      {preview && (
        <div role="status" style={{ background: '#fef3c7', color: '#78350f', borderBottom: '1px solid #f59e0b', padding: '10px 16px', textAlign: 'center', fontSize: 14, fontWeight: 700 }}>
          Preview only: this case study is not published and is hidden from visitors and search engines.
        </div>
      )}
      <main id="main-content" style={{ background: 'var(--bg-secondary)', padding: '24px 16px 64px' }}>
        <article style={{ maxWidth: 960, margin: '0 auto' }}>
          <Breadcrumbs items={[{ name: 'Home', href: '/' }, { name: 'Our work', href: '/case-studies' }, { name: v.title }]} />

          <header>
            <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--red)', margin: '0 0 8px' }}>{v.category}</p>
            <h1 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 'clamp(26px, 4.5vw, 40px)', lineHeight: 1.2, margin: '0 0 10px' }}>{v.title}</h1>
            <p style={{ fontSize: 15, color: 'var(--text-secondary, #6b6b6b)', margin: 0 }}>{v.clientLine}{v.date ? ` · ${v.date}` : ''}</p>
          </header>

          {/* Hero: shown whole (never cropped), at its own proportions */}
          {v.hero && (
          <figure style={{ margin: '22px auto', maxWidth: `min(100%, ${Math.round(560 * ratio)}px)` }}>
            <div style={{ position: 'relative', aspectRatio: String(ratio), background: '#eee', borderRadius: 14, overflow: 'hidden' }}>
              <Image src={v.hero.src} alt={v.hero.alt} fill priority sizes="(max-width: 960px) 100vw, 560px" style={{ objectFit: 'contain' }} />
            </div>
            <figcaption style={{ fontSize: 13, color: 'var(--text-secondary, #6b6b6b)', marginTop: 8, textAlign: 'center' }}>{v.hero.caption}</figcaption>
          </figure>
          )}

          <dl aria-label="Key figures" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, margin: '0 0 32px' }}>
            {v.stats.map(s => (
              <div key={s.label} style={{ background: 'var(--bg-card, #fff)', border: '1px solid var(--border-color, #e8e8e5)', borderRadius: 12, padding: '16px 14px', textAlign: 'center' }}>
                <dd style={{ margin: 0, fontFamily: 'Montserrat', fontWeight: 800, fontSize: 'clamp(24px, 4vw, 32px)', color: 'var(--red)', lineHeight: 1.1 }}>{s.value}</dd>
                <dt style={{ fontSize: 13, color: 'var(--text-secondary, #6b6b6b)', marginTop: 6 }}>{s.label}</dt>
              </div>
            ))}
          </dl>

          <section aria-labelledby="glance" style={{ marginBottom: 32 }}>
            <h2 id="glance" style={h2}>Project at a glance</h2>
            <div style={{ overflowX: 'auto', background: 'var(--bg-card, #fff)', border: '1px solid var(--border-color, #e8e8e5)', borderRadius: 12 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <tbody>
                  {v.atAGlance.map(row => (
                    <tr key={row.label} style={{ borderBottom: '1px solid var(--border-color, #eee)' }}>
                      <th scope="row" style={{ textAlign: 'left', padding: '12px 14px', width: '34%', verticalAlign: 'top', color: 'var(--text-secondary, #6b6b6b)', fontWeight: 600 }}>{row.label}</th>
                      <td style={{ padding: '12px 14px', verticalAlign: 'top' }}>{row.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {v.sections.map(s => (
            <section key={s.heading} style={{ marginBottom: 26, maxWidth: 720 }}>
              <h2 style={h2}>{s.heading}</h2>
              <p style={{ lineHeight: 1.8, margin: 0 }}>{s.body}</p>
            </section>
          ))}

          {v.pullQuote && (
            // C-Chu Media's own line. Deliberately not styled as a client testimonial (no quote marks, no portrait, no stars).
            <aside aria-label="A note from C-Chu Media" style={{ borderLeft: '4px solid var(--red)', background: 'var(--bg-card, #fff)', padding: '16px 20px', margin: '8px 0 32px', maxWidth: 720, borderRadius: '0 12px 12px 0' }}>
              <p style={{ fontSize: 18, lineHeight: 1.6, margin: '0 0 8px', fontStyle: 'italic' }}>{v.pullQuote.text}</p>
              <p style={{ fontSize: 13, fontWeight: 700, margin: 0, color: 'var(--text-secondary, #6b6b6b)' }}>{v.pullQuote.attribution}</p>
            </aside>
          )}

          <section aria-labelledby="demonstrates" style={{ marginBottom: 32, maxWidth: 720 }}>
            <h2 id="demonstrates" style={h2}>What this project demonstrates</h2>
            <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.8 }}>{v.demonstrates.map(d => <li key={d}>{d}</li>)}</ul>
          </section>

          {v.images.length > 0 && (
          <section aria-labelledby="gallery" style={{ marginBottom: 32 }}>
            <h2 id="gallery" style={h2}>Photos</h2>
            <CaseGallery title={v.title} images={v.images.map(i => ({ src: i.src, alt: i.alt, caption: i.caption, width: i.width, height: i.height }))} />
          </section>
          )}

          {v.disclaimer && <p role="note" style={{ fontSize: 13, color: 'var(--text-secondary, #6b6b6b)', borderTop: '1px solid var(--border-color, #e8e8e5)', paddingTop: 14, margin: '0 0 28px', maxWidth: 720 }}>{v.disclaimer}</p>}

          <CaseCta slug={v.slug} label={v.cta.label} message={v.cta.whatsappMessage} serviceHref={v.serviceLink.href} serviceLabel={v.serviceLink.label} track={!preview} />
        </article>
      </main>
      <Footer />
    </>
  )
}

const h2: React.CSSProperties = { fontFamily: 'Montserrat', fontWeight: 800, fontSize: 'clamp(20px, 3vw, 24px)', margin: '0 0 12px' }
