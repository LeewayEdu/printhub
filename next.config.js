/** @type {import('next').NextConfig} */

// Content-Security-Policy in REPORT-ONLY mode: violations are logged in the
// browser console but nothing is blocked. Do not switch to enforcing without
// reviewing the reports first. Lists only what the app actually loads:
//   Paystack checkout, Supabase (API + realtime + storage images), Meta Pixel,
//   Google Fonts, Vercel tooling, and the chatbot API (called server-side from
//   /api/chat, listed for completeness).
const csp = [
  "default-src 'self'",
  // Next.js injects inline bootstrap scripts; the Meta Pixel and Paystack load remote scripts.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.paystack.co https://connect.facebook.net https://vercel.live https://*.vercel-scripts.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://res.cloudinary.com https://images.unsplash.com https://*.supabase.co https://*.supabase.in https://storage.googleapis.com https://www.facebook.com https://*.paystack.co",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.supabase.in https://api.paystack.co https://checkout.paystack.com https://www.facebook.com https://connect.facebook.net https://api.groq.com https://vercel.live https://*.vercel-scripts.com",
  "frame-src 'self' https://checkout.paystack.com https://js.paystack.co https://vercel.live",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join('; ')

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
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Content-Security-Policy-Report-Only', value: csp },
        ],
      },
    ]
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