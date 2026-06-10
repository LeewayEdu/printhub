'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Save, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { invalidateCache } from '@/lib/priceEngineV2'

const CATEGORIES = [
  'Banners & Large Format', 'Business Cards', 'Flyers & Leaflets',
  'Stickers & Labels', 'Branded Apparel', 'Shirts & Uniforms',
  'Book Publishing', 'Branded Souvenirs', 'Campaign Materials',
  'Signage & Installation', 'Papers & Stationery',
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

export default function SpecOptionsPage() {
  const router = useRouter()
  const [tab, setTab] = useState<'specs' | 'tiers'>('specs')
  const [activeCat, setActiveCat] = useState(CATEGORIES[0])
  const [specs, setSpecs] = useState<any[]>([])
  const [tiers, setTiers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // New spec form
  const [newSpec, setNewSpec] = useState({
    spec_group: '', option_label: '', price_modifier: '0',
    modifier_type: 'base_rate', sort_order: '0'
  })

  // New tier form
  const [newTier, setNewTier] = useState({
    min_qty: '', max_qty: '', discount_pct: '0', label: ''
  })

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth'); return }
      const { data } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
      if (!['admin', 'super_admin'].includes(data?.role)) { router.push('/dashboard'); return }
    }
    check()
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
      toast.error('Fill in spec group and option label')
      return
    }
    const { error } = await supabase.from('spec_options').insert({
      category: activeCat,
      spec_group: newSpec.spec_group.toLowerCase().replace(/\s+/g, '_'),
      option_label: newSpec.option_label,
      price_modifier: Number(newSpec.price_modifier),
      modifier_type: newSpec.modifier_type,
      sort_order: Number(newSpec.sort_order),
      is_active: true,
    })
    if (error) { toast.error(error.message); return }
    toast.success('Spec option added ✅')
    setNewSpec({ spec_group: '', option_label: '', price_modifier: '0', modifier_type: 'base_rate', sort_order: '0' })
    invalidateCache()
    load()
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
    invalidateCache()
    load()
  }

  const deleteSpec = async (id: string) => {
    if (!confirm('Delete this spec option?')) return
    await supabase.from('spec_options').delete().eq('id', id)
    invalidateCache()
    load()
  }

  const deleteTier = async (id: string) => {
    if (!confirm('Delete this tier?')) return
    await supabase.from('qty_tiers').delete().eq('id', id)
    invalidateCache()
    load()
  }

  const toggleSpec = async (id: string, current: boolean) => {
    await supabase.from('spec_options').update({ is_active: !current }).eq('id', id)
    invalidateCache()
    load()
  }

  const updateSpecPrice = async (id: string, val: string) => {
    await supabase.from('spec_options').update({ price_modifier: Number(val) }).eq('id', id)
    invalidateCache()
    toast.success('Price updated ✅')
    load()
  }

  const inputStyle = {
    padding: '8px 10px', border: '1px solid var(--border-color)', borderRadius: 8,
    fontSize: 13, fontFamily: 'Open Sans', outline: 'none', background: 'white',
    color: 'var(--text-primary)', boxSizing: 'border-box' as const
  }

  // Group specs by spec_group for display
  const specsByGroup: Record<string, any[]> = {}
  for (const s of specs) {
    if (!specsByGroup[s.spec_group]) specsByGroup[s.spec_group] = []
    specsByGroup[s.spec_group].push(s)
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap' as const, gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 22, marginBottom: 4, color: 'var(--text-primary)' }}>
            Spec Options & Pricing
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            Manage product specifications and quantity discount tiers
          </p>
        </div>
        <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'var(--light)', border: '1px solid var(--border)', borderRadius: 9, fontSize: 13, fontFamily: 'Montserrat', fontWeight: 600, cursor: 'pointer' }}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Tab switch */}
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

      {/* ── SPEC OPTIONS TAB ── */}
      {tab === 'specs' && (
        <div>
          {/* Add new spec */}
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px', marginBottom: 24 }}>
            <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Add New Spec Option</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 120px 80px', gap: 10, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray)', display: 'block', marginBottom: 4 }}>Spec Group</label>
                <input value={newSpec.spec_group} onChange={e => setNewSpec(p => ({ ...p, spec_group: e.target.value }))}
                  placeholder="e.g. lamination" style={{ ...inputStyle, width: '100%' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray)', display: 'block', marginBottom: 4 }}>Option Label</label>
                <input value={newSpec.option_label} onChange={e => setNewSpec(p => ({ ...p, option_label: e.target.value }))}
                  placeholder="e.g. Matt Lamination" style={{ ...inputStyle, width: '100%' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray)', display: 'block', marginBottom: 4 }}>Modifier Type</label>
                <select value={newSpec.modifier_type} onChange={e => setNewSpec(p => ({ ...p, modifier_type: e.target.value }))}
                  style={{ ...inputStyle, width: '100%', cursor: 'pointer' }}>
                  {MODIFIER_TYPES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray)', display: 'block', marginBottom: 4 }}>Price (₦)</label>
                <input type="number" value={newSpec.price_modifier} onChange={e => setNewSpec(p => ({ ...p, price_modifier: e.target.value }))}
                  style={{ ...inputStyle, width: '100%' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray)', display: 'block', marginBottom: 4 }}>Order</label>
                <input type="number" value={newSpec.sort_order} onChange={e => setNewSpec(p => ({ ...p, sort_order: e.target.value }))}
                  style={{ ...inputStyle, width: '100%' }} />
              </div>
            </div>
            <button onClick={addSpec}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 20px', background: 'var(--red)', color: 'white', border: 'none', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              <Plus size={14} /> Add Option
            </button>
          </div>

          {/* Existing specs grouped */}
          {loading ? <div style={{ textAlign: 'center' as const, padding: 40, color: 'var(--gray)' }}>Loading...</div> : (
            Object.keys(specsByGroup).length === 0 ? (
              <div style={{ textAlign: 'center' as const, padding: 40, color: 'var(--gray)' }}>No spec options for this category yet.</div>
            ) : (
              Object.entries(specsByGroup).map(([group, items]) => (
                <div key={group} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, marginBottom: 12, overflow: 'hidden' }}>
                  <div style={{ padding: '12px 20px', background: 'var(--light)', borderBottom: '1px solid var(--border)', fontFamily: 'Montserrat', fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', textTransform: 'capitalize' as const }}>
                    {group.replace(/_/g, ' ')}
                  </div>
                  {items.map((item, i) => (
                    <SpecRow key={item.id} item={item} last={i === items.length - 1}
                      onToggle={() => toggleSpec(item.id, item.is_active)}
                      onDelete={() => deleteSpec(item.id)}
                      onPriceUpdate={(val) => updateSpecPrice(item.id, val)}
                    />
                  ))}
                </div>
              ))
            )
          )}
        </div>
      )}

      {/* ── QTY TIERS TAB ── */}
      {tab === 'tiers' && (
        <div>
          {/* Add new tier */}
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px', marginBottom: 24 }}>
            <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Add Discount Tier</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray)', display: 'block', marginBottom: 4 }}>Label</label>
                <input value={newTier.label} onChange={e => setNewTier(p => ({ ...p, label: e.target.value }))}
                  placeholder="e.g. Bulk (500+)" style={{ ...inputStyle, width: '100%' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray)', display: 'block', marginBottom: 4 }}>Min Qty</label>
                <input type="number" value={newTier.min_qty} onChange={e => setNewTier(p => ({ ...p, min_qty: e.target.value }))}
                  placeholder="e.g. 500" style={{ ...inputStyle, width: '100%' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray)', display: 'block', marginBottom: 4 }}>Max Qty (blank = unlimited)</label>
                <input type="number" value={newTier.max_qty} onChange={e => setNewTier(p => ({ ...p, max_qty: e.target.value }))}
                  placeholder="e.g. 999" style={{ ...inputStyle, width: '100%' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray)', display: 'block', marginBottom: 4 }}>Discount %</label>
                <input type="number" value={newTier.discount_pct} onChange={e => setNewTier(p => ({ ...p, discount_pct: e.target.value }))}
                  placeholder="e.g. 10" style={{ ...inputStyle, width: '100%' }} />
              </div>
            </div>
            <button onClick={addTier}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 20px', background: 'var(--red)', color: 'white', border: 'none', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              <Plus size={14} /> Add Tier
            </button>
          </div>

          {/* Existing tiers */}
          {loading ? <div style={{ textAlign: 'center' as const, padding: 40, color: 'var(--gray)' }}>Loading...</div> : (
            tiers.length === 0 ? (
              <div style={{ textAlign: 'center' as const, padding: 40, color: 'var(--gray)' }}>No tiers for this category yet.</div>
            ) : (
              <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 60px', padding: '10px 20px', background: 'var(--light)', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>
                  <div>Label</div><div>Min Qty</div><div>Max Qty</div><div>Discount</div><div></div>
                </div>
                {tiers.map((tier, i) => (
                  <div key={tier.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 60px', padding: '13px 20px', borderBottom: i < tiers.length - 1 ? '1px solid var(--border)' : 'none', alignItems: 'center' }}>
                    <div style={{ fontFamily: 'Montserrat', fontWeight: 600, fontSize: 13 }}>{tier.label}</div>
                    <div style={{ fontSize: 13 }}>{tier.min_qty.toLocaleString()}</div>
                    <div style={{ fontSize: 13 }}>{tier.max_qty ? tier.max_qty.toLocaleString() : '∞'}</div>
                    <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 13, color: '#10b981' }}>{tier.discount_pct}% off</div>
                    <button onClick={() => deleteTier(tier.id)}
                      style={{ background: 'none', border: '1px solid #fca5a5', borderRadius: 7, padding: '5px 8px', cursor: 'pointer', color: 'var(--red)' }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      )}
    </div>
  )
}

function SpecRow({ item, last, onToggle, onDelete, onPriceUpdate }: {
  item: any
  last: boolean
  onToggle: () => void
  onDelete: () => void
  onPriceUpdate: (val: string) => void
}) {
  const [price, setPrice] = useState(String(Number(item.price_modifier)))
  const [editing, setEditing] = useState(false)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 20px', borderBottom: last ? 'none' : '1px solid var(--border)', opacity: item.is_active ? 1 : 0.5 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: 'Montserrat', fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{item.option_label}</div>
        <div style={{ fontSize: 11, color: 'var(--gray)' }}>{MODIFIER_TYPES.find(m => m.value === item.modifier_type)?.label}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 12, color: 'var(--gray)' }}>₦</span>
        <input
          type="number"
          value={price}
          onChange={e => { setPrice(e.target.value); setEditing(true) }}
          onBlur={() => { if (editing) { onPriceUpdate(price); setEditing(false) } }}
          style={{ width: 90, padding: '5px 8px', border: `1px solid ${editing ? '#fbbf24' : 'var(--border)'}`, borderRadius: 7, fontSize: 13, fontFamily: 'Montserrat', fontWeight: 600, outline: 'none', background: editing ? '#fffbeb' : 'white' }}
        />
      </div>
      <button onClick={onToggle}
        style={{ padding: '4px 10px', borderRadius: 20, border: `1px solid ${item.is_active ? '#10b981' : 'var(--border)'}`, background: item.is_active ? '#10b98115' : 'transparent', color: item.is_active ? '#10b981' : 'var(--gray)', fontSize: 11, fontWeight: 600, cursor: 'pointer', flexShrink: 0, fontFamily: 'Montserrat' }}>
        {item.is_active ? 'Visible' : 'Hidden'}
      </button>
      <button onClick={onDelete}
        style={{ background: 'none', border: '1px solid #fca5a5', borderRadius: 7, padding: '5px 8px', cursor: 'pointer', color: 'var(--red)', flexShrink: 0 }}>
        <Trash2 size={13} />
      </button>
    </div>
  )
}