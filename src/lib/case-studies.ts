// Case studies: static content, no database. Copy is transcribed from the handover pack's
// case-studies.json and must not be extended with claims that are not in it.
//
// SERVER ONLY. Do not import this file from a 'use client' file: it holds the copy of cases that are not
// published yet (including client names). Client components receive display-safe props from server code,
// or call /api/case-studies/links. A test enforces this.
//
// HOW TO SWITCH A CASE ON
//   * Publish WITHOUT naming the client: set `published: true`, leave `consentGiven: false`.
//     The neutral wording is used (neutral title, clientLine.withoutConsent, no book titles, party name and place names replaced).
//   * Publish WITH the client named: set `published: true` AND `consentGiven: true`, only after written consent.
//   * The sitemap lists a case only when BOTH flags are true.
//   * Fill in `date` (for example "March 2026") when you have it. `dateTODO` is never shown on the site.
//   * DECISION 2026-11-21 (owner, Silas): both cases are published, with first names only (no surnames, no company names) and no
//     photo that shows a face. See the comment on each case below.
//   * Preview of an unpublished case: /case-studies/<slug>?preview=<token>, where the token is the value of the
//     CASE_STUDY_PREVIEW_TOKEN environment variable (set it in Vercel; it is not stored in code).

export interface CaseImage {
  file: string            // path as given in the handover pack
  src: string             // public URL
  alt: string
  caption: string
  role?: 'hero'
  width: number
  height: number
}

export interface CaseStudy {
  slug: string
  category: string
  title: string
  /** Used instead of `title` while consentGiven is false (only where the title names the client) */
  neutralTitle?: string
  summary: string
  /** Fill in when known, for example "March 2026". Until then nothing date-like is shown. */
  date: string | null
  dateTODO: string
  stats: { value: string; label: string }[]
  atAGlance: { label: string; value: string }[]
  clientLine: { withoutConsent: string; withConsent: string }
  sections: { heading: string; body: string }[]
  pullQuote?: { text: string; attribution: string }
  demonstrates: string[]
  disclaimer?: string
  cta: { label: string; whatsappMessage: string }
  /** Where the secondary button goes (our own wording, not from the pack) */
  serviceLink: { href: string; label: string }
  images: CaseImage[]
  seo: { title: string; description: string }
  published: boolean
  consentGiven: boolean
  /** Word-for-word swaps used while consentGiven is false, so no party or person is named. Longest first. */
  noConsentReplacements: [string, string][]
  /** When true the neutral title and the replacements above are used even though consentGiven is true (names the client by first name only, keeps the party and places neutral). */
  keepNeutral?: boolean
}

// Site rule: no AI vendor names in user-facing copy (from the project rules file). Applied to every case, consent or not.
export const VENDOR_NEUTRAL: [string, string][] = [
  ['a ChatGPT search', 'an AI search'],
  ['through ChatGPT', 'through an AI assistant'],
  ['ChatGPT', 'An AI assistant'],
]

const img = (folder: string, file: string, width: number, height: number, alt: string, caption: string, role?: 'hero'): CaseImage => ({
  file: `images/${folder}/${file}`, src: `/images/case-studies/${folder}/${file}`, alt, caption, width, height, ...(role ? { role } : {}),
})

export const CASE_STUDIES: CaseStudy[] = [
  {
    slug: 'state-rally-banners',
    category: 'Campaign & large-format branding',
    title: '550 banners and iron frames in five days: branding Nasarawa State for the APC Grand Rally',
    neutralTitle: '550 banners and iron frames in five days for a state rally',
    summary: 'C-Chu Media printed 20 large banners (10 × 20 ft) and 530 smaller banners (4 × 6 ft), and fabricated the iron frames to carry them, in a five-day window.',
    date: null,
    dateTODO: 'TODO: month and year the job was delivered',
    stats: [
      { value: '20', label: 'Banners, 10 × 20 ft' },
      { value: '530', label: 'Banners, 4 × 6 ft' },
      { value: '5 days', label: 'Production and delivery' },
    ],
    atAGlance: [
      { label: 'Project', value: 'Branding for Nasarawa State for the APC Grand Rally' },
      { label: 'Large banners', value: '20 banners, each 10 × 20 ft' },
      { label: 'Smaller banners', value: '530 banners, each 4 × 6 ft' },
      { label: 'Fabrication', value: 'Welded iron frames for the 4 × 6 ft banners and an iron structure for one 10 × 20 ft banner' },
      { label: 'Timeline', value: 'Five days, including production and delivery' },
    ],
    clientLine: {
      withoutConsent: "Coordinated through the party's South-South coordination office.",
      withConsent: 'Coordinated through Paula at a party regional coordination office.',
    },
    sections: [
      { heading: 'The brief', body: 'C-Chu Media was contracted to handle branding for Nasarawa State ahead of the APC Grand Rally. The assignment was substantial: 20 large banners measuring 10 × 20 feet and 530 banners measuring 4 × 6 feet.' },
      { heading: 'Print and fabrication together', body: 'Beyond printing, the job needed welding and iron-frame fabrication for the 4 × 6 ft banners, plus an iron structure for one 10 × 20 ft banner. The work combined large-format print production with practical metalwork.' },
      { heading: 'The challenge', body: 'Hundreds of banners and metal frames had to be produced and delivered within five days. That meant coordinating printing, fabrication and the delivery schedule at the same time, with the team putting in long hours to keep the job on track.' },
      { heading: 'The outcome', body: 'C-Chu Media completed the assignment and delivered the branding materials within the five days.' },
    ],
    demonstrates: [
      'Large-scale production: 550 banners across two sizes',
      'Print and fabrication under one roof: banner production with welded iron supports',
      'Working to a tight deadline: a high-volume job in five days',
    ],
    disclaimer: 'C-Chu Media prints for clients across the political spectrum. Featuring a project here does not imply endorsement.',
    cta: {
      label: 'Planning an event, rally or campaign? Tell us your quantities and date.',
      whatsappMessage: 'Hi, I saw your APC Grand Rally banner case study and I want a quote for large-format banners.',
    },
    serviceLink: { href: '/election-campaign', label: 'See campaign printing' },
    images: [],   // see the decision comment below: no photo of this job is free of faces
    seo: {
      title: 'Case study: 550 rally banners and iron frames in five days | C-Chu Media',
      description: 'How C-Chu Media printed 20 banners at 10 × 20 ft and 530 at 4 × 6 ft, with welded iron frames, in five days. Large-format printing in Abuja, Nigeria.',
    },
    // Owner decision 2026-11-21: published. The client is named by first name only ("Paula") and the party, the state and the rally
    // name stay neutral (keepNeutral). No photos: every photo of this job shows printed portraits of public figures or workers' faces,
    // so none is used (rule: no photo with a visible face). Add face-free photos to `images` when available.
    published: true,
    consentGiven: true,
    keepNeutral: true,
    noConsentReplacements: [
      ['Nasarawa State ahead of the APC Grand Rally', 'a state rally'],
      ['Nasarawa State for the APC Grand Rally', 'a state rally'],
      ['the APC Grand Rally', 'a state rally'],
      ['APC Grand Rally', 'state rally'],
      ['Nasarawa State', 'a state'],
    ],
  },
  {
    slug: 'book-printing-600-copies',
    category: 'Book printing',
    title: 'From a ChatGPT search to 600 printed books',
    summary: 'A client in Jalingo, Taraba State, found C-Chu Media online and commissioned two book titles of about 257 pages each, with 300 copies of each.',
    date: null,
    dateTODO: 'TODO: month and year the job was delivered',
    stats: [
      { value: '2', label: 'Book titles' },
      { value: '600', label: 'Total copies' },
      { value: '≈257', label: 'Pages per book' },
    ],
    atAGlance: [
      { label: 'Client location', value: 'Jalingo, Taraba State, Nigeria' },
      { label: 'How the client found us', value: 'ChatGPT' },
      { label: 'Titles', value: 'Dumpho Phokh Wurkun Anpandi Shin 1 and Dumpho Phokh Wurkun Anpandi Shin 2' },
      { label: 'Quantity', value: '300 copies per title, 600 combined' },
    ],
    clientLine: {
      withoutConsent: 'A client in Jalingo, Taraba State.',
      withConsent: 'Ezra, Jalingo, Taraba State.',
    },
    sections: [
      { heading: 'The story', body: 'The client, based in Jalingo, Taraba State, discovered C-Chu Media through ChatGPT. We had never met in person, yet he reached out and trusted us with a substantial book-printing assignment: two titles, 300 copies of each.' },
      { heading: 'The books', body: 'Each title runs to about 257 pages. The covers use distinct colour treatments, orange for Volume 1 and deep navy blue for Volume 2, while keeping a related visual identity and a classroom scene.' },
      { heading: 'Distance and trust', body: 'The engagement happened remotely, with the client in another state. A project of this size called for clear communication and confidence in the printer.' },
    ],
    // C-Chu Media's own line, NOT a quote from the client. Never attribute it to the client.
    pullQuote: {
      text: 'A client can discover you online, trust your service, and give you an opportunity without ever meeting you in person.',
      attribution: 'C-Chu Media',
    },
    demonstrates: [
      'Reach beyond location: a client in another state, served remotely',
      'Capacity for volume: 600 copies across two titles',
      'Consistent series design: two covers, one visual identity',
    ],
    cta: {
      label: 'Printing a book, or a series? Tell us the page count and copies.',
      whatsappMessage: 'Hi, I saw your book printing case study and I want a quote for printing my book.',
    },
    serviceLink: { href: '/book-publishing', label: 'See book publishing and printing' },
    images: [
      img('book-printing-600-copies', 'volume-1-cover-on-desk.jpg', 1010, 1079, 'Volume 1 book with an orange cover showing a classroom scene, standing on a wooden desk beside a plant', 'Volume 1: orange cover', 'hero'),
      img('book-printing-600-copies', 'volume-2-cover-on-desk.jpg', 1080, 1080, 'Volume 2 book with a deep navy blue cover showing the same classroom scene, standing on a desk', 'Volume 2: deep navy cover'),
      img('book-printing-600-copies', 'volume-1-copies-boxed.jpg', 1280, 720, 'Stacks of orange-covered Volume 1 copies packed in a carton', 'Volume 1 copies packed for delivery'),
      img('book-printing-600-copies', 'volume-2-copies-boxed.jpg', 1280, 720, 'Stacks of navy-covered Volume 2 copies packed in a carton', 'Volume 2 copies packed for delivery'),
      img('book-printing-600-copies', 'volume-1-cover-in-hand.jpg', 720, 1280, 'A hand holding up a finished copy of Volume 1', 'A finished Volume 1'),
      img('book-printing-600-copies', 'volume-2-cover-in-hand.jpg', 720, 1280, 'A hand holding up a finished copy of Volume 2', 'A finished Volume 2'),
    ],
    seo: {
      title: 'Case study: 600 books for a client in Taraba State | C-Chu Media',
      description: 'How a client in Jalingo found C-Chu Media online and ordered 600 printed books across two titles. Book printing in Abuja, Nigeria.',
    },
    // Owner decision 2026-11-21: published, client named by first name only ("Ezra"). Photos: the spine photo is not used because the
    // printed spine shows the author's surname. The covers show illustrated pupils and a teacher (the book's artwork, not people
    // we photographed); they are kept because they are the product.
    published: true,
    consentGiven: true,
    noConsentReplacements: [
      ['Jalingo, Taraba State, Nigeria', 'Another state in Nigeria'],
      ['in Jalingo, Taraba State', 'in another state'],
      ['in Taraba State', 'in another state'],
      ['in Jalingo', 'in another state'],
      ['Jalingo, Taraba State', 'another state'],
    ],
  },
]

// ── display-safe view ────────────────────────────────────────────────────────────────────────────────────────
export interface CaseView {
  slug: string
  category: string
  title: string
  summary: string
  date: string | null
  stats: CaseStudy['stats']
  atAGlance: CaseStudy['atAGlance']
  clientLine: string
  sections: CaseStudy['sections']
  pullQuote: CaseStudy['pullQuote'] | null
  demonstrates: string[]
  disclaimer: string | null
  cta: CaseStudy['cta']
  serviceLink: CaseStudy['serviceLink']
  images: CaseImage[]
  /** null when a case has no public photo */
  hero: CaseImage | null
  seo: CaseStudy['seo']
  published: boolean
  consentGiven: boolean
}

/** The only way page code reads a case: consent and vendor-neutral wording are applied here, once. */
export function buildView(c: CaseStudy): CaseView {
  const neutral = !c.consentGiven || !!c.keepNeutral
  const swap = (text: string) => {
    let t = text
    if (neutral) for (const [from, to] of c.noConsentReplacements) t = t.split(from).join(to)
    for (const [from, to] of VENDOR_NEUTRAL) t = t.split(from).join(to)
    return t.trim()
  }
  const rows = c.atAGlance
    .filter(r => c.consentGiven || r.label !== 'Titles')          // the Titles row never shows without consent
    .map(r => ({ label: r.label, value: swap(r.value) }))
  const hero = c.images.find(i => i.role === 'hero') || c.images[0] || null
  return {
    slug: c.slug, category: c.category,
    title: swap(neutral && c.neutralTitle ? c.neutralTitle : c.title),
    summary: swap(c.summary),
    date: c.date && !/TODO/i.test(c.date) ? c.date : null,          // a date shows only once it has been filled in
    stats: c.stats, atAGlance: rows,
    clientLine: c.consentGiven ? c.clientLine.withConsent : swap(c.clientLine.withoutConsent),
    sections: c.sections.map(s => ({ heading: swap(s.heading), body: swap(s.body) })),
    pullQuote: c.pullQuote ? { text: c.pullQuote.text, attribution: 'C-Chu Media' } : null,
    demonstrates: c.demonstrates.map(swap),
    disclaimer: c.disclaimer ? swap(c.disclaimer) : null,
    cta: { label: swap(c.cta.label), whatsappMessage: swap(c.cta.whatsappMessage) },
    serviceLink: c.serviceLink, images: c.images, hero,
    seo: { title: swap(c.seo.title), description: swap(c.seo.description) },
    published: c.published, consentGiven: c.consentGiven,
  }
}

export const allCaseViews = (): CaseView[] => CASE_STUDIES.map(buildView)
/** What the public may see: published cases only */
export const publishedCaseViews = (): CaseView[] => CASE_STUDIES.filter(c => c.published).map(buildView)
export const findCaseView = (slug: string): CaseView | null => {
  const c = CASE_STUDIES.find(x => x.slug === slug)
  return c ? buildView(c) : null
}
