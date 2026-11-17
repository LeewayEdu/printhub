// Run with:  node --import ./scripts/alias-register.mjs --test tests/case-studies.test.mjs
// Case studies: unpublished cases stay hidden everywhere, consent rules, preview access, JSON-LD, lightbox.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { CASE_STUDIES, buildView, publishedCaseViews, allCaseViews } from '../src/lib/case-studies.ts'
import { caseSitemapPaths, articleJsonLd, caseIndexMetadata, caseMetadata } from '../src/lib/case-studies-seo.ts'
import { resolveCase } from '../src/lib/case-study-access.ts'
import { isValidPreview } from '../src/lib/case-study-preview.ts'
import { trapTab, stepIndex } from '../src/lib/lightbox-focus.ts'
import { publicCaseLinks } from '../src/lib/case-study-access.ts'

const TOKEN = 'a-long-random-preview-token-123'
const env = { CASE_STUDY_PREVIEW_TOKEN: TOKEN }
const apc = CASE_STUDIES.find(c => c.slug === 'state-rally-banners')
const ezra = CASE_STUDIES.find(c => c.slug === 'book-printing-600-copies')
const flip = (c, flags) => ({ ...c, ...flags })
const NAMES = /\bAPC\b|Paula|Ezra|Dumpho|Phokh|Wurkun|Anpandi|Nasarawa|Jalingo|Taraba/

// ── both cases ship unpublished and without consent ─────────────────────────────────────────────────
test('both cases are unpublished and have no consent in the data', () => {
  assert.equal(CASE_STUDIES.length, 2)
  for (const c of CASE_STUDIES) { assert.equal(c.published, false, c.slug); assert.equal(c.consentGiven, false, c.slug) }
})

// ── unpublished cases are in no public list ──────────────────────────────────────────────────────────────
test('unpublished cases are not in the sitemap, the index or the links list', () => {
  assert.deepEqual(caseSitemapPaths(CASE_STUDIES), [])
  assert.equal(publishedCaseViews().length, 0)
  assert.deepEqual(publicCaseLinks(), [])
  assert.deepEqual(publicCaseLinks([flip(ezra, { published: true })]).map(c => c.slug), ['book-printing-600-copies'])
  assert.match(readFileSync(new URL('../src/app/api/case-studies/links/route.ts', import.meta.url), 'utf8'), /publicCaseLinks\(\)/)
  assert.equal(caseIndexMetadata(false).robots.index, false, 'index is noindex while nothing is published')
  assert.equal(caseIndexMetadata(true).robots, undefined)
})
test('the sitemap lists a case only when it is published AND consented', () => {
  assert.deepEqual(caseSitemapPaths([flip(apc, { published: true })]), [])
  assert.deepEqual(caseSitemapPaths([flip(apc, { consentGiven: true })]), [])
  assert.deepEqual(caseSitemapPaths([flip(apc, { published: true, consentGiven: true }), ezra]), ['/case-studies', '/case-studies/state-rally-banners'])
})

// ── public routes and preview ──────────────────────────────────────────────────────────────────────────────
test('public routes: unpublished slugs are a 404, unknown slugs are a 404', () => {
  assert.equal(resolveCase('state-rally-banners', undefined, env), null)
  assert.equal(resolveCase('book-printing-600-copies', 'wrong', env), null)
  assert.equal(resolveCase('nope', TOKEN, env), null)
})
test('preview: a valid token shows an unpublished case, flagged as preview', () => {
  const r = resolveCase('state-rally-banners', TOKEN, env)
  assert.equal(r.preview, true); assert.equal(r.v.slug, 'state-rally-banners')
})
test('preview is off when the token is missing or too short, and it is compared safely', () => {
  assert.equal(isValidPreview(TOKEN, {}), false)
  assert.equal(isValidPreview('short', { CASE_STUDY_PREVIEW_TOKEN: 'short' }), false)
  assert.equal(isValidPreview(TOKEN + 'x', env), false)
  assert.equal(isValidPreview(undefined, env), false)
  assert.equal(isValidPreview([TOKEN], env), true)
  assert.equal(resolveCase('book-printing-600-copies', TOKEN, {}), null)
})
test('a published case is public with no token, and is not a preview', () => {
  const r = resolveCase('book-printing-600-copies', undefined, {}, [flip(ezra, { published: true })])
  assert.equal(r.preview, false)
})
test('the preview token is never in the code or in any response data', () => {
  const walk = d => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p] })
  const files = walk(new URL('../src', import.meta.url).pathname).filter(f => /\.(ts|tsx)$/.test(f))
  for (const f of files) assert.ok(!/CASE_STUDY_PREVIEW_TOKEN\s*=\s*['"`]/.test(readFileSync(f, 'utf8')), `${f} hardcodes the token`)
  const meta = caseMetadata(buildView(apc), { preview: true })
  assert.equal(meta.robots.index, false)
})

// ── consent ─────────────────────────────────────────────────────────────────────────────────────────────────────
test('without consent: no client name, no book titles, no Titles row, no party name, anywhere in the displayed copy', () => {
  for (const v of allCaseViews()) {
    const text = JSON.stringify(v)
    assert.ok(!NAMES.test(text), `${v.slug}: ${text.match(NAMES)}`)
    assert.ok(!v.atAGlance.some(r => r.label === 'Titles'))
  }
  const a = buildView(apc), e = buildView(ezra)
  assert.equal(a.title, '550 banners and iron frames in five days for a state rally')
  assert.equal(a.clientLine, "Coordinated through the party's South-South coordination office.")
  assert.equal(e.clientLine, 'A client in another state.')
  assert.ok(/state rally/.test(a.cta.whatsappMessage))
})
test('with consent: the named wording and the Titles row are used', () => {
  const a = buildView(flip(apc, { consentGiven: true })), e = buildView(flip(ezra, { consentGiven: true }))
  assert.match(a.title, /APC Grand Rally/); assert.match(a.clientLine, /Dr\. Paula/)
  assert.ok(e.atAGlance.some(r => r.label === 'Titles' && /Dumpho/.test(r.value)))
  assert.equal(e.clientLine, 'Mr. Ezra, Jalingo, Taraba State.')
  assert.match(JSON.stringify(a), /Nasarawa State/); assert.match(JSON.stringify(e), /Jalingo, Taraba State/)
})
test('without consent no place name appears in copy, rows, client line, SEO text, metadata or alt text; with consent it does', () => {
  const PLACES = /Nasarawa|Jalingo|Taraba/
  for (const c of [apc, ezra]) {
    const v = buildView(c)
    assert.ok(!PLACES.test(JSON.stringify(v)), `${c.slug}: ${JSON.stringify(v).match(PLACES)}`)
    assert.ok(!PLACES.test(JSON.stringify(caseMetadata(v))) && !PLACES.test(JSON.stringify(articleJsonLd(v))))
    assert.ok(v.images.every(i => !PLACES.test(i.alt + i.caption)))
  }
  assert.equal(buildView(apc).atAGlance[0].value, 'Branding for a state rally')
  assert.equal(buildView(ezra).atAGlance[0].value, 'Another state in Nigeria')
  assert.equal(buildView(ezra).seo.title, 'Case study: 600 books for a client in another state | C-Chu Media')
  assert.ok(PLACES.test(JSON.stringify(buildView(flip(ezra, { consentGiven: true })).seo)))
})
test('slugs and image paths are neutral', () => {
  assert.deepEqual(CASE_STUDIES.map(c => c.slug), ['state-rally-banners', 'book-printing-600-copies'])
  for (const c of CASE_STUDIES) for (const i of c.images) assert.ok(!/apc|ezra/i.test(i.src), i.src)
})
test('no AI vendor name appears in the displayed copy (site rule)', () => {
  for (const consent of [false, true]) for (const c of CASE_STUDIES) assert.ok(!/ChatGPT|OpenAI/i.test(JSON.stringify(buildView(flip(c, { consentGiven: consent })))))
  assert.equal(buildView(ezra).title, 'From an AI search to 600 printed books')
})
test('dates: TODO text is never shown, and a date shows only once filled in', () => {
  for (const v of allCaseViews()) { assert.equal(v.date, null); assert.ok(!/TODO/i.test(JSON.stringify(v))) }
  assert.equal(buildView(flip(apc, { date: 'March 2026' })).date, 'March 2026')
  assert.equal(buildView(flip(apc, { date: 'TODO: month' })).date, null)
})
test('the pull quote is attributed to C-Chu Media only, and only the book case has one', () => {
  assert.equal(buildView(ezra).pullQuote.attribution, 'C-Chu Media')
  assert.equal(buildView(apc).pullQuote, null)
  assert.ok(buildView(apc).disclaimer && /does not imply endorsement/.test(buildView(apc).disclaimer))
})
test('the stats, figures and image alt text come straight from the data', () => {
  const v = buildView(apc)
  assert.deepEqual(v.stats.map(s => s.value), ['20', '530', '5 days'])
  assert.ok(v.images.every(i => i.alt.length > 10 && i.caption))
  assert.equal(v.images.filter(i => i.role === 'hero').length, 1)
})

// ── structured data ─────────────────────────────────────────────────────────────────────────────────────────────
test('Article JSON-LD parses, is an Article, and has no rating, review or testimonial fields', () => {
  for (const c of CASE_STUDIES) {
    const parsed = JSON.parse(JSON.stringify(articleJsonLd(buildView(c))))
    assert.equal(parsed['@type'], 'Article')
    assert.ok(parsed.headline && parsed.image[0].startsWith('https://'))
    assert.ok(!/rating|review|testimonial|aggregate/i.test(JSON.stringify(parsed)), 'no rating or review schema')
    assert.equal(parsed.datePublished, undefined, 'no date until it is filled in')
  }
  assert.equal(articleJsonLd(buildView(flip(apc, { date: '2026-03' }))).datePublished, '2026-03')
  assert.equal(articleJsonLd(buildView(flip(apc, { date: 'March 2026' }))).datePublished, undefined, 'free text is not turned into a schema date')
})
test('metadata comes from the data, with the hero as the social image and a canonical URL', () => {
  const m = caseMetadata(buildView(ezra))
  assert.equal(m.title.absolute, 'Case study: 600 books for a client in another state | C-Chu Media')
  assert.match(m.alternates.canonical, /\/case-studies\/book-printing-600-copies$/)
  assert.match(m.openGraph.images[0].url, /volume-1-cover-on-desk\.jpg$/); assert.match(m.twitter.images[0], /volume-1-cover-on-desk\.jpg$/)
  assert.equal(m.robots, undefined)
})

// ── nothing unpublished can reach a browser bundle ────────────────────────────────────────────────────────────────
test('no client component imports the full case-study data module', () => {
  const walk = d => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p] })
  const files = walk(new URL('../src', import.meta.url).pathname).filter(f => /\.(ts|tsx)$/.test(f))
  for (const f of files) {
    const t = readFileSync(f, 'utf8')
    if (/^['"]use client['"]/.test(t.trim())) assert.ok(!/@\/lib\/case-studies['"]|@\/lib\/case-study-access['"]/.test(t), `${f} is a client file importing case data`)
  }
})

// ── lightbox ──────────────────────────────────────────────────────────────────────────────────────────────────────
test('lightbox focus arithmetic: Tab and Shift+Tab wrap inside the dialog; pictures wrap at both ends', () => {
  assert.equal(trapTab(0, 3, false), 1); assert.equal(trapTab(2, 3, false), 0)
  assert.equal(trapTab(0, 3, true), 2); assert.equal(trapTab(-1, 3, true), 2); assert.equal(trapTab(-1, 3, false), 0)
  assert.equal(stepIndex(4, 5, 1), 0); assert.equal(stepIndex(0, 5, -1), 4)
})
test('lightbox is keyboard accessible: dialog role, Esc, arrows, Tab trap, focus return, labelled controls, alt text', () => {
  const src = readFileSync(new URL('../src/components/case-studies/CaseGallery.tsx', import.meta.url), 'utf8')
  for (const needle of [/role="dialog"/, /aria-modal="true"/, /e\.key === 'Escape'/, /ArrowRight/, /ArrowLeft/, /e\.key === 'Tab'/, /trapTab\(/, /opener\.current\?\.focus\(\)/, /data-autofocus/, /aria-label="Close gallery"/, /aria-label="Previous photo"/, /aria-label="Next photo"/, /alt=\{img\.alt\}/, /alt=\{current\.alt\}/, /aria-live="polite"/, /objectFit: 'contain'/]) {
    assert.match(src, needle, String(needle))
  }
  assert.ok(!/objectFit: 'cover'[^}]*\}\s*\/>\s*<\/div>\s*\{images\.length > 1/.test(src), 'the lightbox picture is never cropped')
})

// ── lead tracking ──────────────────────────────────────────────────────────────────────────────────────────────────────
test('the WhatsApp tap records a case_study lead without blocking the link', () => {
  const cta = readFileSync(new URL('../src/components/case-studies/CaseCta.tsx', import.meta.url), 'utf8')
  assert.match(cta, /source: 'case_study'/); assert.match(cta, /product_interest: slug/); assert.match(cta, /keepalive: true/)
  assert.ok(!/preventDefault/.test(cta), 'the link must never be blocked')
  assert.match(cta, /\.catch\(\(\) => \{\}\)/)
  const leads = readFileSync(new URL('../src/app/api/leads/route.ts', import.meta.url), 'utf8')
  assert.match(leads, /'case_study'/)
})
