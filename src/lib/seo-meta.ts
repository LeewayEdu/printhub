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

// A <title> over about 60 characters is cut off in search results. The root layout adds " | PrintHub" (11 characters), so the
// page part gets 49. A long "Product name – long description" keeps the product name (the part before the dash) and then as
// many of the description's phrases (split at commas and "&") as still fit. If even the name is too long it is cut at a whole
// word. Titles that already fit are returned unchanged.
export const MAX_TITLE = 60
export function shortenTitle(title: string, suffix: string = TITLE_SUFFIX): string {
  const t = cleanTitle(title)
  const room = MAX_TITLE - (suffix.length + 3)   // " | " + suffix
  if (t.length <= room) return t
  const parts = t.split(/\s+[–—-]\s+/)
  const head = (parts[0] || t).trim()
  if (head.length > room) {
    const cut = head.slice(0, room + 1)
    return cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:&\s-]+$/, '') || head.slice(0, room)
  }
  const phrases = parts.slice(1).join(' – ').split(/\s*(?:,|&)\s*/).map(x => x.trim()).filter(Boolean)
  let out = head
  let tail = ''
  for (const ph of phrases) {
    const next = `${out} – ${tail ? `${tail}, ` : ''}${ph}`
    if (next.length > room) break
    tail = tail ? `${tail}, ${ph}` : ph
    out = `${head} – ${tail}`
  }
  return out
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
  const longTitle = cleanTitle(opts.title)
  const title = shortenTitle(longTitle)
  const description = clampText(opts.description, MAX_DESCRIPTION)
  const url = `${SITE_URL}${opts.path === '/' ? '' : opts.path}`
  const image = absoluteImage(opts.image)
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: fullTitle(longTitle), description, url, siteName: SITE_NAME, type: 'website', locale: 'en_NG',
      images: [{ url: image, width: 1200, height: 630, alt: opts.imageAlt || SITE_NAME }],
    },
    twitter: { card: 'summary_large_image', title: fullTitle(longTitle), description, images: [image] },
  }
}

