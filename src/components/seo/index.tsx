// src/components/seo/index.tsx
import { Metadata } from 'next'
import { SITE_URL } from '@/lib/site-url'

const SITE_NAME = 'PrintHub by C-Chu Media'
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.jpg`

export function generateProductMetadata(product: {
  name: string
  seo_title?: string | null
  meta_description?: string | null
  slug: string
  images?: string[]
  image_url?: string | null
  short_description?: string | null
}): Metadata {
  const title = product.seo_title || `${product.name} | PrintHub Abuja`
  const description = product.meta_description
    || product.short_description
    || `Order ${product.name} online from PrintHub — professional printing in Abuja, Nigeria. Fast turnaround, competitive prices.`
  const url = `${SITE_URL}/products/${product.slug}`
  const image = product.images?.[0] || product.image_url || DEFAULT_OG_IMAGE

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      images: [{ url: image, width: 1200, height: 630, alt: product.name }],
      type: 'website',
      locale: 'en_NG',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  }
}

// Trim to a whole word under `max` characters.
function clampText(text: string, max: number): string {
  if (text.length <= max) return text
  const cut = text.slice(0, max - 1)
  return cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:\s-]+$/, '') + '…'
}

export function generateIndustryMetadata(industry: {
  name: string
  seo_title?: string | null
  meta_description?: string | null
  slug: string
  hero_image?: string | null
  subheadline?: string | null
}): Metadata {
  const title = industry.seo_title || `${industry.name} Printing Services in Abuja`
  const lead = industry.subheadline ? `${industry.subheadline.replace(/\.$/, '')}. ` : ''
  // Pick the first wording that lands in the 120-155 character window.
  const candidates = [
    `${lead}Order print materials for ${industry.name} from PrintHub by C-Chu Media in Abuja, with a free design review.`,
    `Order print materials for ${industry.name} online from PrintHub by C-Chu Media in Abuja, with a free design review before printing.`,
    `Print materials for ${industry.name} from PrintHub by C-Chu Media in Abuja. Order online and get a free design review before printing.`,
  ]
  const fitted = candidates.find(c => c.length >= 120 && c.length <= 155)
  const description = industry.meta_description || fitted || clampText(candidates[1], 155)
  const url = `${SITE_URL}/industries/${industry.slug}`
  return {
    title, description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: SITE_NAME, images: [{ url: industry.hero_image || DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: industry.name }], type: 'website' },
    twitter: { card: 'summary_large_image', title, description, images: [industry.hero_image || DEFAULT_OG_IMAGE] },
  }
}

export function generateCampaignMetadata(campaign: {
  headline: string
  seo_title?: string | null
  meta_description?: string | null
  slug: string
  og_image?: string | null
}): Metadata {
  const title = campaign.seo_title || `${campaign.headline} | PrintHub`
  const description = campaign.meta_description || campaign.headline
  const url = `${SITE_URL}/campaigns/${campaign.slug}`
  return {
    title, description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: SITE_NAME, images: [{ url: campaign.og_image || DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: campaign.headline }], type: 'website' },
    twitter: { card: 'summary_large_image', title, description, images: [campaign.og_image || DEFAULT_OG_IMAGE] },
  }
}

export function ProductSchema({ product, url }: {
  product: { name: string; description?: string | null; images?: string[]; image_url?: string | null; display_price?: number; price?: number; slug: string }
  url: string
}) {
  const price = product.display_price || product.price || 0
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.images?.length ? product.images : product.image_url ? [product.image_url] : [],
    url,
    brand: { '@type': 'Brand', name: 'PrintHub by C-Chu Media' },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'NGN',
      price: price > 0 ? price : undefined,
      availability: 'https://schema.org/InStock',
      url,
      seller: { '@type': 'Organization', name: 'C-Chu Media Ltd' },
    },
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

export function FAQSchema({ faqs }: { faqs: { question: string; answer: string }[] }) {
  if (!faqs?.length) return null
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(f => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  }
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
}

export function BreadcrumbSchema({ items }: { items: { name: string; url: string }[] }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  }
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
}

export function Breadcrumbs({ items }: { items: { name: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" style={{ marginBottom: 20 }}>
      <ol style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '4px 8px', listStyle: 'none', padding: 0, margin: 0, fontSize: 13, color: 'var(--gray)' }}>
        {items.map((item, i) => (
          <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {i > 0 && <span style={{ color: 'var(--border)' }}>›</span>}
            {item.href && i < items.length - 1
              ? <a href={item.href} className="crumb-link">{item.name}</a>
              : <span style={{ color: i === items.length - 1 ? 'var(--text-primary)' : 'var(--gray)', fontWeight: i === items.length - 1 ? 600 : 400 }}>{item.name}</span>
            }
          </li>
        ))}
      </ol>
    </nav>
  )
}