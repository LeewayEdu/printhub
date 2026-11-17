'use client'

import { useEffect, useState } from 'react'
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
  const [hasOwnDesign, setHasOwnDesign] = useState<boolean>(true)
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

  // The answer is reported to the page immediately and on every change, so the
  // price and the "Add to cart" button never wait for a confirm step.
  const designCostNow = computeDesignCost()
  useEffect(() => {
    onResolved({
      hasOwnDesign,
      designCostTotal: designCostNow,
      designAddons: hasOwnDesign ? [] : selectedAddons.map(la => ({
        name: la.design_addons.name,
        price: la.design_addons.price,
      })),
      designUnits: product.design_pricing_type === 'unit_based' ? designUnits : undefined,
      designRequestNotes: requestNotes.trim() || undefined,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasOwnDesign, designCostNow, designUnits, requestNotes, linkedAddons.length, JSON.stringify(addonAnswers)])

  const btnBase: React.CSSProperties = {
    padding: '9px 18px', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 13,
    cursor: 'pointer', border: '2px solid transparent', transition: 'all 0.15s',
  }
  const btnSelected: React.CSSProperties = { ...btnBase, background: 'var(--red)', color: 'white', borderColor: 'var(--red)' }
  const btnUnselected: React.CSSProperties = { ...btnBase, background: 'white', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }

  return (
    <div style={{ border: '1px solid var(--border-color)', borderRadius: 14, padding: '18px 20px', marginBottom: 20, background: 'var(--bg-card)' }}>
      <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', marginBottom: 16 }}>
        Design
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
                <button aria-label="Decrease design quantity"
                  onClick={() => setDesignUnits(u => Math.max(minUnits, u - 1))}
                  disabled={designUnits <= minUnits}
                  style={{ width: 32, height: 32, borderRadius: 7, border: '1px solid var(--border-color)', background: '#f7f7f5', cursor: designUnits <= minUnits ? 'not-allowed' : 'pointer', fontSize: 16, opacity: designUnits <= minUnits ? 0.4 : 1 }}>
                  −
                </button>
                <input aria-label="Design quantity" type="number" value={designUnits} min={minUnits}
                  onChange={e => setDesignUnits(Math.max(minUnits, Number(e.target.value)))}
                  style={{ width: 64, textAlign: 'center' as const, padding: '6px', border: '1px solid var(--border-color)', borderRadius: 7, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 15 }} />
                <button aria-label="Increase design quantity" onClick={() => setDesignUnits(u => u + 1)}
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
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
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

          {product.design_pricing_type === 'dependent' && linkedAddons.length > 0 && !allAddonAnswered && (
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10 }}>Answer the questions above to include any add-on design fees in the total.</div>
          )}
          {/* Running total for this flow */}
          {(
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

    </div>
  )
}
