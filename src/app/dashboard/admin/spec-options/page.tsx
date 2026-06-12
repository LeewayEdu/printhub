'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, RefreshCw, GripVertical, Check, X, Pencil, Save, RotateCcw, Star } from 'lucide-react'
import toast from 'react-hot-toast'
import { invalidateCache } from '@/lib/priceEngineV2'
import { invalidateCategoriesCache, CategoryRow } from '@/lib/categories'

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

const PRICE_MODELS = [
  { value: 'area',      label: 'Area-based (₦/sqft × width × height)' },
  { value: 'per_100',   label: 'Per 100 units (cards, flyers)' },
  { value: 'per_piece', label: 'Per piece (apparel, souvenirs)' },
  { value: 'per_page',  label: 'Per page (books, magazines)' },
  { value: 'fixed',     label: 'Fixed price (services)' },
  { value: 'unit',      label: 'Unit (no special calc)' },
]

const inp: React.CSSProperties = {
  padding: '8px 10px', border: '1px solid var(--border-color)', borderRadius: 8,
  fontSize: 13, fontFamily: 'Open Sans', outline: 'none', background: 'white',
  color: 'var(--text-primary)', boxSizing: 'border-box', width: '100%',
}

export default function SpecOptionsPage() {
  const router = useRouter()
  const [tab, setTab] = useState<'specs' | 'tiers' | 'categories'>('specs')
  const [categories, setCategories] = useState<CategoryRow[]>([])
  const [activeCat, setActiveCat] = useState('')
  const [specs, setSpecs] = useState<any[]>([])
  const [tiers, setTiers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // ── BATCH SAVE STATE ──────────────────────────────────────
  const [pending, setPending] = useState<Record<string, Record<string, any>>>({})

  const [newSpec, setNewSpec] = useState({
    spec_group: '', option_label: '', price_modifier: '0',
    modifier_type: 'base_rate', sort_order: '0', is_default: false, is_addon: false,
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
    loadCategories()
  }, [])

  const loadCategories = async () => {
    const { data } = await supabase.from('categories').select('*').order('sort_order')
    if (data && data.length) {
      setCategories(data as CategoryRow[])
      if (!activeCat) setActiveCat(data[0].label)
    }
  }

  useEffect(() => { if (activeCat) load() }, [activeCat, tab])

  const load = async () => {
    setLoading(true)
    setPending({}) // discard unsaved changes on category/tab switch
    if (tab === 'specs') {
      const { data } = await supabase.from('spec_options').select('*')
        .eq('category', activeCat).order('spec_group').order('sort_order')
      setSpecs(data || [])
    } else if (tab === 'tiers') {
      const { data } = await supabase.from('qty_tiers').select('*')
        .eq('category', activeCat).order('sort_order')
      setTiers(data || [])
    }
    setLoading(false)
  }

  // ── STAGE A CHANGE (does NOT hit DB) ──────────────────────
  const stage = (id: string, patch: Record<string, any>) => {
    setPending(prev => ({ ...prev, [id]: { ...(prev[id] || {}), ...patch } }))
  }

  const discardChanges = () => {
    setPending({})
    toast('Changes discarded', { icon: '↩️' })
  }

  const saveAllChanges = async () => {
    const ids = Object.keys(pending)
    if (ids.length === 0) return
    setLoading(true)
    let errors = 0
    for (const id of ids) {
      const { error } = await supabase.from('spec_options').update(pending[id]).eq('id', id)
      if (error) errors++
    }
    setPending({})
    invalidateCache()
    if (errors > 0) toast.error(`${errors} update(s) failed`)
    else toast.success(`Saved ${ids.length} change${ids.length !== 1 ? 's' : ''} ✅`)
    load()
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
      is_addon: newSpec.is_addon,
    })
    if (error) { toast.error(error.message); return }
    toast.success('Spec option added ✅')
    setNewSpec({ spec_group: '', option_label: '', price_modifier: '0', modifier_type: 'base_rate', sort_order: '0', is_default: false, is_addon: false })
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
    setPending(prev => { const p = { ...prev }; delete p[id]; return p })
    invalidateCache(); load()
  }

  const deleteTier = async (id: string) => {
    if (!confirm('Delete this tier?')) return
    await supabase.from('qty_tiers').delete().eq('id', id)
    invalidateCache(); load()
  }

  // Group specs by spec_group, applying pending overrides for display
  const displaySpecs = specs.map(s => pending[s.id] ? { ...s, ...pending[s.id] } : s)
  const specsByGroup: Record<string, any[]> = {}
  for (const s of displaySpecs) {
    if (!specsByGroup[s.spec_group]) specsByGroup[s.spec_group] = []
    specsByGroup[s.spec_group].push(s)
  }

  const pendingCount = Object.keys(pending).length

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap' as const, gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 22, marginBottom: 4 }}>Spec Options & Pricing</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Manage product specifications, add-ons, categories and quantity tiers</p>
        </div>
        <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'var(--light)', border: '1px solid var(--border)', borderRadius: 9, fontSize: 13, fontFamily: 'Montserrat', fontWeight: 600, cursor: 'pointer' }}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, background: 'var(--light)', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {[['specs', 'Spec Options'], ['tiers', 'Qty Discount Tiers'], ['categories', 'Categories']].map(([val, label]) => (
          <button key={val} onClick={() => setTab(val as any)}
            style={{ padding: '7px 18px', borderRadius: 8, border: 'none', fontFamily: 'Montserrat', fontWeight: 600, fontSize: 13, cursor: 'pointer', background: tab === val ? 'white' : 'transparent', color: tab === val ? 'var(--red)' : 'var(--gray)', boxShadow: tab === val ? '0 1px 4px rgba(0,0,0,0.1)' : 'none' }}>
            {label}
          </button>
        ))}
      </div>

      {/* Category tabs — hidden on categories tab */}
      {tab !== 'categories' && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const, marginBottom: 16 }}>
          {categories.map(cat => (
            <button key={cat.label} onClick={() => setActiveCat(cat.label)}
              style={{ padding: '5px 12px', borderRadius: 20, border: `1px solid ${activeCat === cat.label ? 'var(--red)' : 'var(--border)'}`, background: activeCat === cat.label ? 'rgba(192,57,43,0.08)' : 'white', color: activeCat === cat.label ? 'var(--red)' : 'var(--gray)', fontSize: 11, fontWeight: activeCat === cat.label ? 700 : 400, fontFamily: 'Montserrat', cursor: 'pointer', whiteSpace: 'nowrap' as const }}>
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>
      )}

      {/* ── BATCH SAVE BAR ── */}
      {tab === 'specs' && pendingCount > 0 && (
        <div style={{ position: 'sticky' as const, top: 8, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fffbeb', border: '1.5px solid #fbbf24', borderRadius: 10, padding: '10px 16px', marginBottom: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#92400e', fontFamily: 'Montserrat' }}>
            {pendingCount} unsaved change{pendingCount !== 1 ? 's' : ''}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={discardChanges}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'white', border: '1px solid #fbbf24', borderRadius: 8, fontSize: 12, fontWeight: 600, fontFamily: 'Montserrat', cursor: 'pointer', color: '#92400e' }}>
              <RotateCcw size={13} /> Discard
            </button>
            <button onClick={saveAllChanges}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', background: '#10b981', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, fontFamily: 'Montserrat', cursor: 'pointer', color: 'white' }}>
              <Save size={13} /> Save Changes
            </button>
          </div>
        </div>
      )}

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
                  placeholder="e.g. lamination / eyelet_addon" style={inp} />
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
            {/* Toggles */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 14, flexWrap: 'wrap' as const }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                <input type="checkbox" checked={newSpec.is_default}
                  onChange={e => setNewSpec(p => ({ ...p, is_default: e.target.checked }))}
                  style={{ accentColor: 'var(--red)', width: 15, height: 15 }} />
                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Set as default selection</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                <input type="checkbox" checked={newSpec.is_addon}
                  onChange={e => setNewSpec(p => ({ ...p, is_addon: e.target.checked }))}
                  style={{ accentColor: '#8b5cf6', width: 15, height: 15 }} />
                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>⭐ Add-on (customer picks quantity, e.g. Eyelets ×4)</span>
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
            Object.entries(specsByGroup).map(([group, items]) => {
              const isAddonGroup = items.some(i => i.is_addon)
              return (
                <div key={group} style={{ background: 'white', border: `1px solid ${isAddonGroup ? '#8b5cf6' : 'var(--border)'}`, borderRadius: 12, marginBottom: 12, overflow: 'hidden' }}>
                  <div style={{ padding: '12px 20px', background: isAddonGroup ? '#f5f3ff' : 'var(--light)', borderBottom: '1px solid var(--border)', fontFamily: 'Montserrat', fontWeight: 700, fontSize: 13, textTransform: 'capitalize' as const, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{isAddonGroup && '⭐ '}{group.replace(/_/g, ' ')}{isAddonGroup && ' (Add-on)'}</span>
                    <span style={{ fontSize: 11, color: 'var(--gray)', fontWeight: 400 }}>{items.length} option{items.length !== 1 ? 's' : ''}</span>
                  </div>
                  {items.map((item, i) => (
                    <SpecRow key={item.id} item={item} last={i === items.length - 1}
                      hasPending={!!pending[item.id]}
                      onStage={(patch) => stage(item.id, patch)}
                      onDelete={() => deleteSpec(item.id)}
                    />
                  ))}
                </div>
              )
            })
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
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 100px', padding: '10px 20px', background: 'var(--light)', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>
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

      {/* ── CATEGORIES ── */}
      {tab === 'categories' && (
        <CategoriesTab categories={categories} onChanged={() => { loadCategories(); invalidateCategoriesCache() }} />
      )}
    </div>
  )
}

// ── CATEGORIES TAB ─────────────────────────────────────────────
function CategoriesTab({ categories, onChanged }: { categories: CategoryRow[]; onChanged: () => void }) {
  const [newCat, setNewCat] = useState({ label: '', icon: '📦', price_model: 'unit', sort_order: '0' })

  const addCategory = async () => {
    if (!newCat.label.trim()) { toast.error('Category name is required'); return }
    const { error } = await supabase.from('categories').insert({
      label: newCat.label.trim(),
      icon: newCat.icon || '📦',
      price_model: newCat.price_model,
      sort_order: Number(newCat.sort_order) || categories.length + 1,
      is_active: true,
    })
    if (error) { toast.error(error.message); return }
    toast.success('Category added ✅')
    setNewCat({ label: '', icon: '📦', price_model: 'unit', sort_order: '0' })
    onChanged()
  }

  const updateCategory = async (id: string, patch: Record<string, any>) => {
    await supabase.from('categories').update(patch).eq('id', id)
    onChanged()
  }

  const deleteCategory = async (id: string, label: string) => {
    if (!confirm(`Delete category "${label}"? Products using this category will keep their category text but it won't appear in dropdowns.`)) return
    await supabase.from('categories').delete().eq('id', id)
    toast.success('Category deleted')
    onChanged()
  }

  return (
    <div>
      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 12, color: '#1d4ed8' }}>
        💡 Categories here are shared between <strong>Spec Options</strong> and <strong>Products</strong>. The <strong>price model</strong> determines how the calculator computes price for products in this category.
      </div>

      {/* Add new category */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px', marginBottom: 24 }}>
        <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Add New Category</div>
        <div style={{ display: 'grid', gridTemplateColumns: '80px 2fr 2fr 100px', gap: 10, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray)', display: 'block', marginBottom: 4 }}>Icon</label>
            <input value={newCat.icon} onChange={e => setNewCat(p => ({ ...p, icon: e.target.value }))} style={inp} placeholder="📦" />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray)', display: 'block', marginBottom: 4 }}>Category Name</label>
            <input value={newCat.label} onChange={e => setNewCat(p => ({ ...p, label: e.target.value }))} style={inp} placeholder="e.g. Embroidery Services" />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray)', display: 'block', marginBottom: 4 }}>Price Model</label>
            <select value={newCat.price_model} onChange={e => setNewCat(p => ({ ...p, price_model: e.target.value }))} style={{ ...inp, cursor: 'pointer' }}>
              {PRICE_MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray)', display: 'block', marginBottom: 4 }}>Order</label>
            <input type="number" value={newCat.sort_order} onChange={e => setNewCat(p => ({ ...p, sort_order: e.target.value }))} style={inp} />
          </div>
        </div>
        <button onClick={addCategory}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 20px', background: 'var(--red)', color: 'white', border: 'none', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
          <Plus size={14} /> Add Category
        </button>
      </div>

      {/* List */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '50px 2fr 2fr 80px 80px 80px', padding: '10px 20px', background: 'var(--light)', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>
          <div>Icon</div><div>Category</div><div>Price Model</div><div>Order</div><div>Active</div><div></div>
        </div>
        {categories.map((cat, i) => (
          <CategoryRowEdit key={cat.id} cat={cat} last={i === categories.length - 1}
            onUpdate={(patch) => updateCategory(cat.id, patch)}
            onDelete={() => deleteCategory(cat.id, cat.label)}
          />
        ))}
      </div>
    </div>
  )
}

function CategoryRowEdit({ cat, last, onUpdate, onDelete }: {
  cat: CategoryRow; last: boolean
  onUpdate: (patch: Record<string, any>) => void
  onDelete: () => void
}) {
  const [icon, setIcon] = useState(cat.icon)
  const [priceModel, setPriceModel] = useState(cat.price_model)
  const [sortOrder, setSortOrder] = useState(String(cat.sort_order))

  const miniInp: React.CSSProperties = {
    padding: '5px 8px', border: '1px solid var(--border)', borderRadius: 7,
    fontSize: 12, fontFamily: 'Open Sans', outline: 'none', background: 'white', width: '100%',
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '50px 2fr 2fr 80px 80px 80px', padding: '10px 20px', borderBottom: last ? 'none' : '1px solid var(--border)', alignItems: 'center', gap: 8 }}>
      <input value={icon} onChange={e => setIcon(e.target.value)} onBlur={() => onUpdate({ icon })} style={{ ...miniInp, textAlign: 'center' as const }} />
      <div style={{ fontFamily: 'Montserrat', fontWeight: 600, fontSize: 13 }}>{cat.label}</div>
      <select value={priceModel} onChange={e => { setPriceModel(e.target.value); onUpdate({ price_model: e.target.value }) }} style={{ ...miniInp, cursor: 'pointer' }}>
        {PRICE_MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
      </select>
      <input type="number" value={sortOrder} onChange={e => setSortOrder(e.target.value)} onBlur={() => onUpdate({ sort_order: Number(sortOrder) })} style={miniInp} />
      <button onClick={() => onUpdate({ is_active: !cat.is_active })}
        style={{ padding: '4px 8px', borderRadius: 20, border: `1px solid ${cat.is_active ? '#10b981' : 'var(--border)'}`, background: cat.is_active ? '#10b98115' : 'transparent', color: cat.is_active ? '#10b981' : 'var(--gray)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'Montserrat' }}>
        {cat.is_active ? 'Yes' : 'No'}
      </button>
      <button onClick={onDelete}
        style={{ background: 'none', border: '1px solid #fca5a5', borderRadius: 7, padding: '5px 8px', cursor: 'pointer', color: 'var(--red)' }}>
        <Trash2 size={13} />
      </button>
    </div>
  )
}

// ── SPEC ROW — stages changes, doesn't save until "Save Changes" ──
function SpecRow({ item, last, hasPending, onStage, onDelete }: {
  item: any
  last: boolean
  hasPending: boolean
  onStage: (patch: Record<string, any>) => void
  onDelete: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [label, setLabel] = useState(item.option_label)
  const [price, setPrice] = useState(String(Number(item.price_modifier)))
  const [sortOrder, setSortOrder] = useState(String(item.sort_order || 0))
  const [modType, setModType] = useState(item.modifier_type)
  const [isDefault, setIsDefault] = useState(item.is_default || false)
  const [isAddon, setIsAddon] = useState(item.is_addon || false)

  // Re-sync local edit fields if item changes (e.g. after discard)
  useEffect(() => {
    setLabel(item.option_label)
    setPrice(String(Number(item.price_modifier)))
    setSortOrder(String(item.sort_order || 0))
    setModType(item.modifier_type)
    setIsDefault(item.is_default || false)
    setIsAddon(item.is_addon || false)
  }, [item.option_label, item.price_modifier, item.sort_order, item.modifier_type, item.is_default, item.is_addon])

  const save = () => {
    if (!label.trim()) { toast.error('Label cannot be empty'); return }
    onStage({
      option_label: label.trim(),
      price_modifier: Number(price),
      sort_order: Number(sortOrder),
      modifier_type: modType,
      is_default: isDefault,
      is_addon: isAddon,
    })
    setEditing(false)
  }

  const cancel = () => {
    setLabel(item.option_label)
    setPrice(String(Number(item.price_modifier)))
    setSortOrder(String(item.sort_order || 0))
    setModType(item.modifier_type)
    setIsDefault(item.is_default || false)
    setIsAddon(item.is_addon || false)
    setEditing(false)
  }

  const rowStyle: React.CSSProperties = {
    padding: '11px 16px',
    borderBottom: last ? 'none' : '1px solid var(--border)',
    opacity: item.is_active ? 1 : 0.5,
    background: editing ? '#fffbeb' : hasPending ? '#fefce8' : 'white',
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
              <Check size={12} /> Stage
            </button>
            <button onClick={cancel}
              style={{ padding: '5px 10px', background: 'var(--light)', border: '1px solid var(--border)', borderRadius: 7, cursor: 'pointer', fontSize: 12 }}>
              <X size={12} />
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' as const }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12 }}>
            <input type="checkbox" checked={isDefault} onChange={e => setIsDefault(e.target.checked)}
              style={{ accentColor: 'var(--red)' }} />
            <span style={{ color: 'var(--text-primary)' }}>Default selection</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12 }}>
            <input type="checkbox" checked={isAddon} onChange={e => setIsAddon(e.target.checked)}
              style={{ accentColor: '#8b5cf6' }} />
            <span style={{ color: 'var(--text-primary)' }}>⭐ Add-on (qty-selectable)</span>
          </label>
        </div>
      </div>
    )
  }

  return (
    <div style={rowStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ color: 'var(--gray)', cursor: 'grab', flexShrink: 0 }}>
          <GripVertical size={14} />
        </div>

        <div style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'var(--gray)', flexShrink: 0 }}>
          {item.sort_order || 0}
        </div>

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
            {item.is_addon && (
              <span style={{ fontSize: 10, fontWeight: 700, background: '#f5f3ff', color: '#8b5cf6', padding: '1px 6px', borderRadius: 8, fontFamily: 'Montserrat' }}>
                ADD-ON
              </span>
            )}
            {hasPending && (
              <span style={{ fontSize: 10, fontWeight: 700, background: '#fef9c3', color: '#a16207', padding: '1px 6px', borderRadius: 8, fontFamily: 'Montserrat' }}>
                UNSAVED
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, color: 'var(--gray)' }}>
            {MODIFIER_TYPES.find(m => m.value === item.modifier_type)?.label}
          </div>
        </div>

        <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, color: 'var(--red)', minWidth: 80, textAlign: 'right' as const }}>
          ₦{Number(item.price_modifier).toLocaleString()}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <button onClick={() => onStage({ is_active: !item.is_active })}
            style={{ padding: '4px 10px', borderRadius: 20, border: `1px solid ${item.is_active ? '#10b981' : 'var(--border)'}`, background: item.is_active ? '#10b98115' : 'transparent', color: item.is_active ? '#10b981' : 'var(--gray)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'Montserrat' }}>
            {item.is_active ? 'Visible' : 'Hidden'}
          </button>
          <button onClick={() => onStage({ is_default: !item.is_default })}
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

// ── TIER ROW — immediate save (less frequent edits) ────────────
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