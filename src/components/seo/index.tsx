// src/components/seo/index.tsx
import { Metadata } from 'next'
import { SITE_URL } from '@/lib/site-url'
import { BRAND } from '@/lib/constants'

const SITE_NAME = 'PrintHub by C-Chu Media'
const TITLE_SUFFIX = 'PrintHub'
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`
export const MAX_DESCRIPTION = 155

// Trim to a whole word under `max` characters.
export function clampText(text: string, max: number): string {
  if (text.length <= max) return text
  const cut = text.slice(0, max - 1)
  return cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:\s-]+$/, '') + '…'
}

// The root layout adds " | PrintHub" through its title template, so strip any
// brand suffix a stored title already carries (avoids "… | PrintHub | PrintHub").
export function cleanTitle(title: string): string {
  return title.replace(/(\s*[|\-–—]\s*PrintHub(\s+Abuja)?)+\s*$/i, '').trim()
}

// openGraph/twitter titles do not go through the template, so add the suffix.
export function fullTitle(title: string): string {
  return `${cleanTitle(title)} | ${TITLE_SUFFIX}`
}

// Social images must be absolute; fall back to the site image for anything else.
export function absoluteImage(src?: string | null): string {
  if (!src) return DEFAULT_OG_IMAGE
  if (src.startsWith('/')) return `${SITE_URL}${src}`
  return /^https?:\/\//.test(src) ? src : DEFAULT_OG_IMAGE
}

// One place to build complete page metadata with a canonical URL.
export function pageMetadata(opts: {
  title: string
  description: string
  path: string
  image?: string | null
  imageAlt?: string
}): Metadata {
  const title = cleanTitle(opts.title)
  const description = clampText(opts.description, MAX_DESCRIPTION)
  const url = `${SITE_URL}${opts.path === '/' ? '' : opts.path}`
  const image = absoluteImage(opts.image)
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: fullTitle(title), description, url, siteName: SITE_NAME, type: 'website', locale: 'en_NG',
      images: [{ url: image, width: 1200, height: 630, alt: opts.imageAlt || SITE_NAME }],
    },
    twitter: { card: 'summary_large_image', title: fullTitle(title), description, images: [image] },
  }
}

export function generateProductMetadata(product: {
  name: string
  seo_title?: string | null
  meta_description?: string | null
  slug: string
  images?: string[]
  image_url?: string | null
  short_description?: string | null
}): Metadata {
  const description = product.meta_description
    || product.short_description
    || `Order ${product.name} online from PrintHub — professional printing in Abuja, Nigeria. Fast turnaround, competitive prices.`
  return pageMetadata({
    title: product.seo_title || product.name,
    description,
    path: `/products/${product.slug}`,
    image: product.images?.[0] || product.image_url,
    imageAlt: product.name,
  })
}

export function generateIndustryMetadata(industry: {
  name: string
  seo_title?: string | null
  meta_description?: string | null
  slug: string
  hero_image?: string | null
  subheadline?: string | null
}): Metadata {
  const lead = industry.subheadline ? `${industry.subheadline.replace(/\.$/, '')}. ` : ''
  // Pick the first wording that lands in the 120-155 character window.
  const candidates = [
    `${lead}Order print materials for ${industry.name} from PrintHub by C-Chu Media in Abuja, with a free design review.`,
    `Order print materials for ${industry.name} online from PrintHub by C-Chu Media in Abuja, with a free design review before printing.`,
    `Print materials for ${industry.name} from PrintHub by C-Chu Media in Abuja. Order online and get a free design review before printing.`,
  ]
  const fitted = candidates.find(c => c.length >= 120 && c.length <= MAX_DESCRIPTION)
  return pageMetadata({
    title: industry.seo_title || `${industry.name} Printing Services in Abuja`,
    description: industry.meta_description || fitted || candidates[1],
    path: `/industries/${industry.slug}`,
    image: industry.hero_image,
    imageAlt: industry.name,
  })
}

export function generateCampaignMetadata(campaign: {
  headline: string
  seo_title?: string | null
  meta_description?: string | null
  slug: string
  og_image?: string | null
}): Metadata {
  return pageMetadata({
    title: campaign.seo_title || campaign.headline,
    description: campaign.meta_description || campaign.headline,
    path: `/campaigns/${campaign.slug}`,
    image: campaign.og_image,
    imageAlt: campaign.headline,
  })
}

// Serialise JSON-LD safely: "<" is escaped so content can never close the script tag.
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  )
}

const absoluteUrl = (u: string) => (/^https?:\/\//.test(u) ? u : `${SITE_URL}${u.startsWith('/') ? '' : '/'}${u === '/' ? '' : u}`)

export function LocalBusinessSchema() {
  const { hoursSpec } = BRAND
  return (
    <JsonLd data={{
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      '@id': `${SITE_URL}/#business`,
      name: 'C-Chu Media Ltd',
      alternateName: 'PrintHub',
      url: SITE_URL,
      logo: `${SITE_URL}/C-Chu_media_Logo_.png`,
      image: `${SITE_URL}/og-image.png`,
      telephone: BRAND.phone1,
      email: BRAND.email,
      foundingDate: BRAND.since,
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'Suite 38, Mazfallah Shopping Complex',
        addressLocality: 'Karu',
        addressRegion: 'Abuja FCT',
        postalCode: '900110',
        addressCountry: 'NG',
      },
      contactPoint: [
        { '@type': 'ContactPoint', contactType: 'customer service', telephone: BRAND.phone1, availableLanguage: 'English' },
        { '@type': 'ContactPoint', contactType: 'WhatsApp', telephone: `+${BRAND.whatsapp}`, url: `https://wa.me/${BRAND.whatsapp}` },
      ],
      openingHoursSpecification: [{
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: hoursSpec.days,
        opens: hoursSpec.opens,
        closes: hoursSpec.closes,
      }],
      areaServed: { '@type': 'Country', name: 'Nigeria' },
      sameAs: Object.values(BRAND.social),
    }} />
  )
}

export type ShippingRange = { min: number; max: number } | null

export function ProductSchema({ product, url, shipping, sku, reviewStats }: {
  product: { name: string; description?: string | null; images?: string[]; image_url?: string | null; display_price?: number; price?: number; slug: string; rating?: number | null; review_count?: number | null }
  url: string
  shipping?: ShippingRange
  sku?: string
  reviewStats?: { count: number; average: number } | null
}) {
  const price = product.display_price || product.price || 0
  const images = product.images?.length ? product.images : product.image_url ? [product.image_url] : []
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || undefined,
    image: images.length ? images.map(i => absoluteImage(i)) : undefined,
    url,
    sku: sku || undefined,
    brand: { '@type': 'Brand', name: 'PrintHub by C-Chu Media' },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'NGN',
      price: price > 0 ? price : undefined,
      availability: 'https://schema.org/InStock',
      url,
      seller: { '@type': 'Organization', name: 'C-Chu Media Ltd' },
      // Delivery fee range comes from the active rows in the delivery_settings table.
      shippingDetails: shipping ? {
        '@type': 'OfferShippingDetails',
        shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'NG' },
        shippingRate: {
          '@type': 'MonetaryAmount',
          currency: 'NGN',
          minValue: shipping.min,
          maxValue: shipping.max,
        },
      } : undefined,
      // Mirrors section 3 of the Terms page: defects reported within 48 hours are reprinted or refunded.
      hasMerchantReturnPolicy: {
        '@type': 'MerchantReturnPolicy',
        applicableCountry: 'NG',
        returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
        merchantReturnDays: 2,
        merchantReturnLink: `${SITE_URL}/terms`,
      },
    },
  }
  // Only emit a rating when the product has real, approved reviews (never the editable products.rating column).
  if (reviewStats && reviewStats.count > 0) {
    schema.aggregateRating = { '@type': 'AggregateRating', ratingValue: reviewStats.average, reviewCount: reviewStats.count }
  }
  return <JsonLd data={schema} />
}

export function FAQSchema({ faqs }: { faqs: { question: string; answer: string }[] }) {
  if (!faqs?.length) return null
  return (
    <JsonLd data={{
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map(f => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: { '@type': 'Answer', text: f.answer },
      })),
    }} />
  )
}

export function BreadcrumbSchema({ items }: { items: { name: string; url: string }[] }) {
  return (
    <JsonLd data={{
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items.map((item, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: item.name,
        item: absoluteUrl(item.url),
      })),
    }} />
  )
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