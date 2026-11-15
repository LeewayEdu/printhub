// src/app/robots.ts
import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard/', '/auth/', '/cart/', '/api/', '/pro-forma'],
      },
    ],
    sitemap: 'https://printhub.cchumedia.com/sitemap.xml',
    host: 'https://printhub.cchumedia.com',
  }
}