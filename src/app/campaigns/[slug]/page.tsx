// src/app/campaigns/[slug]/page.tsx
// Lead generation landing page — fully driven from the campaigns
// table. Marketing team creates new pages from the admin dashboard
// without any code deployment.

import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { generateCampaignMetadata, BreadcrumbSchema } from '@/components/seo'

export const dynamic = 'force-dynamic'


const SITE_URL = 'https://printhub.cchumedia.com'
const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function generateStaticParams() {
  const { data } = await supabaseServer.from('campaigns').select('slug').eq('is_active', true)
  return (data || []).map(c => ({ slug: c.slug }))
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const { data } = await supabaseServer.from('campaigns').select('headline, seo_title, meta_description, slug, og_image').eq('slug', params.slug).single()
  if (!data) return { title: 'Not Found' }
  return generateCampaignMetadata(data)
}

export default async function CampaignPage({ params }: { params: { slug: string } }) {
  const { data: campaign } = await supabaseServer
    .from('campaigns')
    .select('*')
    .eq('slug', params.slug)
    .eq('is_active', true)
    .single()
  if (!campaign) notFound()

  const formFields: any[] = Array.isArray(campaign.form_fields) ? campaign.form_fields : []
  const breadcrumbs = [
    { name: 'Home', url: SITE_URL },
    { name: campaign.headline, url: `${SITE_URL}/campaigns/${campaign.slug}` },
  ]

  return (
    <>
      <BreadcrumbSchema items={breadcrumbs} />
      <div style={{ minHeight: '100vh', background: '#fff' }}>

        {/* Hero */}
        <div style={{ position: 'relative' as const, minHeight: 480, display: 'flex', alignItems: 'center', justifyContent: 'center', background: campaign.hero_image ? undefined : '#111', overflow: 'hidden' }}>
          {campaign.hero_image && (
            <>
              <img src={campaign.hero_image} alt={campaign.headline} style={{ position: 'absolute' as const, inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute' as const, inset: 0, background: 'rgba(0,0,0,0.6)' }} />
            </>
          )}
          <div style={{ position: 'relative' as const, zIndex: 1, textAlign: 'center' as const, padding: 'clamp(32px, 6vw, 80px) clamp(16px, 4vw, 48px)', maxWidth: 720 }}>
            <h1 style={{ fontFamily: 'Montserrat', fontWeight: 900, fontSize: 'clamp(28px, 5vw, 56px)', color: 'white', lineHeight: 1.1, marginBottom: 16 }}>
              {campaign.headline}
            </h1>
            {campaign.subheadline && (
              <p style={{ fontSize: 'clamp(15px, 2vw, 20px)', color: 'rgba(255,255,255,0.8)', lineHeight: 1.6, marginBottom: 32 }}>
                {campaign.subheadline}
              </p>
            )}
            <a href={campaign.cta_type === 'whatsapp'
                ? `https://wa.me/${campaign.cta_destination}?text=${encodeURIComponent(`Hello, I'm interested in: ${campaign.headline}`)}`
                : campaign.cta_type === 'phone'
                ? `tel:${campaign.cta_destination}`
                : `mailto:${campaign.cta_destination}`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '16px 36px', background: 'var(--red)', color: 'white', borderRadius: 10, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 18, textDecoration: 'none' }}>
              {campaign.cta_text}
            </a>
          </div>
        </div>

        {/* Body content */}
        {campaign.body_content && (
          <div style={{ maxWidth: 760, margin: '0 auto', padding: '56px clamp(16px, 4vw, 32px)' }}>
            <div style={{ fontSize: 16, color: 'var(--gray)', lineHeight: 1.8 }}
              dangerouslySetInnerHTML={{ __html: campaign.body_content }} />
          </div>
        )}

        {/* Lead form — only shown when cta_type is 'form' */}
        {campaign.cta_type === 'form' && formFields.length > 0 && (
          <div style={{ maxWidth: 560, margin: '0 auto 64px', padding: '0 clamp(16px, 4vw, 32px)' }}>
            <div style={{ background: '#f7f7f5', borderRadius: 16, padding: '32px' }}>
              <h2 style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 20, marginBottom: 24, color: 'var(--text-primary)' }}>
                {campaign.cta_text}
              </h2>
              {/* Form fields are rendered dynamically from the JSON config */}
              <form onSubmit={e => {
                e.preventDefault()
                const data = new FormData(e.currentTarget as HTMLFormElement)
                const body = Object.fromEntries(data.entries())
                const msg = Object.entries(body).map(([k, v]) => `${k}: ${v}`).join('\n')
                window.open(`https://wa.me/2348052929523?text=${encodeURIComponent(`New enquiry from ${campaign.headline}:\n\n${msg}`)}`, '_blank')
              }}>
                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 16, marginBottom: 24 }}>
                  {formFields.map((field: any) => (
                    <div key={field.name}>
                      <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6, color: 'var(--text-primary)' }}>
                        {field.label}{field.required && ' *'}
                      </label>
                      {field.type === 'textarea'
                        ? <textarea name={field.name} required={field.required} placeholder={field.placeholder}
                            style={{ width: '100%', padding: '10px 12px', border: '1px solid #d0d0d0', borderRadius: 8, fontSize: 14, fontFamily: 'Open Sans', minHeight: 100, resize: 'vertical' as const, boxSizing: 'border-box' as const }} />
                        : field.type === 'select'
                        ? <select name={field.name} required={field.required}
                            style={{ width: '100%', padding: '10px 12px', border: '1px solid #d0d0d0', borderRadius: 8, fontSize: 14, fontFamily: 'Open Sans' }}>
                            <option value="">Select...</option>
                            {(field.options || []).map((o: string) => <option key={o} value={o}>{o}</option>)}
                          </select>
                        : <input type={field.type || 'text'} name={field.name} required={field.required} placeholder={field.placeholder}
                            style={{ width: '100%', padding: '10px 12px', border: '1px solid #d0d0d0', borderRadius: 8, fontSize: 14, fontFamily: 'Open Sans', boxSizing: 'border-box' as const }} />
                      }
                    </div>
                  ))}
                </div>
                <button type="submit"
                  style={{ width: '100%', padding: '14px', background: 'var(--red)', color: 'white', border: 'none', borderRadius: 10, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>
                  {campaign.cta_text}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  )
}