// SEO for the case-study pages. Pure functions so they can be tested. Nothing here ever produces
// review, rating or testimonial structured data.

import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo-meta'
import { SITE_URL } from '@/lib/site-url'
import type { CaseStudy, CaseView } from '@/lib/case-studies'

const abs = (src: string) => (/^https?:\/\//.test(src) ? src : `${SITE_URL}${src}`)

/** Metadata from the data (title, description), canonical URL, OG and Twitter image from the hero. */
export function caseMetadata(v: CaseView, opts: { preview?: boolean } = {}): Metadata {
  const meta = pageMetadata({
    title: v.seo.title, description: v.seo.description, path: `/case-studies/${v.slug}`,
    image: v.hero.src, imageAlt: v.hero.alt,
  })
  // The data's title already carries the brand, so use it exactly as written
  const title = { absolute: v.seo.title }
  return {
    ...meta, title,
    openGraph: { ...meta.openGraph, title: v.seo.title, type: 'article' },
    twitter: { ...meta.twitter, title: v.seo.title },
    // an unpublished case seen through the preview link must never be indexed or cached
    ...(opts.preview ? { robots: { index: false, follow: false } } : {}),
  }
}

/** The index page is kept out of search results while no case is published. */
export function caseIndexMetadata(anyPublished: boolean): Metadata {
  const meta = pageMetadata({
    title: 'Our work: recent jobs from C-Chu Media',
    description: 'Recent large-format, campaign and book-printing jobs by C-Chu Media in Abuja, Nigeria, with the numbers behind each one.',
    path: '/case-studies',
  })
  return anyPublished ? meta : { ...meta, robots: { index: false, follow: true } }
}

/** Article structured data. No rating, review or testimonial fields. A date is added only when the data holds a real ISO date. */
export function articleJsonLd(v: CaseView): Record<string, unknown> {
  const url = `${SITE_URL}/case-studies/${v.slug}`
  const org = { '@type': 'Organization', name: 'C-Chu Media Ltd', url: SITE_URL }
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: v.title,
    description: v.seo.description,
    image: [abs(v.hero.src)],
    url, mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    articleSection: v.category,
    author: org,
    publisher: { ...org, logo: { '@type': 'ImageObject', url: `${SITE_URL}/C-Chu_media_Logo_.png` } },
    ...(v.date && /^\d{4}-\d{2}(-\d{2})?$/.test(v.date) ? { datePublished: v.date } : {}),
  }
}

/** Sitemap rows: a case is listed only when it is published AND consent has been given. */
export function caseSitemapPaths(cases: Pick<CaseStudy, 'slug' | 'published' | 'consentGiven'>[]): string[] {
  const listed = cases.filter(c => c.published && c.consentGiven)
  return listed.length ? ['/case-studies', ...listed.map(c => `/case-studies/${c.slug}`)] : []
}
