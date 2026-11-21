import type { Metadata } from 'next'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { pageMetadata } from '@/components/seo'
import { BRAND } from '@/lib/constants'
import { naira, calcPrint, editorialCost } from '@/lib/price-list-calc'
import {
  EFFECTIVE, ISBN_LEGAL_DEPOSIT, EDITORIAL, EDITORIAL_EXAMPLE_WORDS, DESIGN_TYPESETTING, LISTING_PACKAGES, LISTING_ISBN_NOTE,
  MONTHLY_MANAGEMENT, LISTING_ADDONS, LISTING_BUNDLE, LISTING_NOTES, packageFeatures, SIZES, PAPERS, PAGE_RATES, BINDING_PER_COPY,
  BINDING_DESCRIPTION, BULK_TIERS, FORMULA, TERMS, WORKED_EXAMPLES, WHATSAPP_MESSAGE, COLOUR_MODES,
} from '@/lib/price-list'
import PrintCalculator from './PrintCalculator'
import PrintButton from './PrintButton'
import './price-list.css'

export const metadata: Metadata = pageMetadata({
  title: 'Price List: Book Publishing & Printing',
  description: `Publication price list, effective ${EFFECTIVE.label}: ISBN, editing, typesetting, online book listing packages and book printing rates, with a print estimate calculator. Prices in naira.`,
  path: '/price-list',
})

// Display form of the configured number (digits come from BRAND.whatsapp; no number is typed in this file)
const whatsappDisplay = BRAND.whatsapp.replace(/^(\d{3})(\d{3})(\d{3})(\d{4})$/, '+$1 $2 $3 $4')
const whatsappHref = `https://wa.me/${BRAND.whatsapp}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`

export default function PriceListPage() {
  const edit = editorialCost(EDITORIAL_EXAMPLE_WORDS)!
  const examples = WORKED_EXAMPLES.map(e => ({ ...e, r: calcPrint(e) })).filter(x => x.r.ok) as (typeof WORKED_EXAMPLES[number] & { r: Extract<ReturnType<typeof calcPrint>, { ok: true }> })[]

  return (
    <>
      <Navbar />
      <main id="main-content" className="pl-root">
        <section className="pl-hero">
          <div className="pl-wrap">
            <span className="badge badge-red">Price List</span>
            <h1>Book publishing &amp; printing prices</h1>
            <p>Effective {EFFECTIVE.label}. All prices are in Nigerian naira (₦). A quotation confirms the final price and turnaround.</p>
            <div className="pl-hero-actions">
              <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="btn btn-primary">Ask us on WhatsApp</a>
              <PrintButton />
            </div>
          </div>
        </section>

        <div className="pl-wrap">
          {/* ── Publishing services ── */}
          <section className="pl-section" aria-labelledby="pl-publishing">
            <h2 className="pl-h2" id="pl-publishing">Publishing services</h2>
            <div className="pl-rule" />

            <div className="pl-grid-2">
              <div className="pl-card">
                <h3 className="pl-h3">{ISBN_LEGAL_DEPOSIT.name}</h3>
                <div className="pl-price pl-price-big">{naira(ISBN_LEGAL_DEPOSIT.price)} <span className="pl-small" style={{ fontWeight: 400 }}>{ISBN_LEGAL_DEPOSIT.unit}</span></div>
                <ul className="pl-list pl-inline" style={{ marginTop: 8 }}>
                  {ISBN_LEGAL_DEPOSIT.includes.map(t => <li key={t}>{t}</li>)}
                </ul>
              </div>

              <div className="pl-card">
                <h3 className="pl-h3">Editorial (per word)</h3>
                <table className="pl-table">
                  <thead><tr><th>Service</th><th className="num">Rate</th><th className="num">{EDITORIAL_EXAMPLE_WORDS.toLocaleString('en-US')} words</th></tr></thead>
                  <tbody>
                    {EDITORIAL.map(e => (
                      <tr key={e.key}><td>{e.name}</td><td className="num">{naira(e.perWord)}</td><td className="num">{naira(edit[e.key])}</td></tr>
                    ))}
                  </tbody>
                </table>
                <p className="pl-note">Example: a {EDITORIAL_EXAMPLE_WORDS.toLocaleString('en-US')}-word manuscript.</p>
              </div>
            </div>

            <div className="pl-card">
              <h3 className="pl-h3">Design &amp; typesetting</h3>
              <table className="pl-table">
                <tbody>
                  {DESIGN_TYPESETTING.interior.map(i => (
                    <tr key={i.size}><td>Interior typesetting, {i.size}</td><td className="num">{naira(i.perPage)} per page</td></tr>
                  ))}
                  <tr><td>Interior typesetting minimum</td><td className="num">{naira(DESIGN_TYPESETTING.interiorMinimum)}</td></tr>
                  <tr><td>{DESIGN_TYPESETTING.ebook.name}</td><td className="num">{naira(DESIGN_TYPESETTING.ebook.price)}</td></tr>
                  {DESIGN_TYPESETTING.covers.map(c => (
                    <tr key={c.name}><td>{c.name}{c.note ? <span className="pl-small"> ({c.note})</span> : null}</td><td className="num">{naira(c.price)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3 className="pl-h3" style={{ marginTop: 26 }}>Online book listing packages</h3>
            <p className="pl-lead">{LISTING_ISBN_NOTE}</p>
            <div className="pl-grid-3">
              {LISTING_PACKAGES.map(p => (
                <div key={p.key} className={`pl-card pl-pkg${p.key === 'standard' ? ' pl-pkg-featured' : ''}`}>
                  <div className="pl-pkg-name">{p.name}</div>
                  <div className="pl-price">{naira(p.price)}</div>
                  <ul className="pl-list">
                    {packageFeatures(p).map(t => <li key={t}>{t}</li>)}
                  </ul>
                </div>
              ))}
            </div>

            <div className="pl-grid-2">
              <div className="pl-card">
                <h3 className="pl-h3">Monthly management</h3>
                <div className="pl-price pl-price-big">{naira(MONTHLY_MANAGEMENT.price)} <span className="pl-small" style={{ fontWeight: 400 }}>{MONTHLY_MANAGEMENT.unit}</span></div>
                <p className="pl-note">{MONTHLY_MANAGEMENT.includes}.</p>
              </div>
              <div className="pl-card">
                <h3 className="pl-h3">Add-ons</h3>
                <table className="pl-table">
                  <tbody>
                    {LISTING_ADDONS.map(a => <tr key={a.name}><td>{a.name}</td><td className="num">{naira(a.price)}</td></tr>)}
                  </tbody>
                </table>
              </div>
            </div>
            <p className="pl-note"><strong>Bundle:</strong> {LISTING_BUNDLE.text}</p>
            <ul className="pl-list pl-inline" style={{ marginTop: 8 }}>
              {LISTING_NOTES.map(n => <li key={n}>{n}</li>)}
            </ul>
          </section>

          {/* ── Book printing ── */}
          <section className="pl-section" aria-labelledby="pl-printing">
            <h2 className="pl-h2" id="pl-printing">Book printing rates</h2>
            <div className="pl-rule" />
            <p className="pl-lead">Inside pages, per page per copy. Colour is double the black &amp; white rate.</p>

            <div className="pl-card">
              <table className="pl-table">
                <thead><tr><th>Paper</th><th>Size</th><th className="num">B/W</th><th className="num">Colour</th><th className="num">Binding</th></tr></thead>
                <tbody>
                  {(Object.keys(PAPERS) as (keyof typeof PAPERS)[]).flatMap(paper => SIZES.map(size => {
                    const r = PAGE_RATES[paper][size]
                    return (
                      <tr key={`${paper}-${size}`}>
                        <td>{PAPERS[paper]}</td><td>{size}</td>
                        {r ? <><td className="num">{naira(r.bw)}</td><td className="num">{naira(r.colour)}</td></> : <td className="num" colSpan={2}>On request</td>}
                        <td className="num">{naira(BINDING_PER_COPY[size])}</td>
                      </tr>
                    )
                  }))}
                </tbody>
              </table>
              <p className="pl-note">Binding is per copy: {BINDING_DESCRIPTION.toLowerCase()}. For A4 on cream paper, contact us.</p>
            </div>

            <div className="pl-grid-2">
              <div className="pl-card">
                <h3 className="pl-h3">Bulk discount on printing</h3>
                <table className="pl-table">
                  <tbody>
                    {BULK_TIERS.filter(t => t.percent > 0 || t.customQuote).map(t => (
                      <tr key={t.label}><td>{t.label}</td><td className="num">{t.customQuote ? 'Custom quote' : `${t.percent}% off`}</td></tr>
                    ))}
                  </tbody>
                </table>
                <p className="pl-note">The discount applies to the whole total, pages and binding.</p>
              </div>
              <div className="pl-card">
                <h3 className="pl-h3">How it is worked out</h3>
                <p style={{ fontSize: 14, color: 'var(--dark)' }}>{FORMULA}.</p>
                <p className="pl-note">Page counts are rounded up to the next even number.</p>
              </div>
            </div>

            <div className="pl-card">
              <h3 className="pl-h3">Worked examples (list price, before any bulk discount)</h3>
              <table className="pl-table">
                <thead><tr><th>Book</th><th className="num">Per copy</th><th className="num">Copies</th><th className="num">Total</th></tr></thead>
                <tbody>
                  {examples.map(e => (
                    <tr key={`${e.size}-${e.paper}-${e.pages}`}>
                      <td>{e.pages}-page {e.size}, {e.paper === 'white' ? 'white' : 'cream'}, {COLOUR_MODES[e.colour].toLowerCase()}<br />
                        <span className="pl-small">{e.pages} × {naira(e.r.ratePerPage)} = {naira(e.pages * e.r.ratePerPage)}, plus {naira(e.r.binding)} binding</span></td>
                      <td className="num">{naira(e.r.perCopy)}</td><td className="num">{e.copies}</td><td className="num"><strong>{naira(e.r.listTotal)}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <PrintCalculator whatsappHref={whatsappHref} />
          </section>

          {/* ── Terms ── */}
          <section className="pl-section" aria-labelledby="pl-terms" style={{ paddingBottom: 56 }}>
            <h2 className="pl-h2" id="pl-terms">Terms</h2>
            <div className="pl-rule" />
            <div className="pl-card">
              <ul className="pl-list">
                {TERMS.map(t => <li key={t}>{t}</li>)}
              </ul>
            </div>
            <p className="pl-small">Prices effective {EFFECTIVE.label}.</p>
            {/* Shown on the printed copy only (the WhatsApp button is hidden in print). The number is the one configured for the site. */}
            <p className="pl-small pl-print-only">Quotations and orders: WhatsApp {whatsappDisplay}</p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  )
}
