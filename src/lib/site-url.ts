// Canonical site URL for absolute links (JSON-LD, sitemap, robots).
// Hardcoded fallback so a missing/misconfigured env var can never regress
// into a localhost URL in production.
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('localhost')
  ? process.env.NEXT_PUBLIC_SITE_URL
  : 'https://printhub.cchumedia.com'
