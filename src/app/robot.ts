import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard/', '/checkout/'],
    },
    sitemap: 'https://printhub.cchumedia.com/sitemap.xml',
  }
}