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
  minWidth?: number    // minimum width enforced on dimension inputs (ft or in)
  minHeight?: number   // minimum height enforced on dimension inputs (ft or in)
  isAreaBased?: boolean
  applyPreset?: { specs?: Record<string, string>; addons?: string[] } | null
  onPriceUpdate: (total: number, specs: Record<string, string>, summaryText: string) => void
  onSpecsUpdate?: (specs: SpecSelection) => void
  onDimensionChange?: (axis: 'width' | 'height', value: number) => void
  onPriceModelResolved?: (priceModel: string) => void
}

export default function LiveCalculatorV2({
  category, productName, qty, widthFt = 1, heightFt = 1,
  minWidth = 0.1, minHeight = 0.1,
  isAreaBased = false,
  applyPreset, onPriceUpdate, onSpecsUpdate, onDimensionChange, onPriceModelResolved
}: LiveCalculatorV2Props) {

  const [groups, setGroups] = useState<Record<string, SpecOption[]>>({})
  const [addonOptions, setAddonOptions] = useState<SpecOption[]>([])
  const [addonQtys, setAddonQtys] = useState<Record<string, number>>({})
  const [tiers, setTiers] = useState<QtyTier[]>([])
  const [selection, setSelection] = useState<SpecSelection>({})
  const [priceModel, setPriceModel] = useState<string>('unit')
  const [pages, setPages] = useState(100)
  // Split loading state: priceModel resolves independently and fast (single
  // categories-table lookup, already warmed by the shop page's prefetch).
  // specsLoading covers spec_options/qty_tiers/add-ons, which are heavier and
  // shouldn't block dimension inputs or the pages stepper from appearing.
  const [priceModelLoading, setPriceModelLoading] = useState(true)
  const [specsLoading, setSpecsLoading] = useState(true)
  const [total, setTotal] = useState<number | null>(null)
  const [tierLabel, setTierLabel] = useState<string | null>(null)
  const [discountPct, setDiscountPct] = useState(0)

  const isBookCategory = priceModel === 'per_page'
  const isAreaCategory = priceModel === 'area' || priceModel === 'area_sqin'
  const hasSpecs = Object.keys(groups).length > 0 || addonOptions.length > 0
  // Overall loading — used only to gate the recalculation effect below,
  // never to gate rendering of dimension/page inputs.
  const loading = priceModelLoading || specsLoading

  // Resolve the price model independently — this is the fastest call (a single
  // categories-table lookup, already warm from the shop page's prefetch on mount)
  // and dimension/page inputs only depend on this, not on spec_options.
  useEffect(() => {
    let cancelled = false
    getCategoryPriceModel(category).then(pm => {
      if (cancelled) return
      setPriceModel(pm)
      onPriceModelResolved?.(pm)
      setPriceModelLoading(false)
    })
    return () => { cancelled = true }
  }, [category])

  // Load spec groups, add-ons, qty tiers — heavier, runs in parallel with the
  // price model resolution above but gates only the spec-option buttons/add-ons.
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setSpecsLoading(true)
      const [grps, trs, addons] = await Promise.all([
        getSpecGroups(category),
        getQtyTiers(category),
        getAddonOptions(category),
      ])
      if (cancelled) return
      setGroups(grps)
      setTiers(trs)
      setAddonOptions(addons)
      setAddonQtys({})
      const defaults = getDefaultSelection(grps)
      setSelection(defaults)
      setSpecsLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [category])

  // Apply an externally-selected Quick Pick preset once groups/add-ons are loaded
  useEffect(() => {
    if (!applyPreset || loading) return

    if (applyPreset.specs) {
      setSelection(prev => {
        const next = { ...prev }
        for (const [group, label] of Object.entries(applyPreset.specs!)) {
          const opt = groups[group]?.find(o => o.option_label === label)
          if (opt) next[group] = opt
        }
        return next
      })
    }

    if (applyPreset.addons) {
      setAddonQtys(prev => {
        const next = { ...prev }
        for (const label of applyPreset.addons!) {
          const opt = addonOptions.find(o => o.option_label === label)
          if (opt) next[opt.id] = 1
        }
        return next
      })
    }
  }, [applyPreset, groups, addonOptions, loading])

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
      minWidth,
      minHeight,
      pages,
      tiers,
    })

    setTotal(result.total)
    setTierLabel(result.tierLabel)
    setDiscountPct(result.discountPct)

    const specSummary = buildSpecSummary(
      selection, qty,
      isAreaCategory ? widthFt : undefined,
      isAreaCategory ? heightFt : undefined,
      isBookCategory ? pages : undefined,
      addonSelections
    )
    onPriceUpdate(result.total, specSummary, result.summaryText)
    onSpecsUpdate?.(selection)

  }, [selection, addonQtys, qty, widthFt, heightFt, pages, tiers, loading, priceModel, isAreaCategory, isBookCategory])

  const selectOption = useCallback((group: string, option: SpecOption) => {
    setSelection(prev => ({ ...prev, [group]: option }))
  }, [])

  const setAddonQty = useCallback((id: string, qty: number) => {
    setAddonQtys(prev => ({ ...prev, [id]: Math.max(0, qty) }))
  }, [])

  if (priceModelLoading) {
    return (
      <div style={{ padding: '12px 0', fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center' as const }}>
        Loading pricing options...
      </div>
    )
  }

  // Only treat "no specs" as a reason to render nothing once specs have
  // actually finished loading — while specsLoading is true, hasSpecs is
  // false simply because nothing has arrived yet, not because the category
  // has no options. Dimension/page inputs depend only on priceModel, which
  // is already resolved by this point, so they should never be blocked by this.
  if (!specsLoading && !hasSpecs && !isAreaCategory && !isBookCategory) return null

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

      {/* Spec selectors — lightweight skeleton while specsLoading, so dimension/
          page inputs below aren't held hostage waiting for this section */}
      {specsLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
          {[0, 1].map(i => (
            <div key={i}>
              <div style={{ width: 90, height: 10, borderRadius: 4, background: '#eee', marginBottom: 8 }} />
              <div style={{ display: 'flex', gap: 6 }}>
                {[0, 1, 2].map(j => (
                  <div key={j} style={{ width: 64, height: 28, borderRadius: 8, background: '#f0f0f0' }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        Object.entries(groups).map(([group, options]) => {
          const selectedOpt = selection[group]
          return (
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
                    {Number(opt.price_modifier) !== 0 && opt.modifier_type !== 'base_rate' && (
                      <span style={{ fontSize: 10, opacity: 0.7, marginLeft: 4 }}>
                        {opt.modifier_type === 'percentage'
                          ? `${Number(opt.price_modifier) > 0 ? '+' : ''}${opt.price_modifier}%`
                          : `+₦${Number(opt.price_modifier).toLocaleString()}`}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              {/* Guidance note for the currently-selected option in this group —
                  e.g. "Best for full-colour designs, any quantity" for print methods */}
              {selectedOpt?.note && (
                <div style={{ fontSize: 11, color: '#888', marginTop: 5, fontStyle: 'italic' as const }}>
                  💡 {selectedOpt.note}
                </div>
              )}
            </div>
          )
        })
      )}

      {isAreaCategory && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 7 }}>
            Dimensions {priceModel === 'area_sqin' ? '(inches)' : '(feet)'}
          </div>

          {/* Quick size presets — scaled relative to the product's minimum so
              suggestions are never below what's actually orderable */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' as const }}>
            {(priceModel === 'area_sqin'
              ? [
                  { label: 'Small', w: Math.max(minWidth, 2), h: Math.max(minHeight, 2) },
                  { label: 'Medium', w: Math.max(minWidth, 4), h: Math.max(minHeight, 4) },
                  { label: 'Large', w: Math.max(minWidth, 6), h: Math.max(minHeight, 6) },
                ]
              : [
                  { label: 'Small', w: Math.max(minWidth, 3), h: Math.max(minHeight, 2) },
                  { label: 'Medium', w: Math.max(minWidth, 6), h: Math.max(minHeight, 3) },
                  { label: 'Large', w: Math.max(minWidth, 10), h: Math.max(minHeight, 4) },
                ]
            ).map(preset => {
              const isActive = widthFt === preset.w && heightFt === preset.h
              return (
                <button
                  key={preset.label}
                  onClick={() => { onDimensionChange?.('width', preset.w); onDimensionChange?.('height', preset.h) }}
                  style={{
                    padding: '6px 12px', borderRadius: 8, fontSize: 12, fontFamily: 'Montserrat', fontWeight: isActive ? 700 : 500,
                    border: `1.5px solid ${isActive ? 'var(--red)' : '#e8e8e5'}`,
                    background: isActive ? 'rgba(192,57,43,0.08)' : 'white',
                    color: isActive ? 'var(--red)' : '#555',
                    cursor: 'pointer',
                  }}>
                  {preset.label} <span style={{ opacity: 0.65, fontWeight: 400 }}>({preset.w}×{preset.h}{priceModel === 'area_sqin' ? 'in' : 'ft'})</span>
                </button>
              )
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 3 }}>
              <label style={{ fontSize: 10, color: '#888', fontWeight: 600 }}>
                WIDTH {minWidth > 0.1 ? <span style={{ color: 'var(--red)' }}>min {minWidth}{priceModel === 'area_sqin' ? 'in' : 'ft'}</span> : ''}
              </label>
              <input
                type="number"
                value={widthFt}
                min={minWidth}
                step={priceModel === 'area_sqin' ? 1 : 0.5}
                onChange={e => onDimensionChange?.('width', Math.max(minWidth, Number(e.target.value)))}
                style={{ width: 70, textAlign: 'center' as const, padding: '6px', border: `1px solid ${widthFt < minWidth ? '#ef4444' : '#e8e8e5'}`, borderRadius: 8, fontSize: 14, fontFamily: 'Montserrat', fontWeight: 700, outline: 'none' }}
              />
            </div>
            <div style={{ fontSize: 18, color: '#888', marginTop: 18 }}>×</div>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 3 }}>
              <label style={{ fontSize: 10, color: '#888', fontWeight: 600 }}>
                HEIGHT {minHeight > 0.1 ? <span style={{ color: 'var(--red)' }}>min {minHeight}{priceModel === 'area_sqin' ? 'in' : 'ft'}</span> : ''}
              </label>
              <input
                type="number"
                value={heightFt}
                min={minHeight}
                step={priceModel === 'area_sqin' ? 1 : 0.5}
                onChange={e => onDimensionChange?.('height', Math.max(minHeight, Number(e.target.value)))}
                style={{ width: 70, textAlign: 'center' as const, padding: '6px', border: `1px solid ${heightFt < minHeight ? '#ef4444' : '#e8e8e5'}`, borderRadius: 8, fontSize: 14, fontFamily: 'Montserrat', fontWeight: 700, outline: 'none' }}
              />
            </div>
            <div style={{ fontSize: 12, color: '#888', marginTop: 18 }}>
              {priceModel === 'area_sqin' ? 'in' : 'ft'}
            </div>
            <div style={{ marginTop: 18, fontSize: 12, color: 'var(--red)', fontWeight: 700, fontFamily: 'Montserrat' }}>
              = {(widthFt * heightFt).toFixed(2)} {priceModel === 'area_sqin' ? 'sq.in' : 'sq.ft'}
            </div>
          </div>
          {(widthFt < minWidth || heightFt < minHeight) && (
            <div style={{ fontSize: 11, color: '#ef4444', marginTop: 6 }}>
              ⚠️ Minimum size is {minWidth} × {minHeight} {priceModel === 'area_sqin' ? 'inches' : 'ft'}
            </div>
          )}
        </div>
      )}

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
                {isAreaCategory
                  ? `${widthFt}${priceModel === 'area_sqin' ? 'in' : 'ft'} × ${heightFt}${priceModel === 'area_sqin' ? 'in' : 'ft'} · qty ${qty}`
                  : isBookCategory
                  ? `${qty} copies · ${pages} pages`
                  : `${qty} pcs`} · VAT inclusive
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