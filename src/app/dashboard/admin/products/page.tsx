'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, X, Upload, LayoutGrid, List, Star, GripVertical, Download, Save, RotateCcw } from 'lucide-react'
import toast from 'react-hot-toast'
import { getCategories, CategoryRow } from '@/lib/categories'

interface ProductForm {
  name: string
  description: string
  category: string
  display_price: number | ''
  is_fixed_price: boolean
  moq: number | ''
  increment: number | ''
  max_qty: number | '' | null
  featured: boolean
  badge: string
  collection: string
  rating: number
  review_count: number
  discount_type: '' | 'percentage' | 'flat'
  discount_value: number | ''
  images: File[]
  existing_images: string[]
}

interface Product {
  id: string
  name: string
  description: string
  category: string
  display_price: number
  price: number
  is_fixed_price: boolean
  pricing_model: string
  area_rate: number
  area_unit: string
  moq: number
  increment: number
  max_qty: number | null
  featured: boolean
  badge: string
  collection: string
  rating: number
  review_count: number
  discount_type: string | null
  discount_value: number | null
  images: string[]
  image_url: string
  is_active: boolean
  created_at: string
  sort_order: number | null
}

// Fallback categories — replaced by dynamic fetch from `categories` table on mount
const FALLBACK_CATEGORIES = [
  'Banners & Large Format', 'Business Cards', 'Flyers & Leaflets', 'Papers & Stationery',
  'Stickers & Labels', 'Branded Apparel', 'Branded Souvenirs', 'Shirts & Uniforms',
  'Signage & Installation', 'Book Publishing', 'Magazines & Journals', 'Campaign Materials',
  'Graphic Design', 'Frames & Canvas', 'Gift Items', 'Vehicle Branding', 'Event Materials',
]

const COLLECTIONS = [
  { value: '', label: 'No collection' },
  { value: 'starter-kits', label: 'Starter Kits page' },
  { value: 'election-campaign', label: 'Election Campaign page' },
]

const emptyForm: ProductForm = {
  name: '', description: '', category: '',
  display_price: '',
  is_fixed_price: false,
  moq: '', increment: '', max_qty: '',
  featured: false, badge: '', collection: '',
  rating: 0, review_count: 0,
  discount_type: '', discount_value: '',
  images: [], existing_images: [],
}

const sectionStyle = {
  background: '#ffffff',
  border: '1px solid #e8e8e5',
  borderRadius: 12,
  padding: 20,
  marginBottom: 16,
}

const sectionTitle = {
  fontFamily: 'Montserrat',
  fontWeight: 700,
  fontSize: 14,
  color: '#1A1A1A',
  marginBottom: 16,
  paddingBottom: 10,
  borderBottom: '1px solid #e8e8e5',
}

const labelStyle = {
  fontSize: 12,
  fontWeight: 600,
  display: 'block',
  marginBottom: 6,
  color: '#444',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.06em',
}

const inputStyle = {
  width: '100%',
  padding: '9px 12px',
  border: '1px solid #d0d0d0',
  borderRadius: 8,
  fontSize: 13,
  fontFamily: 'Open Sans',
  background: '#ffffff',
  color: '#1A1A1A',
  outline: 'none',
  boxSizing: 'border-box' as const,
}

const miniInp: React.CSSProperties = {
  padding: '6px 8px',
  border: '1px solid #fbbf24',
  borderRadius: 7,
  fontSize: 12,
  fontFamily: 'Open Sans',
  outline: 'none',
  background: '#fffbeb',
  color: '#1A1A1A',
  width: '100%',
  boxSizing: 'border-box' as const,
}

type ViewMode = 'grid' | 'list'
type SortKey = 'custom' | 'name' | 'price_asc' | 'price_desc' | 'category' | 'newest' | 'featured'
const VIEW_MODE_KEY = 'printhub_admin_products_view'
const SORT_KEY_STORAGE = 'printhub_admin_products_sort'

// CSV export helper — escapes commas/quotes/newlines
function toCsvValue(val: any): string {
  if (val === null || val === undefined) return ''
  const str = Array.isArray(val) ? val.join('|') : String(val)
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`
  return str
}

export default function AdminProductsPage() {
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState<ProductForm>(emptyForm)
  const [search, setSearch] = useState('')
  const [selectedCat, setSelectedCat] = useState('All')
  const [categories, setCategories] = useState<string[]>(FALLBACK_CATEGORIES)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [sortKey, setSortKey] = useState<SortKey>('custom')
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  // ── Inline list-edit batch state (mirrors Spec Options pattern) ──
  const [pending, setPending] = useState<Record<string, Record<string, any>>>({})
  const [savingInline, setSavingInline] = useState(false)

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth'); return }
      const { data } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
      if (!['admin','super_admin'].includes(data?.role)) { router.push('/dashboard'); return }
      setIsAdmin(true)
      fetchProducts()
    }
    check()
    // Dynamic categories — shared with Spec Options admin
    getCategories().then(cats => {
      if (cats?.length) setCategories(cats.map(c => c.label))
    })
    // Restore preferred view mode + sort
    if (typeof window !== 'undefined') {
      const savedView = window.localStorage.getItem(VIEW_MODE_KEY)
      if (savedView === 'grid' || savedView === 'list') setViewMode(savedView)
      const savedSort = window.localStorage.getItem(SORT_KEY_STORAGE) as SortKey | null
      if (savedSort) setSortKey(savedSort)
    }
  }, [])

  const changeViewMode = (mode: ViewMode) => {
    if (Object.keys(pending).length > 0 && !confirm('You have unsaved inline edits. Switch view and discard them?')) return
    setPending({})
    setViewMode(mode)
    if (typeof window !== 'undefined') window.localStorage.setItem(VIEW_MODE_KEY, mode)
  }

  const changeSortKey = (key: SortKey) => {
    setSortKey(key)
    if (typeof window !== 'undefined') window.localStorage.setItem(SORT_KEY_STORAGE, key)
  }

  const fetchProducts = async () => {
    setIsLoading(true)
    const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false })
    if (data) setProducts(data as Product[])
    setIsLoading(false)
  }

  const openAdd = () => { setEditing(null); setForm(emptyForm); setShowModal(true) }

  const openEdit = (p: Product) => {
    setEditing(p)
    setForm({
      name: p.name || '', description: p.description || '', category: p.category || '',
      display_price: p.display_price || p.price || '',
      is_fixed_price: p.is_fixed_price || false,
      moq: p.moq || '', increment: p.increment || '',
      max_qty: p.max_qty || '',
      featured: p.featured || false, badge: p.badge || '', collection: p.collection || '',
      discount_type: (p.discount_type as any) || '', discount_value: p.discount_value || '',
      rating: Number(p.rating) || 0, review_count: Number(p.review_count) || 0,
      images: [], existing_images: p.images || (p.image_url ? [p.image_url] : []),
    })
    setShowModal(true)
  }

  const uploadImages = async (files: File[]): Promise<string[]> => {
    const urls: string[] = []
    for (const file of files) {
      const filePath = `${crypto.randomUUID()}-${file.name}`
      const { error } = await supabase.storage.from('products').upload(filePath, file)
      if (!error) {
        const { data } = supabase.storage.from('products').getPublicUrl(filePath)
        urls.push(data.publicUrl)
      }
    }
    return urls
  }

  const handleSave = async () => {
    if (!form.name) { toast.error('Product name is required'); return }
    if (!form.category) { toast.error('Category is required'); return }
    if (!form.display_price && !form.is_fixed_price) { toast.error('Display price is required'); return }
    setIsLoading(true)
    const newImageUrls = form.images.length > 0 ? await uploadImages(form.images) : []
    const allImages = [...form.existing_images, ...newImageUrls]
    const payload: Record<string, any> = {
      name: form.name,
      description: form.description,
      category: form.category,
      display_price: Number(form.display_price) || 0,
      price: Number(form.display_price) || 0, // keep price in sync for backwards compat
      is_fixed_price: form.is_fixed_price,
      pricing_model: form.is_fixed_price ? 'fixed' : 'unit', // backwards compat
      moq: Number(form.moq) || 1,
      increment: Number(form.increment) || 1,
      max_qty: form.max_qty ? Number(form.max_qty) : null,
      featured: form.featured,
      badge: form.badge || null,
      collection: form.collection || null,
      rating: Number(form.rating) || 0,
      review_count: Number(form.review_count) || 0,
      discount_type: form.discount_type || null,
      discount_value: form.discount_value ? Number(form.discount_value) : null,
      images: allImages,
      image_url: allImages[0] || null,
      is_active: true,
    }
    let savedId = editing?.id
    if (editing) {
      const { error } = await supabase.from('products').update(payload).eq('id', editing.id)
      if (error) { toast.error(error.message); setIsLoading(false); return }
      toast.success('Product updated!')
    } else {
      // New products go to the end of the custom order
      const maxSort = products.reduce((max, p) => Math.max(max, p.sort_order ?? 0), 0)
      payload.sort_order = maxSort + 1
      const { data, error } = await supabase.from('products').insert(payload).select().single()
      if (error) { toast.error(error.message); setIsLoading(false); return }
      savedId = data.id
      toast.success('Product added!')
    }
    if (form.collection && savedId) {
      const { data: col } = await supabase.from('collections').select('id').eq('slug', form.collection).single()
      if (col) await supabase.from('collection_products').upsert({ collection_id: col.id, product_id: savedId, sort_order: 0 })
    }
    setShowModal(false); fetchProducts(); setIsLoading(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this product?')) return
    await supabase.from('products').delete().eq('id', id)
    toast.success('Deleted'); fetchProducts()
  }

  const setF = <K extends keyof ProductForm>(key: K, value: ProductForm[K]) => setForm(p => ({ ...p, [key]: value }))

  // Spec options and qty tiers are now managed globally via Admin → Spec Options

  // ── Inline edit helpers ──
  const stage = (id: string, patch: Record<string, any>) => {
    setPending(prev => ({ ...prev, [id]: { ...(prev[id] || {}), ...patch } }))
  }

  const discardInlineChanges = () => {
    setPending({})
    toast('Changes discarded', { icon: '↩️' })
  }

  const saveInlineChanges = async () => {
    const ids = Object.keys(pending)
    if (ids.length === 0) return
    setSavingInline(true)
    let errors = 0
    for (const id of ids) {
      const patch = { ...pending[id] }
      // Keep price/display_price/legacy price column in sync
      if (patch.display_price !== undefined) patch.price = patch.display_price
      const { error } = await supabase.from('products').update(patch).eq('id', id)
      if (error) errors++
    }
    setPending({})
    setSavingInline(false)
    if (errors > 0) toast.error(`${errors} update(s) failed`)
    else toast.success(`Saved ${ids.length} change${ids.length !== 1 ? 's' : ''} ✅`)
    fetchProducts()
  }

  // ── CSV export ──
  const exportCsv = () => {
    const rows = filtered.length > 0 ? filtered : products
    if (rows.length === 0) { toast.error('No products to export'); return }
    const cols: (keyof Product)[] = [
      'name', 'category', 'pricing_model', 'price', 'display_price', 'area_rate', 'area_unit',
      'moq', 'increment', 'max_qty', 'badge', 'featured', 'discount_type', 'discount_value',
      'rating', 'review_count', 'is_active', 'sort_order', 'image_url', 'created_at',
    ]
    const header = cols.join(',')
    const lines = rows.map(p => cols.map(c => toCsvValue((p as any)[c])).join(','))
    const csv = [header, ...lines].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const stamp = new Date().toISOString().slice(0, 10)
    a.href = url
    a.download = `printhub-products-${stamp}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success(`Exported ${rows.length} product${rows.length !== 1 ? 's' : ''}`)
  }

  const filtered = products
    .filter(p => {
      const ms = p.name?.toLowerCase().includes(search.toLowerCase())
      const mc = selectedCat === 'All' || p.category === selectedCat
      return ms && mc
    })
    .sort((a, b) => {
      switch (sortKey) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'price_asc':
          return (Number(a.display_price || a.price) || 0) - (Number(b.display_price || b.price) || 0)
        case 'price_desc':
          return (Number(b.display_price || b.price) || 0) - (Number(a.display_price || a.price) || 0)
        case 'category':
          return a.category.localeCompare(b.category) || a.name.localeCompare(b.name)
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'featured':
          return (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || (a.sort_order ?? 0) - (b.sort_order ?? 0)
        case 'custom':
        default:
          return (a.sort_order ?? 0) - (b.sort_order ?? 0)
      }
    })
    // Apply pending edits for display
    .map(p => pending[p.id] ? { ...p, ...pending[p.id] } : p)

  const priceLabel = (product: Product) =>
    product.pricing_model === 'area'
      ? `₦${Number(product.area_rate).toLocaleString()}/${product.area_unit}`
      : `₦${Number(product.display_price || product.price).toLocaleString()}`

  // Drag-and-drop reorder — only meaningful when sortKey === 'custom'
  const handleDrop = async (draggedId: string, targetId: string) => {
    setDragOverId(null)
    if (draggedId === targetId) return
    if (Object.keys(pending).length > 0) {
      toast.error('Save or discard your unsaved edits before reordering')
      return
    }
    const current = [...filtered]
    const fromIdx = current.findIndex(p => p.id === draggedId)
    const toIdx = current.findIndex(p => p.id === targetId)
    if (fromIdx === -1 || toIdx === -1) return
    const [moved] = current.splice(fromIdx, 1)
    current.splice(toIdx, 0, moved)

    const updates = current.map((p, i) => ({ id: p.id, sort_order: i }))

    // Optimistic local update
    setProducts(prev => prev.map(p => {
      const u = updates.find(x => x.id === p.id)
      return u ? { ...p, sort_order: u.sort_order } : p
    }))

    // Persist
    const results = await Promise.all(
      updates.map(u => supabase.from('products').update({ sort_order: u.sort_order }).eq('id', u.id))
    )
    if (results.some(r => r.error)) {
      toast.error('Some items failed to reorder — refreshing')
      fetchProducts()
    }
  }

  const pendingCount = Object.keys(pending).length

  if (!isAdmin) return null

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap' as const, gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 22, marginBottom: 4, color: 'var(--text-primary)' }}>Products</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{products.length} products in store</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={exportCsv} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            <Download size={16} /> Export CSV
          </button>
          <button onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: 'var(--red)', color: 'white', border: 'none', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            <Plus size={16} /> Add Product
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' as const, alignItems: 'center' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..." className="form-input" style={{ maxWidth: 280 }} />
        <select value={selectedCat} onChange={e => setSelectedCat(e.target.value)} className="form-input" style={{ maxWidth: 220, cursor: 'pointer' }}>
          <option value="All">All Categories</option>
          {categories.map(c => <option key={c}>{c}</option>)}
        </select>

        <select value={sortKey} onChange={e => changeSortKey(e.target.value as SortKey)} className="form-input" style={{ maxWidth: 200, cursor: 'pointer' }}>
          <option value="custom">My Order (drag to sort)</option>
          <option value="name">Name (A–Z)</option>
          <option value="price_asc">Price (Low → High)</option>
          <option value="price_desc">Price (High → Low)</option>
          <option value="category">Category</option>
          <option value="newest">Newest First</option>
          <option value="featured">Featured First</option>
        </select>

        {/* View mode toggle */}
        <div style={{ display: 'flex', marginLeft: 'auto', border: '1px solid var(--border-color)', borderRadius: 9, overflow: 'hidden' }}>
          <button
            onClick={() => changeViewMode('grid')}
            title="Grid view"
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', border: 'none', cursor: 'pointer',
              background: viewMode === 'grid' ? 'var(--red)' : 'var(--bg-card)',
              color: viewMode === 'grid' ? '#fff' : 'var(--text-secondary)',
              fontFamily: 'Montserrat', fontWeight: 600, fontSize: 12,
            }}>
            <LayoutGrid size={14} /> Grid
          </button>
          <button
            onClick={() => changeViewMode('list')}
            title="List view"
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', border: 'none', cursor: 'pointer',
              background: viewMode === 'list' ? 'var(--red)' : 'var(--bg-card)',
              color: viewMode === 'list' ? '#fff' : 'var(--text-secondary)',
              fontFamily: 'Montserrat', fontWeight: 600, fontSize: 12,
              borderLeft: '1px solid var(--border-color)',
            }}>
            <List size={14} /> List
          </button>
        </div>
      </div>

      {sortKey === 'custom' && (
        <div style={{ marginBottom: 16, padding: '8px 14px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 9, fontSize: 12, color: '#1d4ed8' }}>
          {viewMode === 'list'
            ? 'Drag rows by the handle (⠿) to reorder. This order is what customers see in this category.'
            : 'Switch to List view to drag and reorder products. This order is what customers see in this category.'}
        </div>
      )}

      {/* ── INLINE EDIT BATCH SAVE BAR ── */}
      {viewMode === 'list' && pendingCount > 0 && (
        <div style={{ position: 'sticky' as const, top: 8, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fffbeb', border: '1.5px solid #fbbf24', borderRadius: 10, padding: '10px 16px', marginBottom: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#92400e', fontFamily: 'Montserrat' }}>
            {pendingCount} unsaved change{pendingCount !== 1 ? 's' : ''}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={discardInlineChanges}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'white', border: '1px solid #fbbf24', borderRadius: 8, fontSize: 12, fontWeight: 600, fontFamily: 'Montserrat', cursor: 'pointer', color: '#92400e' }}>
              <RotateCcw size={13} /> Discard
            </button>
            <button onClick={saveInlineChanges} disabled={savingInline}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', background: savingInline ? '#a7f3d0' : '#10b981', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, fontFamily: 'Montserrat', cursor: savingInline ? 'not-allowed' : 'pointer', color: 'white' }}>
              <Save size={13} /> {savingInline ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      {isLoading && !showModal ? (
        <div style={{ textAlign: 'center' as const, padding: 60, color: 'var(--text-secondary)' }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center' as const, padding: 60 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📦</div>
          <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 18, marginBottom: 8, color: 'var(--text-primary)' }}>No products yet</div>
          <button onClick={openAdd} style={{ background: 'var(--red)', color: 'white', border: 'none', borderRadius: 9, padding: '10px 24px', fontFamily: 'Montserrat', fontWeight: 700, cursor: 'pointer' }}>Add Product</button>
        </div>
      ) : viewMode === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }} className="products-grid">
          {filtered.map(product => (
            <div key={product.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ aspectRatio: '1 / 1', width: '100%', background: 'var(--bg-secondary)', position: 'relative' as const, overflow: 'hidden' }}>
                {(product.images?.[0] || product.image_url)
                  ? <img src={product.images?.[0] || product.image_url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>🖼️</div>}
                {product.featured && <div style={{ position: 'absolute' as const, top: 8, left: 8, background: 'var(--red)', color: 'white', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, fontFamily: 'Montserrat' }}>FEATURED</div>}
              </div>
              <div style={{ padding: 14 }}>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 3 }}>{product.category}</div>
                <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, marginBottom: 4, color: 'var(--text-primary)' }}>{product.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10 }}>
                  {product.pricing_model === 'area' ? `₦${Number(product.area_rate).toLocaleString()}/${product.area_unit}` : `₦${Number(product.price).toLocaleString()} MOQ`}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => openEdit(product)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontFamily: 'Montserrat', fontWeight: 600, color: 'var(--text-primary)' }}>
                    <Pencil size={13} /> Edit
                  </button>
                  <button onClick={() => handleDelete(product.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 12px', background: 'var(--red-pale)', border: '1px solid var(--red-light)', borderRadius: 8, cursor: 'pointer', color: 'var(--red)' }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* LIST VIEW — inline-editable */
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' as const }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' as const, fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)' }}>
                  {(sortKey === 'custom' ? [''] : []).concat(['', 'Name', 'Category', 'Price (₦)', 'MOQ', 'Badge', 'Featured', 'Active', '']).map((h, i) => (
                    <th key={i} style={{ padding: '10px 14px', textAlign: 'left' as const, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase' as const, letterSpacing: '0.06em', whiteSpace: 'nowrap' as const, borderBottom: '1px solid var(--border-color)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(product => {
                  const isDragOver = dragOverId === product.id
                  const hasPending = !!pending[product.id]
                  const priceVal = product.display_price ?? product.price ?? 0
                  return (
                    <tr
                      key={product.id}
                      draggable={sortKey === 'custom'}
                      onDragStart={e => {
                        e.dataTransfer.setData('text/plain', product.id)
                        e.dataTransfer.effectAllowed = 'move'
                      }}
                      onDragOver={e => {
                        if (sortKey !== 'custom') return
                        e.preventDefault()
                        if (dragOverId !== product.id) setDragOverId(product.id)
                      }}
                      onDragLeave={() => { if (dragOverId === product.id) setDragOverId(null) }}
                      onDrop={e => {
                        if (sortKey !== 'custom') return
                        e.preventDefault()
                        const draggedId = e.dataTransfer.getData('text/plain')
                        handleDrop(draggedId, product.id)
                      }}
                      style={{
                        borderBottom: '1px solid var(--border-color)',
                        cursor: sortKey === 'custom' ? 'grab' : 'default',
                        background: isDragOver ? '#eff6ff' : hasPending ? '#fefce8' : 'transparent',
                        transition: 'background 0.15s',
                      }}
                    >
                      {sortKey === 'custom' && (
                        <td style={{ padding: '10px 6px', width: 28, color: 'var(--text-secondary)', textAlign: 'center' as const }}>
                          <GripVertical size={15} />
                        </td>
                      )}
                      <td style={{ padding: '10px 14px', width: 48 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 8, overflow: 'hidden', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {(product.images?.[0] || product.image_url)
                            ? <img src={product.images?.[0] || product.image_url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <span style={{ fontSize: 16 }}>🖼️</span>}
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px', fontFamily: 'Montserrat', fontWeight: 600, color: 'var(--text-primary)', maxWidth: 280 }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{product.name}</div>
                      </td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' as const }}>{product.category}</td>

                      {/* Price — inline editable (disabled for area pricing, edit via modal) */}
                      <td style={{ padding: '10px 14px', minWidth: 110 }}>
                        {product.pricing_model === 'area' ? (
                          <span style={{ fontFamily: 'Montserrat', fontWeight: 700, color: 'var(--red)', whiteSpace: 'nowrap' as const }}>{priceLabel(product)}</span>
                        ) : (
                          <input
                            type="number"
                            value={priceVal}
                            onChange={e => stage(product.id, { display_price: Number(e.target.value) })}
                            style={hasPending && pending[product.id]?.display_price !== undefined ? miniInp : { ...miniInp, border: '1px solid var(--border-color)', background: 'white' }}
                          />
                        )}
                      </td>

                      {/* MOQ — inline editable */}
                      <td style={{ padding: '10px 14px', minWidth: 110 }}>
                        <input
                          type="number"
                          value={product.moq ?? ''}
                          onChange={e => stage(product.id, { moq: Number(e.target.value) })}
                          style={hasPending && pending[product.id]?.moq !== undefined ? { ...miniInp, width: 90 } : { ...miniInp, width: 90, border: '1px solid var(--border-color)', background: 'white' }}
                        />
                      </td>

                      {/* Badge — inline editable */}
                      <td style={{ padding: '10px 14px', minWidth: 110 }}>
                        <input
                          type="text"
                          value={product.badge ?? ''}
                          placeholder="—"
                          onChange={e => stage(product.id, { badge: e.target.value })}
                          style={hasPending && pending[product.id]?.badge !== undefined ? miniInp : { ...miniInp, border: '1px solid var(--border-color)', background: 'white' }}
                        />
                      </td>

                      {/* Featured — inline toggle */}
                      <td style={{ padding: '10px 14px' }}>
                        <button
                          onClick={() => stage(product.id, { featured: !product.featured })}
                          title={product.featured ? 'Featured — click to unfeature' : 'Click to feature'}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                          <Star size={16} color="var(--red)" fill={product.featured ? 'var(--red)' : 'none'} />
                        </button>
                      </td>

                      {/* Active — inline toggle */}
                      <td style={{ padding: '10px 14px' }}>
                        <button
                          onClick={() => stage(product.id, { is_active: !product.is_active })}
                          style={{
                            padding: '2px 8px', borderRadius: 20, fontWeight: 700, fontSize: 11, border: 'none', cursor: 'pointer',
                            background: product.is_active ? '#d1fae5' : '#fee2e2',
                            color: product.is_active ? '#059669' : '#dc2626',
                          }}>{product.is_active ? 'Active' : 'Inactive'}</button>
                      </td>

                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => openEdit(product)} title="Edit full product" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '7px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 7, cursor: 'pointer', color: 'var(--text-primary)' }}>
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => handleDelete(product.id)} title="Delete" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '7px', background: 'var(--red-pale)', border: '1px solid var(--red-light)', borderRadius: 7, cursor: 'pointer', color: 'var(--red)' }}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL */}
      {showModal && (
        <div style={{ position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '20px', overflowY: 'auto' as const }}>
          <div style={{ background: '#f5f5f3', borderRadius: 16, width: '100%', maxWidth: 700, boxShadow: '0 24px 60px rgba(0,0,0,0.4)', margin: 'auto' }}>

            {/* Header */}
            <div style={{ padding: '20px 24px', background: '#ffffff', borderRadius: '16px 16px 0 0', borderBottom: '1px solid #e8e8e5', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky' as const, top: 0, zIndex: 10 }}>
              <h2 style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 18, color: '#1A1A1A' }}>
                {editing ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}>
                <X size={20} />
              </button>
            </div>

            {/* Body - single scrollable form */}
            <div style={{ padding: 24, maxHeight: '80vh', overflowY: 'auto' as const }}>

              {/* BASIC INFO */}
              <div style={sectionStyle}>
                <div style={sectionTitle}>Basic Information</div>
                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 14 }}>
                  <div>
                    <label style={labelStyle}>Product Name *</label>
                    <input value={form.name} onChange={e => setF('name', e.target.value)} placeholder="e.g. Business Cards" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Description</label>
                    <textarea value={form.description} onChange={e => setF('description', e.target.value)} placeholder="Describe this product..." style={{ ...inputStyle, minHeight: 72, resize: 'vertical' as const }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <label style={labelStyle}>Category *</label>
                      <select value={form.category} onChange={e => setF('category', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                        <option value="">Select category</option>
                        {categories.map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Badge</label>
                      <input value={form.badge} onChange={e => setF('badge', e.target.value)} placeholder="e.g. Best Seller" style={inputStyle} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <label style={labelStyle}>Pin to page</label>
                      <select value={form.collection} onChange={e => setF('collection', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                        {COLLECTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', paddingTop: 24 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                        <input type="checkbox" checked={form.featured} onChange={e => setF('featured', e.target.checked)} style={{ accentColor: '#C0392B', width: 16, height: 16 }} />
                        <span style={{ fontSize: 13, color: '#1A1A1A' }}>Feature on homepage</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* PRICING */}
              <div style={sectionStyle}>
                <div style={sectionTitle}>Pricing</div>
                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 14 }}>

                  {/* Fixed price toggle */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: form.is_fixed_price ? '#fef3c7' : '#f0fdf4', borderRadius: 10, border: `1px solid ${form.is_fixed_price ? '#fbbf24' : '#86efac'}` }}>
                    <input type="checkbox" id="fixed_price" checked={form.is_fixed_price}
                      onChange={e => setF('is_fixed_price', e.target.checked)}
                      style={{ accentColor: '#C0392B', width: 16, height: 16, cursor: 'pointer' }} />
                    <label htmlFor="fixed_price" style={{ cursor: 'pointer' }}>
                      <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 13, color: '#1A1A1A' }}>Fixed Price Item</div>
                      <div style={{ fontSize: 11, color: '#666', marginTop: 1 }}>
                        {form.is_fixed_price
                          ? 'Customer pays a fixed price × quantity. No spec calculator.'
                          : 'Live calculator will show based on category spec options. Recommended.'}
                      </div>
                    </label>
                  </div>

                  {/* Display price */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                    <div>
                      <label style={labelStyle}>
                        {form.is_fixed_price ? 'Price per unit (₦) *' : 'Display price (₦) *'}
                      </label>
                      <input type="number"
                        value={form.display_price}
                        onChange={e => setF('display_price', e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder={form.is_fixed_price ? 'e.g. 75000' : 'e.g. 4500'}
                        style={inputStyle} />
                      <div style={{ fontSize: 10, color: '#888', marginTop: 4 }}>
                        {form.is_fixed_price ? 'Price charged per piece' : 'Shown as "From ₦X" on product card'}
                      </div>
                    </div>
                    <div>
                      <label style={labelStyle}>MOQ (Min order qty)</label>
                      <input type="number"
                        value={form.moq}
                        onChange={e => setF('moq', e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="e.g. 100" style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Increment (qty step)</label>
                      <input type="number"
                        value={form.increment}
                        onChange={e => setF('increment', e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="e.g. 50" style={inputStyle} />
                    </div>
                  </div>

                  <div>
                    <label style={labelStyle}>Max Quantity (blank = no limit)</label>
                    <input type="number"
                      value={form.max_qty || ''}
                      onChange={e => setF('max_qty', e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="e.g. 10000" style={{ ...inputStyle, maxWidth: 200 }} />
                  </div>

                  {/* Info about spec options */}
                  {!form.is_fixed_price && form.category && (
                    <div style={{ padding: '12px 16px', background: '#eff6ff', borderRadius: 10, border: '1px solid #bfdbfe' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#1d4ed8', marginBottom: 4 }}>💡 Live Calculator Active</div>
                      <div style={{ fontSize: 11, color: '#3730a3' }}>
                        Spec options for <strong>{form.category}</strong> are managed in{' '}
                        <a href="/dashboard/admin/spec-options" target="_blank" style={{ color: '#1d4ed8', textDecoration: 'underline' }}>
                          Admin → Spec Options
                        </a>. Add new paper types, laminations, materials and pricing there.
                      </div>
                    </div>
                  )}

                  {/* Discount */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, paddingTop: 4 }}>
                    <div>
                      <label style={labelStyle}>Discount Type</label>
                      <select value={form.discount_type} onChange={e => setF('discount_type', e.target.value as any)} style={{ ...inputStyle, cursor: 'pointer' }}>
                        <option value="">No discount</option>
                        <option value="percentage">Percentage (e.g. 20% OFF)</option>
                        <option value="flat">Flat amount (e.g. ₦2,000 OFF)</option>
                      </select>
                    </div>
                    {form.discount_type && (
                      <div>
                        <label style={labelStyle}>{form.discount_type === 'percentage' ? 'Discount %' : 'Discount Amount (₦)'}</label>
                        <input type="number" value={form.discount_value}
                          onChange={e => setF('discount_value', e.target.value === '' ? '' : Number(e.target.value))}
                          placeholder={form.discount_type === 'percentage' ? 'e.g. 20' : 'e.g. 2000'}
                          style={inputStyle} />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* RATINGS */}
              <div style={sectionStyle}>
                <div style={sectionTitle}>Ratings & Reviews</div>
                <div style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>
                  Add walk-in customer ratings manually. These show as star ratings on the product card.
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={labelStyle}>Average Rating (0–5)</label>
                    <input type="number" min="0" max="5" step="0.1"
                      value={form.rating}
                      onChange={e => setF('rating', Number(e.target.value))}
                      placeholder="e.g. 4.5" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Number of Reviews</label>
                    <input type="number" min="0"
                      value={form.review_count}
                      onChange={e => setF('review_count', Number(e.target.value))}
                      placeholder="e.g. 24" style={inputStyle} />
                  </div>
                </div>
                {form.rating > 0 && (
                  <div style={{ marginTop: 10, fontSize: 12, color: '#666' }}>
                    Preview: {'⭐'.repeat(Math.round(form.rating))} {form.rating}/5 ({form.review_count} reviews)
                  </div>
                )}
              </div>

              {/* IMAGES */}
              <div style={sectionStyle}>
                <div style={sectionTitle}>Product Images</div>
                <div style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>Upload up to 6 images. First image is the main display image.</div>

                {form.existing_images.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#444', marginBottom: 8, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Current images</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                      {form.existing_images.map((url, i) => (
                        <div key={i} style={{ position: 'relative' as const, borderRadius: 8, overflow: 'hidden', border: `2px solid ${i === 0 ? '#C0392B' : '#e8e8e5'}` }}>
                          <img src={url} alt="" style={{ width: '100%', height: 80, objectFit: 'cover', display: 'block' }} />
                          {i === 0 && <div style={{ position: 'absolute' as const, top: 4, left: 4, background: '#C0392B', color: 'white', fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4 }}>MAIN</div>}
                          <button onClick={() => setF('existing_images', form.existing_images.filter((_, idx) => idx !== i))}
                            style={{ position: 'absolute' as const, top: 4, right: 4, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
                            <X size={11} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(form.existing_images.length + form.images.length) < 6 && (
                  <label style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', gap: 8, padding: '24px 16px', border: '2px dashed #d0d0d0', borderRadius: 10, cursor: 'pointer', background: '#fafafa' }}>
                    <Upload size={24} color="#888" />
                    <div style={{ textAlign: 'center' as const }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A', marginBottom: 2 }}>Click to upload images</div>
                      <div style={{ fontSize: 11, color: '#888' }}>PNG, JPG up to 5MB · Max {6 - form.existing_images.length} more</div>
                    </div>
                    <input type="file" accept="image/*" multiple style={{ display: 'none' }}
                      onChange={e => {
                        const files = Array.from(e.target.files || [])
                        const remaining = 6 - form.existing_images.length - form.images.length
                        setF('images', [...form.images, ...files.slice(0, remaining)])
                      }} />
                  </label>
                )}

                {form.images.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#444', marginBottom: 8, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>New uploads</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                      {form.images.map((file, i) => (
                        <div key={i} style={{ position: 'relative' as const, borderRadius: 8, overflow: 'hidden', border: '2px dashed #C0392B' }}>
                          <img src={URL.createObjectURL(file)} alt="" style={{ width: '100%', height: 80, objectFit: 'cover', display: 'block' }} />
                          <button onClick={() => setF('images', form.images.filter((_, idx) => idx !== i))}
                            style={{ position: 'absolute' as const, top: 4, right: 4, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
                            <X size={11} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* Footer */}
            <div style={{ padding: '16px 24px', background: '#ffffff', borderRadius: '0 0 16px 16px', borderTop: '1px solid #e8e8e5', display: 'flex', gap: 10 }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '12px', background: '#f5f5f3', border: '1px solid #e8e8e5', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 600, fontSize: 14, cursor: 'pointer', color: '#444' }}>Cancel</button>
              <button onClick={handleSave} disabled={isLoading} style={{ flex: 2, padding: '12px', background: isLoading ? '#ccc' : '#C0392B', color: 'white', border: 'none', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, cursor: isLoading ? 'not-allowed' : 'pointer' }}>
                {isLoading ? 'Saving...' : editing ? 'Update Product' : 'Add Product'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 900px) { .products-grid { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 480px) { .products-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  )
}