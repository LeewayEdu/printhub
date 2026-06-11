'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, RefreshCw, GripVertical, Check, X, Pencil } from 'lucide-react'
import toast from 'react-hot-toast'
import { invalidateCache } from '@/lib/priceEngineV2'

// Unified categories — matches shop page exactly
const CATEGORIES = [
  'Banners & Large Format', 'Business Cards', 'Flyers & Leaflets',
  'Papers & Stationery', 'Stickers & Labels', 'Branded Apparel',
  'Branded Souvenirs', 'Shirts & Uniforms', 'Signage & Installation',
  'Book Publishing', 'Magazines & Journals', 'Campaign Materials',
  'Graphic Design', 'Frames & Canvas', 'Gift Items',
  'Vehicle Branding', 'Event Materials',
]

const MODIFIER_TYPES = [
  { value: 'base_rate',        label: 'Base rate (starting price)' },
  { value: 'fixed_per_100',    label: 'Fixed per 100 units' },
  { value: 'fixed_per_piece',  label: 'Fixed per piece (blank item cost)' },
  { value: 'print_per_piece',  label: 'Per piece (branding/print cost)' },
  { value: 'per_sqft',         label: 'Per sqft (area-based)' },
  { value: 'per_sqft_extra',   label: 'Per sqft extra (material upgrade)' },
  { value: 'per_page',         label: 'Per page (books/magazines)' },
  { value: 'fixed_per_unit',   label: 'Fixed per unit (binding, cover)' },
  { value: 'fixed_flat',       label: 'Flat fee (one-time per order)' },
  { value: 'percentage',       label: 'Percentage of subtotal' },
]

const inp: React.CSSProperties = {
  padding: '8px 10px', border: '1px solid var(--border-color)', borderRadius: 8,
  fontSize: 13, fontFamily: 'Open Sans', outline: 'none', background: 'white',
  color: 'var(--text-primary)', boxSizing: 'border-box', width: '100%',
}

export default function SpecOptionsPage() {
  const router = useRouter()
  const [tab, setTab] = useState<'specs' | 'tiers'>('specs')
  const [activeCat, setActiveCat] = useState(CATEGORIES[0])
  const [specs, setSpecs] = useState<any[]>([])
  const [tiers, setTiers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [newSpec, setNewSpec] = useState({
    spec_group: '', option_label: '', price_modifier: '0',
    modifier_type: 'base_rate', sort_order: '0', is_default: false,
  })

  const [newTier, setNewTier] = useState({
    min_qty: '', max_qty: '', discount_pct: '0', label: ''
  })

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/auth'); return }
      supabase.from('profiles').select('role').eq('id', session.user.id).single()
        .then(({ data }) => {
          if (!['admin', 'super_admin'].includes(data?.role)) router.push('/dashboard')
        })
    })
  }, [])

  useEffect(() => { load() }, [activeCat, tab])

  const load = async () => {
    setLoading(true)
    if (tab === 'specs') {
      const { data } = await supabase.from('spec_options').select('*')
        .eq('category', activeCat).order('spec_group').order('sort_order')
      setSpecs(data || [])
    } else {
      const { data } = await supabase.from('qty_tiers').select('*')
        .eq('category', activeCat).order('sort_order')
      setTiers(data || [])
    }
    setLoading(false)
  }

  const addSpec = async () => {
    if (!newSpec.spec_group.trim() || !newSpec.option_label.trim()) {
      toast.error('Fill in spec group and option label'); return
    }
    const { error } = await supabase.from('spec_options').insert({
      category: activeCat,
      spec_group: newSpec.spec_group.toLowerCase().replace(/\s+/g, '_'),
      option_label: newSpec.option_label,
      price_modifier: Number(newSpec.price_modifier),
      modifier_type: newSpec.modifier_type,
      sort_order: Number(newSpec.sort_order),
      is_active: true,
      is_default: newSpec.is_default,
    })
    if (error) { toast.error(error.message); return }
    toast.success('Spec option added ✅')
    setNewSpec({ spec_group: '', option_label: '', price_modifier: '0', modifier_type: 'base_rate', sort_order: '0', is_default: false })
    invalidateCache(); load()
  }

  const addTier = async () => {
    if (!newTier.min_qty || !newTier.label) { toast.error('Fill in min qty and label'); return }
    const { error } = await supabase.from('qty_tiers').insert({
      category: activeCat,
      min_qty: Number(newTier.min_qty),
      max_qty: newTier.max_qty ? Number(newTier.max_qty) : null,
      discount_pct: Number(newTier.discount_pct),
      label: newTier.label,
    })
    if (error) { toast.error(error.message); return }
    toast.success('Tier added ✅')
    setNewTier({ min_qty: '', max_qty: '', discount_pct: '0', label: '' })
    invalidateCache(); load()
  }

  const deleteSpec = async (id: string) => {
    if (!confirm('Delete this spec option?')) return
    await supabase.from('spec_options').delete().eq('id', id)
    invalidateCache(); load()
  }

  const deleteTier = async (id: string) => {
    if (!confirm('Delete this tier?')) return
    await supabase.from('qty_tiers').delete().eq('id', id)
    invalidateCache(); load()
  }

  const updateSpec = async (id: string, patch: Record<string, any>) => {
    await supabase.from('spec_options').update(patch).eq('id', id)
    invalidateCache(); load()
  }

  // Group specs by spec_group
  const specsByGroup: Record<string, any[]> = {}
  for (const s of specs) {
    if (!specsByGroup[s.spec_group]) specsByGroup[s.spec_group] = []
    specsByGroup[s.spec_group].push(s)
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap' as const, gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 22, marginBottom: 4 }}>Spec Options & Pricing</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Manage product specifications and quantity discount tiers</p>
        </div>
        <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'var(--light)', border: '1px solid var(--border)', borderRadius: 9, fontSize: 13, fontFamily: 'Montserrat', fontWeight: 600, cursor: 'pointer' }}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, background: 'var(--light)', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {[['specs', 'Spec Options'], ['tiers', 'Qty Discount Tiers']].map(([val, label]) => (
          <button key={val} onClick={() => setTab(val as any)}
            style={{ padding: '7px 18px', borderRadius: 8, border: 'none', fontFamily: 'Montserrat', fontWeight: 600, fontSize: 13, cursor: 'pointer', background: tab === val ? 'white' : 'transparent', color: tab === val ? 'var(--red)' : 'var(--gray)', boxShadow: tab === val ? '0 1px 4px rgba(0,0,0,0.1)' : 'none' }}>
            {label}
          </button>
        ))}
      </div>

      {/* Category tabs */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const, marginBottom: 24 }}>
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setActiveCat(cat)}
            style={{ padding: '5px 12px', borderRadius: 20, border: `1px solid ${activeCat === cat ? 'var(--red)' : 'var(--border)'}`, background: activeCat === cat ? 'rgba(192,57,43,0.08)' : 'white', color: activeCat === cat ? 'var(--red)' : 'var(--gray)', fontSize: 11, fontWeight: activeCat === cat ? 700 : 400, fontFamily: 'Montserrat', cursor: 'pointer', whiteSpace: 'nowrap' as const }}>
            {cat}
          </button>
        ))}
      </div>

      {/* ── SPEC OPTIONS ── */}
      {tab === 'specs' && (
        <div>
          {/* Add form */}
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px', marginBottom: 24 }}>
            <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Add New Spec Option</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr 110px 70px', gap: 10, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray)', display: 'block', marginBottom: 4 }}>Spec Group</label>
                <input value={newSpec.spec_group} onChange={e => setNewSpec(p => ({ ...p, spec_group: e.target.value }))}
                  placeholder="e.g. lamination" style={inp} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray)', display: 'block', marginBottom: 4 }}>Option Label</label>
                <input value={newSpec.option_label} onChange={e => setNewSpec(p => ({ ...p, option_label: e.target.value }))}
                  placeholder="e.g. Matt Lamination" style={inp} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray)', display: 'block', marginBottom: 4 }}>Modifier Type</label>
                <select value={newSpec.modifier_type} onChange={e => setNewSpec(p => ({ ...p, modifier_type: e.target.value }))}
                  style={{ ...inp, cursor: 'pointer' }}>
                  {MODIFIER_TYPES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray)', display: 'block', marginBottom: 4 }}>Price (₦)</label>
                <input type="number" value={newSpec.price_modifier} onChange={e => setNewSpec(p => ({ ...p, price_modifier: e.target.value }))} style={inp} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray)', display: 'block', marginBottom: 4 }}>Order</label>
                <input type="number" value={newSpec.sort_order} onChange={e => setNewSpec(p => ({ ...p, sort_order: e.target.value }))} style={inp} />
              </div>
            </div>
            {/* Default toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 14 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                <input type="checkbox" checked={newSpec.is_default}
                  onChange={e => setNewSpec(p => ({ ...p, is_default: e.target.checked }))}
                  style={{ accentColor: 'var(--red)', width: 15, height: 15 }} />
                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Set as default selection</span>
                <span style={{ fontSize: 11, color: 'var(--gray)' }}>(pre-selected when customer opens product)</span>
              </label>
            </div>
            <button onClick={addSpec}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 20px', background: 'var(--red)', color: 'white', border: 'none', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              <Plus size={14} /> Add Option
            </button>
          </div>

          {/* Existing specs */}
          {loading ? (
            <div style={{ textAlign: 'center' as const, padding: 40, color: 'var(--gray)' }}>Loading...</div>
          ) : Object.keys(specsByGroup).length === 0 ? (
            <div style={{ textAlign: 'center' as const, padding: 40, color: 'var(--gray)' }}>No spec options for this category yet.</div>
          ) : (
            Object.entries(specsByGroup).map(([group, items]) => (
              <div key={group} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, marginBottom: 12, overflow: 'hidden' }}>
                <div style={{ padding: '12px 20px', background: 'var(--light)', borderBottom: '1px solid var(--border)', fontFamily: 'Montserrat', fontWeight: 700, fontSize: 13, textTransform: 'capitalize' as const, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{group.replace(/_/g, ' ')}</span>
                  <span style={{ fontSize: 11, color: 'var(--gray)', fontWeight: 400 }}>{items.length} option{items.length !== 1 ? 's' : ''}</span>
                </div>
                {items.map((item, i) => (
                  <SpecRow key={item.id} item={item} last={i === items.length - 1}
                    onUpdate={(patch) => updateSpec(item.id, patch)}
                    onDelete={() => deleteSpec(item.id)}
                  />
                ))}
              </div>
            ))
          )}
        </div>
      )}

      {/* ── QTY TIERS ── */}
      {tab === 'tiers' && (
        <div>
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px', marginBottom: 24 }}>
            <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Add Discount Tier</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray)', display: 'block', marginBottom: 4 }}>Label</label>
                <input value={newTier.label} onChange={e => setNewTier(p => ({ ...p, label: e.target.value }))}
                  placeholder="e.g. Bulk (500+)" style={inp} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray)', display: 'block', marginBottom: 4 }}>Min Qty</label>
                <input type="number" value={newTier.min_qty} onChange={e => setNewTier(p => ({ ...p, min_qty: e.target.value }))}
                  placeholder="e.g. 500" style={inp} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray)', display: 'block', marginBottom: 4 }}>Max Qty (blank = unlimited)</label>
                <input type="number" value={newTier.max_qty} onChange={e => setNewTier(p => ({ ...p, max_qty: e.target.value }))}
                  placeholder="e.g. 999" style={inp} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray)', display: 'block', marginBottom: 4 }}>Discount %</label>
                <input type="number" value={newTier.discount_pct} onChange={e => setNewTier(p => ({ ...p, discount_pct: e.target.value }))}
                  placeholder="e.g. 10" style={inp} />
              </div>
            </div>
            <button onClick={addTier}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 20px', background: 'var(--red)', color: 'white', border: 'none', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              <Plus size={14} /> Add Tier
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center' as const, padding: 40, color: 'var(--gray)' }}>Loading...</div>
          ) : tiers.length === 0 ? (
            <div style={{ textAlign: 'center' as const, padding: 40, color: 'var(--gray)' }}>No tiers for this category yet.</div>
          ) : (
            <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 60px', padding: '10px 20px', background: 'var(--light)', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>
                <div>Label</div><div>Min Qty</div><div>Max Qty</div><div>Discount</div><div></div>
              </div>
              {tiers.map((tier, i) => (
                <TierRow key={tier.id} tier={tier} last={i === tiers.length - 1}
                  onDelete={() => deleteTier(tier.id)}
                  onUpdate={(patch) => {
                    supabase.from('qty_tiers').update(patch).eq('id', tier.id).then(() => { invalidateCache(); load() })
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── SPEC ROW — with inline edit ───────────────────────────────
function SpecRow({ item, last, onUpdate, onDelete }: {
  item: any
  last: boolean
  onUpdate: (patch: Record<string, any>) => void
  onDelete: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [label, setLabel] = useState(item.option_label)
  const [price, setPrice] = useState(String(Number(item.price_modifier)))
  const [sortOrder, setSortOrder] = useState(String(item.sort_order || 0))
  const [modType, setModType] = useState(item.modifier_type)
  const [isDefault, setIsDefault] = useState(item.is_default || false)

  const save = () => {
    if (!label.trim()) { toast.error('Label cannot be empty'); return }
    onUpdate({
      option_label: label.trim(),
      price_modifier: Number(price),
      sort_order: Number(sortOrder),
      modifier_type: modType,
      is_default: isDefault,
    })
    setEditing(false)
    toast.success('Updated ✅')
  }

  const cancel = () => {
    setLabel(item.option_label)
    setPrice(String(Number(item.price_modifier)))
    setSortOrder(String(item.sort_order || 0))
    setModType(item.modifier_type)
    setIsDefault(item.is_default || false)
    setEditing(false)
  }

  const rowStyle: React.CSSProperties = {
    padding: '11px 16px',
    borderBottom: last ? 'none' : '1px solid var(--border)',
    opacity: item.is_active ? 1 : 0.5,
    background: editing ? '#fffbeb' : 'white',
    transition: 'background 0.2s',
  }

  const miniInp: React.CSSProperties = {
    padding: '5px 8px', border: '1px solid #fbbf24', borderRadius: 7,
    fontSize: 12, fontFamily: 'Open Sans', outline: 'none', background: '#fffbeb',
  }

  if (editing) {
    return (
      <div style={rowStyle}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.2fr 100px 70px auto', gap: 8, alignItems: 'center', marginBottom: 8 }}>
          <input value={label} onChange={e => setLabel(e.target.value)} style={{ ...miniInp, width: '100%' }} placeholder="Option label" />
          <select value={modType} onChange={e => setModType(e.target.value)}
            style={{ ...miniInp, width: '100%', cursor: 'pointer' }}>
            {MODIFIER_TYPES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 11, color: 'var(--gray)' }}>₦</span>
            <input type="number" value={price} onChange={e => setPrice(e.target.value)} style={{ ...miniInp, width: '100%' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 10, color: 'var(--gray)' }}>#</span>
            <input type="number" value={sortOrder} onChange={e => setSortOrder(e.target.value)}
              style={{ ...miniInp, width: '100%' }} placeholder="0" />
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={save}
              style={{ padding: '5px 10px', background: '#10b981', color: 'white', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Check size={12} /> Save
            </button>
            <button onClick={cancel}
              style={{ padding: '5px 10px', background: 'var(--light)', border: '1px solid var(--border)', borderRadius: 7, cursor: 'pointer', fontSize: 12 }}>
              <X size={12} />
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12 }}>
            <input type="checkbox" checked={isDefault} onChange={e => setIsDefault(e.target.checked)}
              style={{ accentColor: 'var(--red)' }} />
            <span style={{ color: 'var(--text-primary)' }}>Default selection</span>
          </label>
          <span style={{ fontSize: 11, color: 'var(--gray)' }}>Pre-selected when customer opens product modal</span>
        </div>
      </div>
    )
  }

  return (
    <div style={rowStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Sort order drag handle visual */}
        <div style={{ color: 'var(--gray)', cursor: 'grab', flexShrink: 0 }}>
          <GripVertical size={14} />
        </div>

        {/* Sort order badge */}
        <div style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'var(--gray)', flexShrink: 0 }}>
          {item.sort_order || 0}
        </div>

        {/* Label + type */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontFamily: 'Montserrat', fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>
              {item.option_label}
            </span>
            {item.is_default && (
              <span style={{ fontSize: 10, fontWeight: 700, background: '#fef3c7', color: '#d97706', padding: '1px 6px', borderRadius: 8, fontFamily: 'Montserrat' }}>
                DEFAULT
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, color: 'var(--gray)' }}>
            {MODIFIER_TYPES.find(m => m.value === item.modifier_type)?.label}
          </div>
        </div>

        {/* Price */}
        <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, color: 'var(--red)', minWidth: 80, textAlign: 'right' as const }}>
          ₦{Number(item.price_modifier).toLocaleString()}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <button onClick={() => onUpdate({ is_active: !item.is_active })}
            style={{ padding: '4px 10px', borderRadius: 20, border: `1px solid ${item.is_active ? '#10b981' : 'var(--border)'}`, background: item.is_active ? '#10b98115' : 'transparent', color: item.is_active ? '#10b981' : 'var(--gray)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'Montserrat' }}>
            {item.is_active ? 'Visible' : 'Hidden'}
          </button>
          <button onClick={() => onUpdate({ is_default: !item.is_default })}
            style={{ padding: '4px 10px', borderRadius: 20, border: `1px solid ${item.is_default ? '#d97706' : 'var(--border)'}`, background: item.is_default ? '#fef3c715' : 'transparent', color: item.is_default ? '#d97706' : 'var(--gray)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'Montserrat' }}>
            {item.is_default ? '★ Default' : 'Set Default'}
          </button>
          <button onClick={() => setEditing(true)}
            style={{ padding: '5px 8px', background: 'none', border: '1px solid var(--border)', borderRadius: 7, cursor: 'pointer', color: '#3b82f6' }}>
            <Pencil size={13} />
          </button>
          <button onClick={onDelete}
            style={{ padding: '5px 8px', background: 'none', border: '1px solid #fca5a5', borderRadius: 7, cursor: 'pointer', color: 'var(--red)' }}>
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── TIER ROW — with inline edit ───────────────────────────────
function TierRow({ tier, last, onDelete, onUpdate }: {
  tier: any
  last: boolean
  onDelete: () => void
  onUpdate: (patch: Record<string, any>) => void
}) {
  const [editing, setEditing] = useState(false)
  const [label, setLabel] = useState(tier.label)
  const [minQty, setMinQty] = useState(String(tier.min_qty))
  const [maxQty, setMaxQty] = useState(tier.max_qty ? String(tier.max_qty) : '')
  const [discPct, setDiscPct] = useState(String(tier.discount_pct))

  const save = () => {
    onUpdate({ label, min_qty: Number(minQty), max_qty: maxQty ? Number(maxQty) : null, discount_pct: Number(discPct) })
    setEditing(false)
    toast.success('Tier updated ✅')
  }

  const miniInp: React.CSSProperties = {
    padding: '5px 8px', border: '1px solid #fbbf24', borderRadius: 7,
    fontSize: 12, fontFamily: 'Open Sans', outline: 'none', background: '#fffbeb',
  }

  if (editing) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 100px', padding: '10px 20px', borderBottom: last ? 'none' : '1px solid var(--border)', alignItems: 'center', gap: 8, background: '#fffbeb' }}>
        <input value={label} onChange={e => setLabel(e.target.value)} style={{ ...miniInp, width: '100%' }} />
        <input type="number" value={minQty} onChange={e => setMinQty(e.target.value)} style={{ ...miniInp, width: '100%' }} />
        <input type="number" value={maxQty} onChange={e => setMaxQty(e.target.value)} placeholder="∞" style={{ ...miniInp, width: '100%' }} />
        <input type="number" value={discPct} onChange={e => setDiscPct(e.target.value)} style={{ ...miniInp, width: '100%' }} />
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={save} style={{ padding: '5px 10px', background: '#10b981', color: 'white', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>Save</button>
          <button onClick={() => setEditing(false)} style={{ padding: '5px 8px', background: 'var(--light)', border: '1px solid var(--border)', borderRadius: 7, cursor: 'pointer', fontSize: 12 }}>✕</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 100px', padding: '13px 20px', borderBottom: last ? 'none' : '1px solid var(--border)', alignItems: 'center' }}>
      <div style={{ fontFamily: 'Montserrat', fontWeight: 600, fontSize: 13 }}>{tier.label}</div>
      <div style={{ fontSize: 13 }}>{Number(tier.min_qty).toLocaleString()}</div>
      <div style={{ fontSize: 13 }}>{tier.max_qty ? Number(tier.max_qty).toLocaleString() : '∞'}</div>
      <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 13, color: '#10b981' }}>{tier.discount_pct}% off</div>
      <div style={{ display: 'flex', gap: 4 }}>
        <button onClick={() => setEditing(true)}
          style={{ padding: '5px 8px', background: 'none', border: '1px solid var(--border)', borderRadius: 7, cursor: 'pointer', color: '#3b82f6' }}>
          <Pencil size={13} />
        </button>
        <button onClick={onDelete}
          style={{ background: 'none', border: '1px solid #fca5a5', borderRadius: 7, padding: '5px 8px', cursor: 'pointer', color: 'var(--red)' }}>
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}