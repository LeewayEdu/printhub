import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'PrintHub by C-Chu Media',
    short_name: 'PrintHub',
    description: 'Order professional printing online in Abuja, Nigeria.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#C0392B',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/favicon.png', sizes: '150x150', type: 'image/png' },
    ],
  }
}
