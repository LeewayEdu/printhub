'use client'

import { useId, useState } from 'react'
import { calcPrint, parseCount, naira, A4_CREAM_MESSAGE } from '@/lib/price-list-calc'
import { SIZES, PAPERS, COLOUR_MODES, ROUNDING_RULE, FORMULA, type Size, type Paper, type ColourMode } from '@/lib/price-list'

// Book-print estimate. All maths is in lib/price-list-calc.ts; this component only collects inputs and shows the result.
export default function PrintCalculator({ whatsappHref }: { whatsappHref: string }) {
  const uid = useId()
  const [size, setSize] = useState<Size>('A5')
  const [paper, setPaper] = useState<Paper>('white')
  const [colour, setColour] = useState<ColourMode>('bw')
  const [pagesText, setPagesText] = useState('120')
  const [copiesText, setCopiesText] = useState('100')

  const res = calcPrint({ size, paper, colour, pages: parseCount(pagesText), copies: parseCount(copiesText) })
  const errors = res.ok ? {} : res.errors
  const a4Cream = !res.ok && res.a4Cream

  return (
    <div className="pl-card pl-no-print" aria-labelledby={`${uid}-h`}>
      <h3 className="pl-h3" id={`${uid}-h`}>Book print estimate</h3>
      <p className="pl-small" style={{ marginBottom: 14 }}>Choose the book, then read the estimate below. It is an estimate only; the quotation confirms the final price.</p>

      <div className="pl-calc-grid">
        <div className="pl-field">
          <label htmlFor={`${uid}-size`}>Size</label>
          <select id={`${uid}-size`} className="form-input" value={size} onChange={e => setSize(e.target.value as Size)}>
            {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="pl-field">
          <label htmlFor={`${uid}-paper`}>Paper</label>
          <select id={`${uid}-paper`} className="form-input" value={paper} onChange={e => setPaper(e.target.value as Paper)}
            aria-invalid={!!errors.paper} aria-describedby={errors.paper ? `${uid}-paper-err` : undefined}>
            {(Object.keys(PAPERS) as Paper[]).map(p => <option key={p} value={p}>{PAPERS[p]}{p === 'cream' && size === 'A4' ? ' (A4: contact us)' : ''}</option>)}
          </select>
        </div>
        <div className="pl-field">
          <label htmlFor={`${uid}-colour`}>Colour mode</label>
          <select id={`${uid}-colour`} className="form-input" value={colour} onChange={e => setColour(e.target.value as ColourMode)}>
            {(Object.keys(COLOUR_MODES) as ColourMode[]).map(c => <option key={c} value={c}>{COLOUR_MODES[c]}</option>)}
          </select>
        </div>
        <div className="pl-field">
          <label htmlFor={`${uid}-pages`}>Pages</label>
          <input id={`${uid}-pages`} className="form-input" inputMode="numeric" autoComplete="off" value={pagesText}
            onChange={e => setPagesText(e.target.value)} aria-invalid={!!errors.pages} aria-describedby={errors.pages ? `${uid}-pages-err` : undefined} />
          {errors.pages && <div className="pl-err" id={`${uid}-pages-err`} role="alert">{errors.pages}</div>}
        </div>
        <div className="pl-field">
          <label htmlFor={`${uid}-copies`}>Copies</label>
          <input id={`${uid}-copies`} className="form-input" inputMode="numeric" autoComplete="off" value={copiesText}
            onChange={e => setCopiesText(e.target.value)} aria-invalid={!!errors.copies} aria-describedby={errors.copies ? `${uid}-copies-err` : undefined} />
          {errors.copies && <div className="pl-err" id={`${uid}-copies-err`} role="alert">{errors.copies}</div>}
        </div>
      </div>

      {(errors.size || errors.paper && !a4Cream || errors.colour) && (
        <div className="pl-err" role="alert" style={{ color: 'var(--red-dark)', fontSize: 13, marginBottom: 8 }}>
          {errors.size || errors.paper || errors.colour}
        </div>
      )}

      {a4Cream && (
        <div className="pl-block" id={`${uid}-paper-err`} role="alert">
          <strong>{A4_CREAM_MESSAGE}</strong>{' '}
          <a href={whatsappHref} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--red-dark)', fontWeight: 700 }}>Message us on WhatsApp</a>
        </div>
      )}

      {res.ok && (
        <div className="pl-result" aria-live="polite">
          <dl>
            <dt>Pages billed</dt>
            <dd>{res.pagesBilled}{res.pagesRounded ? ` (you entered ${res.pagesEntered}; rounded up to the next even number)` : ''}</dd>
            <dt>Rate per page</dt><dd>{naira(res.ratePerPage)}</dd>
            <dt>Binding per copy</dt><dd>{naira(res.binding)}</dd>
            <dt>Cost per copy</dt><dd>{naira(res.perCopy)}</dd>
            <dt>List total</dt><dd>{naira(res.listTotal)}</dd>
            {res.customQuote ? (
              <>
                <dt>Discount</dt><dd>Custom quote, contact us</dd>
              </>
            ) : (
              <>
                <dt>Bulk discount ({res.discountPercent}%)</dt><dd>{res.discountPercent ? `− ${naira(res.discountAmount)}` : 'None under 100 copies'}</dd>
                <div className="pl-final" style={{ display: 'contents' }}><dt>Estimated total</dt><dd>{naira(res.finalTotal as number)}</dd></div>
              </>
            )}
          </dl>
          {res.customQuote && (
            <p style={{ fontSize: 13, color: 'var(--dark)', marginTop: 10 }}>
              500 copies and above are quoted individually, so no discounted figure is shown. <a href={whatsappHref} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--red-dark)', fontWeight: 700 }}>Contact us for a quote</a>.
            </p>
          )}
        </div>
      )}

      <p className="pl-note"><strong>Mixed books:</strong> a book with both colour and black &amp; white pages is priced per page type and needs a quotation.</p>
      <p className="pl-small" style={{ marginTop: 6 }}>{FORMULA}. {ROUNDING_RULE}</p>
    </div>
  )
}
