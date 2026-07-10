'use client'

import { useState } from 'react'
import type { DesignPricingResolved } from '@/store/cartStore'

interface LinkedAddon {
  id: string
  gate_question: string
  gate_when_answer: 'yes' | 'no'
  design_addons: { name: string; price: number; description: string | null }
}

interface Product {
  design_pricing_type: 'flat' | 'unit_based' | 'dependent'
  design_flat_fee?: number | null
  design_unit_label?: string | null
  design_unit_rate?: number | null
  design_min_units?: number | null
}

interface Props {
  product: Product
  linkedAddons: LinkedAddon[]
  onResolved: (result: DesignPricingResolved) => void
  onReset: () => void
  resolved: DesignPricingResolved | null
}

export default function DesignPricingFlow({ product, linkedAddons, onResolved, onReset, resolved }: Props) {
  const [hasOwnDesign, setHasOwnDesign] = useState<boolean | null>(null)
  const [designUnits, setDesignUnits] = useState<number>(product.design_min_units || 1)
  const [addonAnswers, setAddonAnswers] = useState<Record<string, 'yes' | 'no'>>({})
  const [requestNotes, setRequestNotes] = useState('')

  const minUnits = product.design_min_units || 1
  const flatFee = Number(product.design_flat_fee || 0)
  const unitRate = Number(product.design_unit_rate || 0)
  const unitLabel = product.design_unit_label || 'units'

  const selectedAddons = linkedAddons.filter(la => {
    const answer = addonAnswers[la.id]
    return answer === la.gate_when_answer
  })

  const addonsCost = selectedAddons.reduce((s, la) => s + Number(la.design_addons.price || 0), 0)

  const computeDesignCost = (): number => {
    if (hasOwnDesign) return 0
    switch (product.design_pricing_type) {
      case 'flat': return flatFee
      case 'unit_based': return unitRate * Math.max(designUnits, minUnits)
      case 'dependent': return flatFee + addonsCost
    }
  }

  const allAddonAnswered = linkedAddons.every(la => addonAnswers[la.id] !== undefined)

  const isFlowComplete = (): boolean => {
    if (hasOwnDesign === null) return false
    if (hasOwnDesign) return true
    switch (product.design_pricing_type) {
      case 'flat': return true
      case 'unit_based': return designUnits >= minUnits
      case 'dependent': return allAddonAnswered
    }
  }

  const handleConfirm = () => {
    if (!isFlowComplete()) return
    const designCostTotal = computeDesignCost()
    onResolved({
      hasOwnDesign: hasOwnDesign!,
      designCostTotal,
      designAddons: hasOwnDesign ? [] : selectedAddons.map(la => ({
        name: la.design_addons.name,
        price: la.design_addons.price,
      })),
      designUnits: product.design_pricing_type === 'unit_based' ? designUnits : undefined,
      designRequestNotes: requestNotes.trim() || undefined,
    })
  }

  const handleReset = () => {
    setHasOwnDesign(null)
    setDesignUnits(minUnits)
    setAddonAnswers({})
    setRequestNotes('')
    onReset()
  }

  const btnBase: React.CSSProperties = {
    padding: '9px 18px', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 13,
    cursor: 'pointer', border: '2px solid transparent', transition: 'all 0.15s',
  }
  const btnSelected: React.CSSProperties = { ...btnBase, background: 'var(--red)', color: 'white', borderColor: 'var(--red)' }
  const btnUnselected: React.CSSProperties = { ...btnBase, background: 'white', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }

  // Already resolved — show compact summary
  if (resolved) {
    const designCost = resolved.designCostTotal
    return (
      <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 12, padding: '14px 18px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 13, color: '#166534', marginBottom: 4 }}>
              ✓ Design: {resolved.hasOwnDesign ? 'Using your own file' : designCost === 0 ? 'Included' : `₦${designCost.toLocaleString()}`}
            </div>
            {!resolved.hasOwnDesign && resolved.designAddons?.length > 0 && (
              <div style={{ fontSize: 11, color: '#166534' }}>
                {resolved.designAddons.map(a => `${a.name} (₦${Number(a.price).toLocaleString()})`).join(' · ')}
              </div>
            )}
            {!resolved.hasOwnDesign && product.design_pricing_type === 'unit_based' && resolved.designUnits && (
              <div style={{ fontSize: 11, color: '#166534' }}>
                {resolved.designUnits} {unitLabel} × ₦{unitRate.toLocaleString()}
              </div>
            )}
          </div>
          <button onClick={handleReset} style={{ fontSize: 11, color: '#166534', background: 'none', border: '1px solid #86efac', borderRadius: 7, padding: '4px 10px', cursor: 'pointer', fontFamily: 'Montserrat', fontWeight: 600, flexShrink: 0 }}>
            Change
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ border: '1px solid var(--border-color)', borderRadius: 14, padding: '18px 20px', marginBottom: 20, background: 'var(--bg-card)' }}>
      <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', marginBottom: 16 }}>
        Design Options
      </div>

      {/* Step 1: Do you have a print-ready design file? */}
      <div style={{ marginBottom: hasOwnDesign === null ? 0 : 18 }}>
        <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600, marginBottom: 10 }}>
          Do you have a print-ready design file?
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            style={hasOwnDesign === true ? btnSelected : btnUnselected}
            onClick={() => { setHasOwnDesign(true); setAddonAnswers({}) }}>
            Yes, I have my file
          </button>
          <button
            style={hasOwnDesign === false ? btnSelected : btnUnselected}
            onClick={() => setHasOwnDesign(false)}>
            No, I need design
          </button>
        </div>
      </div>

      {/* Yes path: upload instruction */}
      {hasOwnDesign === true && (
        <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 9, padding: '12px 14px', marginBottom: 16, fontSize: 13, color: '#166534' }}>
          No design fee — you'll upload your file after adding to cart.
        </div>
      )}

      {/* No path: design pricing details */}
      {hasOwnDesign === false && (
        <div>
          {/* Flat fee */}
          {(product.design_pricing_type === 'flat' || product.design_pricing_type === 'dependent') && flatFee > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#fafafa', borderRadius: 8, border: '1px solid var(--border-color)', marginBottom: 12, fontSize: 13 }}>
              <span style={{ color: 'var(--text-secondary)' }}>
                {product.design_pricing_type === 'dependent' ? 'Base design fee' : 'Design fee'}
              </span>
              <span style={{ fontFamily: 'Montserrat', fontWeight: 700, color: 'var(--text-primary)' }}>
                ₦{flatFee.toLocaleString()}
              </span>
            </div>
          )}

          {/* Unit-based: unit input */}
          {product.design_pricing_type === 'unit_based' && (
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6, color: 'var(--text-secondary)', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>
                {unitLabel} <span style={{ fontWeight: 400, textTransform: 'none' as const }}>(minimum {minUnits})</span>
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  onClick={() => setDesignUnits(u => Math.max(minUnits, u - 1))}
                  disabled={designUnits <= minUnits}
                  style={{ width: 32, height: 32, borderRadius: 7, border: '1px solid var(--border-color)', background: '#f7f7f5', cursor: designUnits <= minUnits ? 'not-allowed' : 'pointer', fontSize: 16, opacity: designUnits <= minUnits ? 0.4 : 1 }}>
                  −
                </button>
                <input type="number" value={designUnits} min={minUnits}
                  onChange={e => setDesignUnits(Math.max(minUnits, Number(e.target.value)))}
                  style={{ width: 64, textAlign: 'center' as const, padding: '6px', border: '1px solid var(--border-color)', borderRadius: 7, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 15 }} />
                <button onClick={() => setDesignUnits(u => u + 1)}
                  style={{ width: 32, height: 32, borderRadius: 7, border: '1px solid var(--border-color)', background: '#f7f7f5', cursor: 'pointer', fontSize: 16 }}>
                  +
                </button>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', marginLeft: 4 }}>
                  × ₦{unitRate.toLocaleString()} = <strong>₦{(unitRate * designUnits).toLocaleString()}</strong>
                </span>
              </div>
            </div>
          )}

          {/* Dependent: gated add-on questions */}
          {product.design_pricing_type === 'dependent' && linkedAddons.map(la => {
            const answer = addonAnswers[la.id]
            const addonApplies = answer === la.gate_when_answer
            return (
              <div key={la.id} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
                  {la.gate_question}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' as const }}>
                  <button
                    style={answer === 'yes' ? btnSelected : btnUnselected}
                    onClick={() => setAddonAnswers(p => ({ ...p, [la.id]: 'yes' }))}>
                    Yes
                  </button>
                  <button
                    style={answer === 'no' ? btnSelected : btnUnselected}
                    onClick={() => setAddonAnswers(p => ({ ...p, [la.id]: 'no' }))}>
                    No
                  </button>
                  {answer !== undefined && addonApplies && (
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: 7, padding: '3px 10px' }}>
                      + {la.design_addons.name} — <strong>₦{Number(la.design_addons.price).toLocaleString()}</strong>
                    </span>
                  )}
                  {answer !== undefined && !addonApplies && (
                    <span style={{ fontSize: 12, color: '#059669' }}>✓ Not required</span>
                  )}
                </div>
                {la.design_addons.description && (
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                    {la.design_addons.description}
                  </div>
                )}
              </div>
            )
          })}

          {/* Request notes */}
          {(product.design_pricing_type === 'flat' || (product.design_pricing_type === 'dependent' && allAddonAnswered)) && (
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6, color: 'var(--text-secondary)', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>
                Design Notes <span style={{ fontWeight: 400, textTransform: 'none' as const }}>(optional)</span>
              </label>
              <textarea
                value={requestNotes}
                onChange={e => setRequestNotes(e.target.value)}
                placeholder="Describe your design preferences, brand colours, or any specific requirements..."
                className="form-input"
                style={{ minHeight: 72, resize: 'vertical' as const, fontSize: 13 }}
              />
            </div>
          )}

          {/* Running total for this flow */}
          {isFlowComplete() && (
            <div style={{ background: '#fafafa', border: '1px solid var(--border-color)', borderRadius: 9, padding: '12px 14px', marginBottom: 14 }}>
              {product.design_pricing_type === 'unit_based' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  <span>{designUnits} {unitLabel} × ₦{unitRate.toLocaleString()}</span>
                  <span>₦{(unitRate * designUnits).toLocaleString()}</span>
                </div>
              )}
              {product.design_pricing_type === 'dependent' && selectedAddons.map(la => (
                <div key={la.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  <span>{la.design_addons.name}</span>
                  <span>₦{Number(la.design_addons.price).toLocaleString()}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'Montserrat', fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', borderTop: '1px solid var(--border-color)', paddingTop: 8, marginTop: 4 }}>
                <span>Design total</span>
                <span>₦{computeDesignCost().toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confirm button */}
      {hasOwnDesign !== null && (
        <button
          disabled={!isFlowComplete()}
          onClick={handleConfirm}
          style={{
            width: '100%', padding: '11px', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14,
            cursor: isFlowComplete() ? 'pointer' : 'not-allowed',
            background: isFlowComplete() ? '#1A1A1A' : '#e5e7eb',
            color: isFlowComplete() ? 'white' : '#9ca3af',
            border: 'none',
          }}>
          {hasOwnDesign ? 'Continue — upload file after adding to cart' : 'Confirm Design Options'}
        </button>
      )}
    </div>
  )
}
