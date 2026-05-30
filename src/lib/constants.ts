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
  address: 'Suite 38, Mazfallah Shopping Complex, Karu, AMAC 900110, Abuja FCT, Nigeria',
  hours: 'Monday – Saturday: 8:00AM – 7:00PM',
  stats: {
    years: '13+',
    jobs: '3,000+',
    startingPrice: '₦3,000',
  },
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
export const HOME_SERVICES = [
  { icon: '🎌', name: 'Banners & Large Format', desc: 'Pull-up banners, flex banners, outdoor displays', price: 'From ₦5,000', slug: 'banners' },
  { icon: '🎁', name: 'Branded Souvenirs',      desc: 'Custom pens, mugs, bags, shirts and more', price: 'Get a quote', slug: 'souvenirs' },
  { icon: '📄', name: 'Papers & Stationery',    desc: 'Letterheads, compliment slips, notepads', price: 'From ₦3,000', slug: 'stationery' },
  { icon: '🏷️', name: 'Stickers & Labels',      desc: 'Product labels, SAV stickers, seals', price: 'From ₦4,000', slug: 'stickers' },
  { icon: '🪧', name: 'Signage & Installation', desc: '3D letters, lightboxes, office signs — FCT only', price: 'From ₦80,000', slug: 'signage' },
  { icon: '📚', name: 'Book Publishing',         desc: 'Self-publish your book with ISBN and distribution', price: 'From ₦80,000', slug: 'publishing' },
  { icon: '🗳️', name: 'Campaign Materials',     desc: 'Posters, flex, vests, calendars for elections', price: 'From ₦50,000', slug: 'campaign' },
  { icon: '🎨', name: 'Graphic Design',          desc: 'Logo, flyers, social media, branding kits', price: 'Get a quote', slug: 'design' },
]

// ── STARTER KITS ────────────────────────────
export const STARTER_KITS = [
  {
    id: 'basic',
    name: 'Basic',
    price: 75000,
    tagline: 'You just registered your business. Now look like one.',
    badge: null,
    items: [
      '250 Business Cards (both sides)',
      '1 Complimentary Slip pad (50 leaves)',
      '1 Letterhead design + 20 printed copies',
      '1 Rubber Stamp',
      'Social Media profile setup (2 platforms)',
      'Logo design (if needed)',
    ],
    cta: 'Get Basic Kit',
    color: 'outline',
  },
  {
    id: 'standard',
    name: 'Standard',
    price: 150000,
    tagline: 'Look established from day one.',
    badge: 'Most Popular',
    items: [
      'Everything in Basic',
      '500 Business Cards',
      '1 A5 Notepad (100 leaves, branded)',
      '2 Polo Shirts (branded)',
      '1 Pull-up Banner (standard size)',
      '1 Branded File Folder (50 pcs)',
      'Google Business Profile setup',
      'WhatsApp Business setup',
    ],
    cta: 'Get Standard Kit',
    color: 'red',
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 280000,
    tagline: 'Arrive in every room looking like a million naira.',
    badge: null,
    items: [
      'Everything in Standard',
      '1,000 Business Cards',
      '1 Branded Tote Bag (50 pcs)',
      '1 Branded Pen (100 pcs)',
      '1 Car Sticker (vinyl)',
      '1 Office Door Sign',
      '1 Roll-up Banner',
      'Turnaround: 10–14 working days',
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

// ── DELIVERY OPTIONS ─────────────────────────
export const DELIVERY_OPTIONS = [
  { id: 'pickup',   label: 'Free Pickup',        desc: 'Collect at our Karu, Abuja Office',   price: 0 },
  { id: 'abuja',    label: 'Abuja Delivery',      desc: 'Delivered anywhere in FCT',           price: 2000 },
  { id: 'national', label: 'Nationwide Delivery', desc: 'Shipped anywhere in Nigeria',         price: 5000 },
]

// ── LOYALTY POINTS ───────────────────────────
export const LOYALTY = {
  earnRate: 0.02,       // 2% of order value
  redeemRate: 1,        // 1 point = ₦1
  minRedeem: 500,       // minimum 500 points to redeem
}
