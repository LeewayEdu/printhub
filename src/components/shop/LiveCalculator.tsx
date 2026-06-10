'use client'

import { useState, useEffect } from 'react'
import { getRates, calcFlex, calcBusinessCard, calcFlyer, calcSticker, calcApparel, getCategoryEngine, PriceSettings, PriceBreakdown } from '@/lib/priceEngine'
import { Calculator, ChevronDown, ChevronUp } from 'lucide-react'

interface LiveCalculatorProps {
  category: string
  qty: number
  w?: number
  h?: number
  onPriceUpdate?: (total: number, breakdown: PriceBreakdown) => void
}

export default function LiveCalculator({ category, qty, w = 1, h = 1, onPriceUpdate }: LiveCalculatorProps) {
  const engine = getCategoryEngine(category)
  const [rates, setRates] = useState<PriceSettings | null>(null)
  const [breakdown, setBreakdown] = useState<PriceBreakdown | null>(null)
  const [expanded, setExpanded] = useState(false)

  // Flex / Banners params
  const [material, setMaterial] = useState<'flex_440gsm' | 'flex_backlit' | 'flex_canvas'>('flex_440gsm')
  const [eyelets, setEyelets] = useState(false)
  const [rope, setRope] = useState(false)

  // Business card params
  const [paperWeight, setPaperWeight] = useState<'300gsm' | '350gsm' | '400gsm'>('300gsm')
  const [lamination, setLamination] = useState<'none' | 'gloss' | 'matt' | 'spot_uv' | 'aqueous'>('none')

  // Flyer params
  const [flyerSize, setFlyerSize] = useState<'A4' | 'A5' | 'A6'>('A4')
  const [flyerSides, setFlyerSides] = useState<'single' | 'double'>('single')
  const [flyerPrint, setFlyerPrint] = useState<'DI' | 'offset'>('DI')
  const [flyerPaper, setFlyerPaper] = useState<'bond' | 'art'>('bond')
  const [flyerLam, setFlyerLam] = useState<'none' | 'gloss' | 'matt'>('none')

  // Sticker params
  const [stickerMat, setStickerMat] = useState<'vinyl' | 'clear' | 'paper'>('vinyl')

  // Apparel params
  const [apparelItem, setApparelItem] = useState<'tshirt' | 'polo' | 'hoodie' | 'cap'>('tshirt')
  const [apparelPrint, setApparelPrint] = useState<'dtf' | 'embroidery'>('dtf')

  useEffect(() => {
    getRates().then(setRates)
  }, [])

  useEffect(() => {
    if (!rates || !engine) return
    let result: PriceBreakdown | null = null

    if (engine === 'flex') {
      result = calcFlex(rates, { widthFt: w, heightFt: h, quantity: qty, material, eyelets, rope })
    } else if (engine === 'businesscard') {
      result = calcBusinessCard(rates, { quantity: qty, paperWeight, lamination })
    } else if (engine === 'flyer') {
      result = calcFlyer(rates, { size: flyerSize, quantity: qty, sides: flyerSides, printType: flyerPrint, paperType: flyerPaper, lamination: flyerLam })
    } else if (engine === 'sticker') {
      result = calcSticker(rates, { widthFt: w, heightFt: h, quantity: qty, material: stickerMat })
    } else if (engine === 'apparel') {
      result = calcApparel(rates, { item: apparelItem, printMethod: apparelPrint, quantity: qty })
    }

    if (result) {
      setBreakdown(result)
      onPriceUpdate?.(result.total, result)
    }
  }, [rates, engine, qty, w, h, material, eyelets, rope, paperWeight, lamination, flyerSize, flyerSides, flyerPrint, flyerPaper, flyerLam, stickerMat, apparelItem, apparelPrint])

  if (!engine || !rates) return null

  const inputStyle = { padding: '6px 10px', border: '1px solid #e8e8e5', borderRadius: 8, fontSize: 12, fontFamily: 'Open Sans', outline: 'none', background: '#f9f9f7', width: '100%', boxSizing: 'border-box' as const }
  const btnStyle = (active: boolean) => ({
    padding: '5px 10px', borderRadius: 7, border: `1px solid ${active ? 'var(--red)' : '#e8e8e5'}`,
    background: active ? 'rgba(192,57,43,0.08)' : 'white', color: active ? 'var(--red)' : '#666',
    fontSize: 11, fontWeight: active ? 700 : 400, cursor: 'pointer', fontFamily: 'Montserrat',
    transition: 'all 0.15s'
  })

  return (
    <div style={{ background: '#f9f9f7', border: '1px solid #e8e8e5', borderRadius: 12, overflow: 'hidden', marginTop: 8 }}>

      {/* Header */}
      <div onClick={() => setExpanded(!expanded)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', cursor: 'pointer', background: expanded ? '#f3f4f6' : '#f9f9f7' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <Calculator size={14} color="var(--red)" />
          <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'Montserrat', color: 'var(--text-primary)' }}>
            Live Price Calculator
          </span>
          {breakdown && !expanded && (
            <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--red)', fontFamily: 'Montserrat' }}>
              — ₦{breakdown.total.toLocaleString()}
            </span>
          )}
        </div>
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </div>

      {expanded && (
        <div style={{ padding: '12px 14px', borderTop: '1px solid #e8e8e5' }}>

          {/* ── FLEX PARAMS ── */}
          {engine === 'flex' && (
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 5, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Material</div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' as const }}>
                  {[['flex_440gsm', '440gsm'], ['flex_backlit', 'Backlit'], ['flex_canvas', 'Canvas']].map(([val, label]) => (
                    <button key={val} onClick={() => setMaterial(val as any)} style={btnStyle(material === val)}>{label}</button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
                  <input type="checkbox" checked={eyelets} onChange={e => setEyelets(e.target.checked)} />
                  Add eyelets
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
                  <input type="checkbox" checked={rope} onChange={e => setRope(e.target.checked)} />
                  Add rope
                </label>
              </div>
            </div>
          )}

          {/* ── BUSINESS CARD PARAMS ── */}
          {engine === 'businesscard' && (
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 5, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Paper Weight</div>
                <div style={{ display: 'flex', gap: 5 }}>
                  {[['300gsm', '300gsm'], ['350gsm', '350gsm +extra'], ['400gsm', '400gsm +extra']].map(([val, label]) => (
                    <button key={val} onClick={() => setPaperWeight(val as any)} style={btnStyle(paperWeight === val)}>{label}</button>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 5, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Lamination</div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' as const }}>
                  {[['none', 'None'], ['gloss', 'Gloss'], ['matt', 'Matt'], ['spot_uv', 'Spot UV'], ['aqueous', 'Aqueous']].map(([val, label]) => (
                    <button key={val} onClick={() => setLamination(val as any)} style={btnStyle(lamination === val)}>{label}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── FLYER PARAMS ── */}
          {engine === 'flyer' && (
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 5 }}>Size</div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {(['A4', 'A5', 'A6'] as const).map(s => (
                      <button key={s} onClick={() => setFlyerSize(s)} style={btnStyle(flyerSize === s)}>{s}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 5 }}>Sides</div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[['single', 'Single'], ['double', 'Double']].map(([val, label]) => (
                      <button key={val} onClick={() => setFlyerSides(val as any)} style={btnStyle(flyerSides === val)}>{label}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 5 }}>Print Type</div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[['DI', 'DI (Digital)'], ['offset', 'Offset']].map(([val, label]) => (
                      <button key={val} onClick={() => setFlyerPrint(val as any)} style={btnStyle(flyerPrint === val)}>{label}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 5 }}>Paper</div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[['bond', 'Bond'], ['art', 'Art']].map(([val, label]) => (
                      <button key={val} onClick={() => setFlyerPaper(val as any)} style={btnStyle(flyerPaper === val)}>{label}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 5 }}>Lamination</div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[['none', 'None'], ['gloss', 'Gloss'], ['matt', 'Matt']].map(([val, label]) => (
                    <button key={val} onClick={() => setFlyerLam(val as any)} style={btnStyle(flyerLam === val)}>{label}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── STICKER PARAMS ── */}
          {engine === 'sticker' && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 5, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Material</div>
              <div style={{ display: 'flex', gap: 5 }}>
                {[['vinyl', 'Vinyl'], ['clear', 'Clear'], ['paper', 'Paper Label']].map(([val, label]) => (
                  <button key={val} onClick={() => setStickerMat(val as any)} style={btnStyle(stickerMat === val)}>{label}</button>
                ))}
              </div>
            </div>
          )}

          {/* ── APPAREL PARAMS ── */}
          {engine === 'apparel' && (
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 5, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Item Type</div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' as const }}>
                  {[['tshirt', 'T-Shirt'], ['polo', 'Polo'], ['hoodie', 'Hoodie'], ['cap', 'Cap']].map(([val, label]) => (
                    <button key={val} onClick={() => setApparelItem(val as any)} style={btnStyle(apparelItem === val)}>{label}</button>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 5, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Print Method</div>
                <div style={{ display: 'flex', gap: 5 }}>
                  {[['dtf', 'DTF Print'], ['embroidery', 'Embroidery']].map(([val, label]) => (
                    <button key={val} onClick={() => setApparelPrint(val as any)} style={btnStyle(apparelPrint === val)}>{label}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── PRICE BREAKDOWN ── */}
          {breakdown && (
            <div style={{ marginTop: 12, background: 'white', border: '1px solid #e8e8e5', borderRadius: 10, overflow: 'hidden' }}>
              {breakdown.lines.map((line, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 12px', borderBottom: '1px solid #f5f5f3', fontSize: 12 }}>
                  <span style={{ color: '#666' }}>{line.label}</span>
                  <span style={{ fontWeight: 600, color: '#1A1A1A' }}>₦{line.amount.toLocaleString()}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 12px', borderBottom: '1px solid #f5f5f3', fontSize: 12 }}>
                <span style={{ color: '#888' }}>VAT (7.5%)</span>
                <span style={{ color: '#888' }}>₦{breakdown.vat.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: '#fef5f5' }}>
                <span style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 13, color: '#1A1A1A' }}>Total</span>
                <div style={{ textAlign: 'right' as const }}>
                  <div style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 16, color: 'var(--red)' }}>₦{breakdown.total.toLocaleString()}</div>
                  {breakdown.perUnit > 0 && (
                    <div style={{ fontSize: 10, color: '#888' }}>₦{breakdown.perUnit.toLocaleString()} per piece</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}