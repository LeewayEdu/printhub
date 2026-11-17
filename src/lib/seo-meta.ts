// Pure metadata helpers (no JSX), shared by the SEO components and by server code that is tested under plain Node.
import type { Metadata } from 'next'
import { SITE_URL } from '@/lib/site-url'

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

