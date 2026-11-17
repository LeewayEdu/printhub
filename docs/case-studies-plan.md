# Case studies: plan

Branch `case-studies`, branched from **`ux-fixes`** (you left "ux-fixes or main" open; `ux-fixes` carries the current design and SEO work, so the new pages match it). No database tables, no database writes, no new migration: all content is static code.

## What I read first
Page layouts (`book-publishing`, `election-campaign`, home), `Footer`, `HomeClient`, `components/seo` (`pageMetadata`, `BreadcrumbSchema`, `Breadcrumbs`, `JsonLd`), `sitemap.ts`, `lib/constants.ts` (`BRAND.whatsapp`), and `/api/leads`.

## Files added
| File | Purpose |
|---|---|
| `public/images/case-studies/<folder>/*.jpg` | the 12 images, file names unchanged |
| `src/lib/case-studies.ts` | typed data from `case-studies.json`, the two flags per case, consent handling, SEO fields. **Server only** (never imported by a `'use client'` file, checked by a test) |
| `src/lib/case-studies-seo.ts` | metadata, Article JSON-LD, sitemap rows (pure functions, tested) |
| `src/lib/case-study-preview.ts` | preview-token check (constant time, env based) |
| `src/lib/lightbox-focus.ts` | the focus-trap arithmetic, unit-tested |
| `src/app/case-studies/page.tsx` | index (published cases only, friendly empty state, `noindex` while none are published) |
| `src/app/case-studies/[slug]/page.tsx` | case page |
| `src/components/case-studies/CaseGallery.tsx` | gallery and accessible lightbox (client) |
| `src/components/case-studies/CaseCta.tsx` | WhatsApp button plus lead record (client) |
| `src/components/case-studies/CaseStudyLinks.tsx` | small client component that shows links only when a case is published |
| `src/app/api/case-studies/links/route.ts` | returns display-safe published cases (so client pages never bundle unpublished copy) |
| `tests/case-studies.test.mjs` | tests |

## Files changed
`src/app/sitemap.ts` (adds case rows only when published AND consented, nothing else touched), `src/app/page.tsx` + `src/app/HomeClient.tsx` ("Recent jobs", published only), `src/app/book-publishing/page.tsx` and `src/app/election-campaign/page.tsx` (one conditional link each), `src/components/layout/Footer.tsx` ("Our work", only when a case is published), `src/app/api/leads/route.ts` (adds `case_study` to the source whitelist; no database change).

## Rules built in
- `published` and `consentGiven` both default to `false` for both cases. Neither case is published by this work.
- `consentGiven: false` → the page shows `clientLine.withoutConsent`, never the client's name, never the book titles in text and never the "Titles" row. For the APC case the neutral title "550 banners and iron frames in five days for a state rally" is used, and the party name in the body copy is replaced with neutral wording (rules are listed in the data file and tested).
- Unpublished slugs return 404 publicly. The owner previews through `?preview=<token>`; the token is an environment variable (`CASE_STUDY_PREVIEW_TOKEN`) that I have not set anywhere. Without it, preview is off. Preview pages are `noindex`, `no-store` and send no referrer.
- Dates: `dateTODO` stays in the data as text and is never rendered. A page shows a date only after `date` is filled in.
- The pull quote is attributed to "C-Chu Media" and styled as an editorial note, never as a client testimonial. No review, rating or testimonial schema anywhere.

## How to switch a case on (also written in the data file)
1. Publish without naming the client: set `published: true`, leave `consentGiven: false`. The neutral wording is used.
2. Publish with the client named: set `published: true` and `consentGiven: true` (only after written consent).
3. Sitemap: a case appears there only when BOTH flags are true.
4. Fill in `date` (month and year) when you have it.

## Assumptions (please read)
1. **AI vendor name.** `CLAUDE.md` says no AI vendor names in user-facing copy. The Ezra copy names "ChatGPT" in the title, the at-a-glance row and one story paragraph. I render "an AI search" and "an AI assistant" instead (rules in the data file). The original text stays in the data. Say if you want the vendor name shown after all.
2. **The slug and image file names contain "apc"** (`apc-grand-rally-branding`, `/images/case-studies/apc-grand-rally/...`). You asked to keep file names, so a no-consent publication still has "apc" in the web address. A neutral slug can be added later with a redirect.
3. **"Nasarawa State"** stays in the APC body copy in neutral mode (it names a place, not the party). The Ezra copy shows "Jalingo, Taraba State" in neutral mode because the supplied `withoutConsent` line says so, although the handover README lists the location as needing consent.
4. **Images** are served by `next/image` (WebP, resized). Gallery thumbnails use one consistent 4:3 crop; the lightbox shows the full image uncropped.
5. **Link blocks** on the service pages and the footer ask `/api/case-studies/links` at runtime, so unpublished copy never reaches the browser bundle. The home page gets its data from the server.
6. **Leads:** a lead needs `product_interest` only, which passes the existing validation. If the lead-capture migration has not been run the endpoint already falls back to the original columns.
