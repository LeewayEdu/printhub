// ============================================
// PRINTHUB — BRAND CONSTANTS & PRODUCT DATA
// ============================================

export const BRAND = {
  name: 'PrintHub',
  tagline: 'Birthing your Imagination...',
  company: 'C-Chu Media Limited',
  since: '2011',
  whatsapp: '2348052929523',
  phone1: '+234 805 292 9523',
  phone2: '+234 806 375 3209',
  email: 'info@cchumedia.com',
  // Street line used everywhere the address appears (footer, schema, contact metadata)
  addressStreet: 'Suite 38, Mazfallah Shopping Complex',
  address: 'Suite 38, Mazfallah Shopping Complex, Karu, AMAC 900110, Abuja FCT, Nigeria',
  hours: 'Monday – Saturday: 8:00AM – 7:00PM',
  // Machine-readable form of `hours` above (used for structured data). Keep in sync.
  hoursSpec: { days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], opens: '08:00', closes: '19:00' },
  social: {
    facebook: 'https://www.facebook.com/cchumedia',
    instagram: 'https://www.instagram.com/cchumedia',
    x: 'https://x.com/cchumedia',
  },
  // Years in business and starting prices are computed (see lib/company.ts and
  // lib/home-data.ts) so they can never go stale.
  stats: {
    jobs: '3,000+',
  },
  // Stable Google Maps link for the Karu office (Maps URL API, address query).
  // Replace with the business's own "Share" link from Google Maps if you have one.
  mapsUrl: 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('Mazfallah Shopping Complex, Karu, Abuja'),
}

export const NAV_LINKS = [
  { label: 'How it works', href: '/how-it-works' },
  { label: 'Shop', href: '/shop' },
  { label: 'Starter Kits', href: '/starter-kits' },
  { label: 'Campaign', href: '/election-campaign' },
  { label: 'Publishing', href: '/book-publishing' },
  { label: 'Earn with us', href: '/affiliate' },
  { label: 'Contact', href: '/contact' },
]

// ── PRODUCT CATEGORIES ──────────────────────
export const CATEGORIES = [
  { id: 'banners',       label: 'Banners & Large Format',   icon: '🎌', slug: 'banners' },
  { id: 'souvenirs',     label: 'Branded Souvenirs',        icon: '🎁', slug: 'souvenirs' },
  { id: 'stationery',    label: 'Papers & Stationery',      icon: '📄', slug: 'stationery' },
  { id: 'stickers',      label: 'Stickers & Labels',        icon: '🏷️', slug: 'stickers' },
  { id: 'signage',       label: 'Signage & Installation',   icon: '🪧', slug: 'signage' },
  { id: 'publishing',    label: 'Book Publishing',          icon: '📚', slug: 'publishing' },
  { id: 'campaign',      label: 'Campaign Materials',       icon: '🗳️', slug: 'campaign' },
  { id: 'design',        label: 'Graphic Design',           icon: '🎨', slug: 'design' },
  { id: 'business-cards',label: 'Business Cards',           icon: '💳', slug: 'business-cards' },
  { id: 'uniforms',      label: 'Shirts & Uniforms',        icon: '👕', slug: 'uniforms' },
  { id: 'frames',        label: 'Frames & Canvas',          icon: '🖼️', slug: 'frames' },
  { id: 'gifts',         label: 'Gift Items',               icon: '🎀', slug: 'gifts' },
  { id: 'vehicle',       label: 'Vehicle Branding',         icon: '🚗', slug: 'vehicle' },
  { id: 'events',        label: 'Event Materials',          icon: '🎪', slug: 'events' },
]

// ── HOMEPAGE SERVICE CARDS ───────────────────
// `priceFrom` is the marketing category whose cheapest active product sets the
// "From ₦…" price on each card (computed in lib/home-data.ts). No category, or no
// priced product in it, means the card shows "Get a quote".
export const HOME_SERVICES = [
  { icon: '🎌', name: 'Banners & Large Format', desc: 'Pull-up banners, flex banners, outdoor displays', priceFrom: 'Banners & Large Format', slug: 'banners' },
  { icon: '🎁', name: 'Branded Souvenirs',      desc: 'Custom pens, mugs, bags, shirts and more', priceFrom: 'Promotional Items & Gifts', slug: 'souvenirs' },
  { icon: '📄', name: 'Papers & Stationery',    desc: 'Letterheads, compliment slips, notepads', priceFrom: 'Office & Business Stationery', slug: 'stationery' },
  { icon: '🏷️', name: 'Stickers & Labels',      desc: 'Product labels, SAV stickers, seals', priceFrom: 'Stickers & Labels', slug: 'stickers' },
  { icon: '🪧', name: 'Signage & Installation', desc: '3D letters, lightboxes, office signs — FCT only', priceFrom: 'Signage & Installation', slug: 'signage' },
  { icon: '📚', name: 'Book Publishing',         desc: 'Self-publish your book with ISBN and distribution', priceFrom: 'Book Publishing', slug: 'publishing' },
  { icon: '🗳️', name: 'Campaign Materials',     desc: 'Posters, flex, vests, calendars for elections', priceFrom: 'Campaign Materials', slug: 'campaign' },
  { icon: '🎨', name: 'Graphic Design',          desc: 'Logo, flyers, social media, branding kits', priceFrom: 'Graphic Design', slug: 'design' },
]

// ── STARTER KITS ────────────────────────────
// Kept in sync with src/app/starter-kits/page.tsx's KITS array — these
// prices and item lists were audited against real component costs
// (rubber stamp, notepad, polo shirts via apparel spec_options, pull-up
// banner via large_format, digital setup fees) rather than guessed.
// If you change one, change the other, or better: import a single
// shared source instead of duplicating this list in two places.
export const STARTER_KITS = [
  {
    id: 'basic',
    name: 'Basic',
    price: 40000,
    tagline: 'You just registered your business. Now look like one.',
    badge: null,
    items: [
      '250 Business Cards (double-sided)',
      '20 Letterheads (A4, printed) + design',
      '1 Rubber Stamp',
      'Logo design (if needed)',
    ],
    cta: 'Get Basic Kit',
    color: 'outline',
  },
  {
    id: 'standard',
    name: 'Standard',
    price: 130000,
    tagline: 'Look established from day one.',
    badge: 'Most Popular',
    items: [
      'Everything in Basic',
      '500 Business Cards (instead of 250)',
      '1 A5 Notepad (100 leaves, branded)',
      '2 Polo Shirts (branded, front logo)',
      '1 Pull-up Banner (2×5ft, with stand)',
      'Google Business Profile setup',
      'WhatsApp Business setup',
    ],
    cta: 'Get Standard Kit',
    color: 'red',
  },
  {
    // ✅ RESOLVED 17 June 2026: pen base cost confirmed at ₦600/pen.
    // 100 fully-branded pens would have pushed real cost to
    // ₦307,076 — above the ₦280,000 price (negative margin).
    // Reduced to 30 pens to restore ~40% target margin at the same
    // price. See matching note in starter-kits/page.tsx.
    id: 'premium',
    name: 'Premium',
    price: 280000,
    tagline: 'Arrive in every room looking like a million naira.',
    badge: null,
    items: [
      'Everything in Standard',
      '1,000 Business Cards (instead of 500)',
      '50 Branded Tote Bags',
      '30 Branded Pens',
      '1 Car Sticker (vinyl, 12×12in)',
      '1 Office Door Sign',
      'Turnaround: message us for timing',
    ],
    cta: 'Get Premium Kit',
    color: 'dark',
  },
]

// ── AFFILIATE TIERS ──────────────────────────
export const AFFILIATE_TIERS = [
  { orders: 'Orders 1–5',          rate: '10%', desc: 'Earn 10% on every order your referred client places — starting strong.' },
  { orders: 'Orders 6–10',         rate: '5%',  desc: 'Your referral keeps ordering — you keep earning. 5% on the next 5 orders.' },
  { orders: 'Order 11 onwards',    rate: '3%',  desc: '3% on every single order they place for life. True passive income.' },
]

// ── CLIENTS ──────────────────────────────────
export const CLIENTS = [
  'EFCC', 'FRSC', 'NAMA', 'Living Faith Church', 'Labour Party',
  'ADC Party', 'Hallmark Insurance', 'CIRA Juice', 'Fairplay Hotel',
  'Whiteball Lounge', 'Glory International School', 'Highgrade International School',
  'Micmac Logistics', 'Selligate', 'SOA Professionals',
  'Nigerian Bulk SMS', "Anaconda's Place", 'Nigerian-Canadian Association',
]

// Delivery fees live in the delivery_settings table (editable in the admin dashboard).

// Bank account shown for bank-transfer payments and on pro-forma invoices
export const BANK_DETAILS = {
  bankName: 'MoniePoint',
  accountNumber: '6727587825',
  accountName: 'C-Chu Media Limited',
}

// How long a pro-forma invoice quote stays valid. ASSUMPTION: not stored anywhere else,
// so this is a placeholder for the owner to confirm. The Terms page only says prices may
// change for future orders.
export const PROFORMA_VALIDITY_DAYS = 7

// Smallest affiliate payout request, as enforced in the affiliate dashboard (₦)
export const AFFILIATE_MIN_PAYOUT = 5000

// ── LOYALTY POINTS ───────────────────────────
export const LOYALTY = {
  earnRate: 0.02,       // 2% of order value
  redeemRate: 1,        // 1 point = ₦1
  minRedeem: 500,       // minimum 500 points to redeem
}