'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  getSpecGroups, getQtyTiers, getAddonOptions, calculate, getDefaultSelection, buildSpecSummary,
  SpecOption, SpecSelection, QtyTier, AddonSelection
} from '@/lib/priceEngineV2'
import { getCategoryPriceModel } from '@/lib/categories'

interface LiveCalculatorV2Props {
  category: string
  productName: string
  qty: number
  widthFt?: number
  heightFt?: number
  isAreaBased?: boolean
  onPriceUpdate: (total: number, specs: Record<string, string>, summaryText: string) => void
  onSpecsUpdate?: (specs: SpecSelection) => void
}

export default function LiveCalculatorV2({
  category, productName, qty, widthFt = 1, heightFt = 1, isAreaBased = false,
  onPriceUpdate, onSpecsUpdate
}: LiveCalculatorV2Props) {

  const [groups, setGroups] = useState<Record<string, SpecOption[]>>({})
  const [addonOptions, setAddonOptions] = useState<SpecOption[]>([])
  const [addonQtys, setAddonQtys] = useState<Record<string, number>>({})
  const [tiers, setTiers] = useState<QtyTier[]>([])
  const [selection, setSelection] = useState<SpecSelection>({})
  const [priceModel, setPriceModel] = useState<string>('unit')
  const [pages, setPages] = useState(100)
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState<number | null>(null)
  const [tierLabel, setTierLabel] = useState<string | null>(null)
  const [discountPct, setDiscountPct] = useState(0)

  const isBookCategory = priceModel === 'per_page'
  const hasSpecs = Object.keys(groups).length > 0 || addonOptions.length > 0

  // Load spec groups, add-ons, tiers, price model
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      const [grps, trs, addons, pm] = await Promise.all([
        getSpecGroups(category),
        getQtyTiers(category),
        getAddonOptions(category),
        getCategoryPriceModel(category),
      ])
      if (cancelled) return
      setGroups(grps)
      setTiers(trs)
      setAddonOptions(addons)
      setAddonQtys({})
      setPriceModel(pm)
      const defaults = getDefaultSelection(grps)
      setSelection(defaults)
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [category])

  // Recalculate whenever anything changes
  useEffect(() => {
    if (loading) return
    if (Object.keys(selection).length === 0 && addonOptions.length === 0) return

    const addonSelections: AddonSelection[] = addonOptions.map(opt => ({
      option: opt,
      qty: addonQtys[opt.id] || 0,
    }))

    const result = calculate({
      category,
      priceModel,
      specs: selection,
      addons: addonSelections,
      qty,
      widthFt,
      heightFt,
      pages,
      tiers,
    })

    setTotal(result.total)
    setTierLabel(result.tierLabel)
    setDiscountPct(result.discountPct)

    const specSummary = buildSpecSummary(
      selection, qty,
      isAreaBased ? widthFt : undefined,
      isAreaBased ? heightFt : undefined,
      isBookCategory ? pages : undefined,
      addonSelections
    )
    onPriceUpdate(result.total, specSummary, result.summaryText)
    onSpecsUpdate?.(selection)

  }, [selection, addonQtys, qty, widthFt, heightFt, pages, tiers, loading, priceModel])

  const selectOption = useCallback((group: string, option: SpecOption) => {
    setSelection(prev => ({ ...prev, [group]: option }))
  }, [])

  const setAddonQty = useCallback((id: string, qty: number) => {
    setAddonQtys(prev => ({ ...prev, [id]: Math.max(0, qty) }))
  }, [])

  if (loading) {
    return (
      <div style={{ padding: '12px 0', fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center' as const }}>
        Loading pricing options...
      </div>
    )
  }

  if (!hasSpecs) return null

  const btnActive = (active: boolean) => ({
    padding: '6px 12px',
    borderRadius: 8,
    border: `1.5px solid ${active ? 'var(--red)' : '#e8e8e5'}`,
    background: active ? 'rgba(192,57,43,0.08)' : 'white',
    color: active ? 'var(--red)' : '#555',
    fontSize: 12,
    fontWeight: active ? 700 : 400,
    fontFamily: 'Montserrat',
    cursor: 'pointer',
    transition: 'all 0.15s',
    whiteSpace: 'nowrap' as const,
  })

  const groupLabel = (g: string) => g.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

  return (
    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 14 }}>

      {/* Spec selectors */}
      {Object.entries(groups).map(([group, options]) => (
        <div key={group}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 7 }}>
            {groupLabel(group)}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
            {options.map(opt => (
              <button
                key={opt.id}
                onClick={() => selectOption(group, opt)}
                style={btnActive(selection[group]?.id === opt.id)}
              >
                {opt.option_label}
                {Number(opt.price_modifier) > 0 && opt.modifier_type !== 'base_rate' && opt.modifier_type !== 'fixed_per_piece' && (
                  <span style={{ fontSize: 10, opacity: 0.7, marginLeft: 4 }}>
                    {opt.modifier_type === 'percentage' ? `+${opt.price_modifier}%` : `+₦${Number(opt.price_modifier).toLocaleString()}`}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* Pages input for books/magazines */}
      {isBookCategory && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 7 }}>
            Number of Pages
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => setPages(p => Math.max(8, p - 8))}
              style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #d1d5db', background: '#f3f4f6', cursor: 'pointer', fontSize: 16, color: '#1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
            <input
              type="number"
              value={pages}
              min={8}
              step={4}
              onChange={e => setPages(Math.max(8, Number(e.target.value)))}
              style={{ width: 70, textAlign: 'center' as const, padding: '6px', border: '1px solid #e8e8e5', borderRadius: 8, fontSize: 14, fontFamily: 'Montserrat', fontWeight: 700, outline: 'none' }}
              className="no-spinners"
            />
            <button onClick={() => setPages(p => p + 4)}
              style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #d1d5db', background: '#f3f4f6', cursor: 'pointer', fontSize: 16, color: '#1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
            <span style={{ fontSize: 12, color: '#888' }}>pages</span>
          </div>
        </div>
      )}

      {/* ── ADD-ONS — independent quantity per add-on ── */}
      {addonOptions.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 7 }}>
            Add-ons
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
            {addonOptions.map(opt => {
              const q = addonQtys[opt.id] || 0
              return (
                <div key={opt.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 8, border: `1.5px solid ${q > 0 ? 'var(--red)' : '#e8e8e5'}`, background: q > 0 ? 'rgba(192,57,43,0.05)' : 'white' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, fontFamily: 'Montserrat', color: '#1A1A1A' }}>{opt.option_label}</div>
                    <div style={{ fontSize: 11, color: '#888' }}>₦{Number(opt.price_modifier).toLocaleString()} each</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button onClick={() => setAddonQty(opt.id, q - 1)}
                      disabled={q <= 0}
                      style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid #d1d5db', background: q <= 0 ? '#f3f4f6' : '#fff', cursor: q <= 0 ? 'not-allowed' : 'pointer', fontSize: 15, color: '#1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: q <= 0 ? 0.4 : 1 }}>−</button>
                    <input
                      type="number"
                      value={q}
                      min={0}
                      onChange={e => setAddonQty(opt.id, Number(e.target.value))}
                      className="no-spinners"
                      style={{ width: 40, textAlign: 'center' as const, padding: '4px', border: '1px solid #e8e8e5', borderRadius: 7, fontSize: 13, fontFamily: 'Montserrat', fontWeight: 700, outline: 'none', background: '#fff', color: '#1A1A1A' }}
                    />
                    <button onClick={() => setAddonQty(opt.id, q + 1)}
                      style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', fontSize: 15, color: '#1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Live price display */}
      {total !== null && (
        <div style={{ background: 'linear-gradient(135deg, rgba(192,57,43,0.06) 0%, rgba(192,57,43,0.02) 100%)', border: '1.5px solid rgba(192,57,43,0.2)', borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 11, color: '#888', fontFamily: 'Montserrat', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 2 }}>
                {qty} {isAreaBased ? `(${widthFt}ft × ${heightFt}ft)` : 'pcs'} · VAT inclusive
              </div>
              {discountPct > 0 && tierLabel && (
                <div style={{ fontSize: 11, color: '#10b981', fontWeight: 600, marginBottom: 2 }}>
                  🎉 {tierLabel} — {discountPct}% discount applied
                </div>
              )}
            </div>
            <div style={{ textAlign: 'right' as const }}>
              <div style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 24, color: 'var(--red)', lineHeight: 1 }}>
                ₦{total.toLocaleString()}
              </div>
              {qty > 1 && (
                <div style={{ fontSize: 11, color: '#888', marginTop: 3 }}>
                  ₦{Math.round(total / qty).toLocaleString()} per piece
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}