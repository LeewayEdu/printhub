import type { Metadata } from 'next'
import HomeClient from './HomeClient'
import { LocalBusinessSchema } from '@/components/seo'
import { getHomeData } from '@/lib/home-data'
import { publishedCaseViews } from '@/lib/case-studies'

// Rebuilt at most every 5 minutes instead of on every request.
export const revalidate = 300

const DESCRIPTION = 'Order professional printing online in Abuja: banners, business cards, branded souvenirs, uniforms and campaign materials. Trusted since 2011.'

export const metadata: Metadata = {
  title: { absolute: 'PrintHub — Professional Printing in Abuja | C-Chu Media' },
  description: DESCRIPTION,
  alternates: { canonical: 'https://printhub.cchumedia.com' },
  openGraph: {
    type: 'website',
    locale: 'en_NG',
    url: 'https://printhub.cchumedia.com',
    siteName: 'PrintHub by C-Chu Media',
    title: 'PrintHub — Professional Printing in Abuja | C-Chu Media',
    description: DESCRIPTION,
    images: [{ url: 'https://printhub.cchumedia.com/og-image.png', width: 1200, height: 630, alt: 'PrintHub by C-Chu Media' }],
  },
}

export default async function Page() {
  const data = await getHomeData()
  // Published case studies only (none today). Display-safe: the consent rules are already applied.
  const recentJobs = publishedCaseViews().map(c => ({ slug: c.slug, title: c.title, summary: c.summary, category: c.category, stats: c.stats, heroSrc: c.hero.src, heroAlt: c.hero.alt }))
  return (
    <>
      <LocalBusinessSchema />
      <HomeClient data={data} recentJobs={recentJobs} />
    </>
  )
}
