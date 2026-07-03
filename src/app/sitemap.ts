// src/app/sitemap.ts
// Auto-generated XML sitemap — Next.js calls this at build time
// (or on-demand with ISR) and serves it at /sitemap.xml.
// Google Search Console: submit https://printhub.cchumedia.com/sitemap.xml

import { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'

const SITE_URL = 'https://printhub.cchumedia.com'

// Use the service role key for sitemap generation (server-side, never
// exposed to the browser) — bypasses RLS to ensure all active pages
// are included even if their RLS policies restrict public reads.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  // Static pages — always included
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL,                          lastModified: now, changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${SITE_URL}/shop`,                lastModified: now, changeFrequency: 'daily',   priority: 0.9 },
    { url: `${SITE_URL}/products`,            lastModified: now, changeFrequency: 'daily',   priority: 0.9 },
    { url: `${SITE_URL}/starter-kits`,        lastModified: now, changeFrequency: 'weekly',  priority: 0.8 },
    { url: `${SITE_URL}/election-campaign`,   lastModified: now, changeFrequency: 'weekly',  priority: 0.8 },
    { url: `${SITE_URL}/book-publishing`,     lastModified: now, changeFrequency: 'weekly',  priority: 0.8 },
    { url: `${SITE_URL}/industries`,          lastModified: now, changeFrequency: 'weekly',  priority: 0.7 },
    { url: `${SITE_URL}/categories`,          lastModified: now, changeFrequency: 'weekly',  priority: 0.7 },
    { url: `${SITE_URL}/blog`,                lastModified: now, changeFrequency: 'daily',   priority: 0.7 },
    { url: `${SITE_URL}/contact`,             lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/terms`,               lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${SITE_URL}/privacy`,             lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
  ]

  // Products
  const { data: products } = await supabase
    .from('products')
    .select('slug, updated_at')
    .eq('is_active', true)
    .not('slug', 'is', null)

  const productPages: MetadataRoute.Sitemap = (products || []).map(p => ({
    url: `${SITE_URL}/products/${p.slug}`,
    lastModified: new Date(p.updated_at || now),
    changeFrequency: 'weekly' as const,
    priority: 0.85,
  }))

  // Categories
  const { data: categories } = await supabase
    .from('categories')
    .select('slug, updated_at')
    .eq('is_active', true)
    .not('slug', 'is', null)

  const categoryPages: MetadataRoute.Sitemap = (categories || []).map(c => ({
    url: `${SITE_URL}/categories/${c.slug}`,
    lastModified: new Date(c.updated_at || now),
    changeFrequency: 'weekly' as const,
    priority: 0.75,
  }))

  // Industries
  const { data: industries } = await supabase
    .from('industries')
    .select('slug, updated_at')
    .eq('is_active', true)

  const industryPages: MetadataRoute.Sitemap = (industries || []).map(i => ({
    url: `${SITE_URL}/industries/${i.slug}`,
    lastModified: new Date(i.updated_at || now),
    changeFrequency: 'weekly' as const,
    priority: 0.75,
  }))

  // Campaigns (lead gen pages)
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('slug, updated_at')
    .eq('is_active', true)

  const campaignPages: MetadataRoute.Sitemap = (campaigns || []).map(c => ({
    url: `${SITE_URL}/campaigns/${c.slug}`,
    lastModified: new Date(c.updated_at || now),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  // Blog posts
  const { data: blogPosts } = await supabase
    .from('blog_posts')
    .select('slug, published_at, updated_at')
    .eq('is_published', true)

  const blogPages: MetadataRoute.Sitemap = (blogPosts || []).map(b => ({
    url: `${SITE_URL}/blog/${b.slug}`,
    lastModified: new Date(b.updated_at || b.published_at || now),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  // Guides
  const { data: guides } = await supabase
    .from('guides')
    .select('slug, published_at, updated_at')
    .eq('is_published', true)

  const guidePages: MetadataRoute.Sitemap = (guides || []).map(g => ({
    url: `${SITE_URL}/guides/${g.slug}`,
    lastModified: new Date(g.updated_at || g.published_at || now),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  return [
    ...staticPages,
    ...productPages,
    ...categoryPages,
    ...industryPages,
    ...campaignPages,
    ...blogPages,
    ...guidePages,
  ]
}