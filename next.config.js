/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'storage.googleapis.com' },
      { protocol: 'https', hostname: '*.supabase.in' },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [360, 480, 640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 3600,
  },
  async redirects() {
    return [
      // Old product listing now lives at /shop. Exact match only: /products/[slug] is untouched.
      { source: '/products', destination: '/shop', permanent: true },
    ]
  },
  experimental: {
    serverActions: { allowedOrigins: ['localhost:3000', 'printhub.cchumedia.com', '*.vercel.app'] },
  },
}

module.exports = nextConfig