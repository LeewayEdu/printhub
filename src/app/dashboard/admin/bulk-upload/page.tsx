'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Upload, Download, CheckCircle, XCircle, AlertCircle, Loader, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'

// ── Types ──────────────────────────────────────────────────────
interface ParsedRow {
  rowNum: number
  data: Record<string, any>
  errors: string[]
  warnings: string[]
  action: 'new' | 'update'
}

// ── Constants ──────────────────────────────────────────────────
const VALID_CATEGORIES = [
  'Banners & Large Format', 'Business Cards', 'Papers & Stationery',
  'Stickers & Labels', 'Branded Souvenirs', 'Signage & Installation',
  'Book Publishing', 'Campaign Materials', 'Graphic Design',
  'Shirts & Uniforms', 'Frames & Canvas', 'Gift Items',
  'Vehicle Branding', 'Event Materials',
]

const REQUIRED_COLS = ['name', 'category', 'pricing_model', 'price']

// ── Row parser ─────────────────────────────────────────────────
function parseRow(raw: Record<string, any>, rowNum: number): Omit<ParsedRow, 'action'> {
  const errors: string[] = []
  const warnings: string[] = []

  // Normalise keys — strip ★ and trim
  const r: Record<string, any> = {}
  for (const [k, v] of Object.entries(raw)) {
    const clean = k.replace(/★/g, '').trim().toLowerCase().replace(/\s+/g, '_')
    r[clean] = v
  }

  // Required
  if (!r.name?.toString().trim()) errors.push('name is required')
  if (!r.category?.toString().trim()) errors.push('category is required')
  else if (!VALID_CATEGORIES.includes(r.category.toString().trim())) errors.push(`Invalid category: "${r.category}"`)
  if (!r.pricing_model?.toString().trim()) errors.push('pricing_model is required')
  else if (!['unit', 'area', 'fixed'].includes(r.pricing_model.toString().trim())) errors.push('pricing_model must be unit, area, or fixed')

  const model = r.pricing_model?.toString().trim()
  const price = Number(r.price)
  if (model !== 'area' && (!r.price || isNaN(price))) errors.push('price is required for unit/fixed pricing')
  if (model === 'area' && (!r.area_rate || isNaN(Number(r.area_rate)))) errors.push('area_rate is required for area pricing')

  // Parse qty_tiers JSON
  let qty_tiers = []
  if (r.qty_tiers) {
    try {
      qty_tiers = JSON.parse(r.qty_tiers.toString())
      if (!Array.isArray(qty_tiers)) { warnings.push('qty_tiers must be a JSON array — ignored'); qty_tiers = [] }
    } catch {
      warnings.push('qty_tiers JSON is invalid — ignored')
    }
  }

  // Images — only build if image_urls was actually provided.
  // If left blank (common for bulk re-exports), we leave these keys
  // OUT of the payload entirely so an update doesn't wipe existing images.
  const hasImageUrls = r.image_urls && r.image_urls.toString().trim() !== ''
  let imagePayload: { images?: string[]; image_url?: string | null } = {}
  if (hasImageUrls) {
    const imgs = r.image_urls.toString().split(',').map((u: string) => u.trim()).filter(Boolean)
    imagePayload = { images: imgs, image_url: imgs[0] || null }
  }

  // Build the clean payload
  const data: Record<string, any> = {
    name: r.name?.toString().trim() || '',
    description: r.description?.toString().trim() || null,
    category: r.category?.toString().trim() || '',
    pricing_model: model || 'unit',
    price: model !== 'area' ? Number(r.price) || 0 : 0,
    moq: Number(r.moq) || 1,
    increment: Number(r.increment) || 1,
    max_qty: r.max_qty ? Number(r.max_qty) : null,
    qty_tiers,
    area_rate: model === 'area' ? Number(r.area_rate) || 0 : null,
    area_unit: r.area_unit?.toString().trim() || 'sqft',
    min_width: r.min_width ? Number(r.min_width) : null,
    min_height: r.min_height ? Number(r.min_height) : null,
    badge: r.badge?.toString().trim() || null,
    featured: r.featured?.toString().toUpperCase() === 'TRUE',
    collection: r.collection?.toString().trim() || null,
    discount_type: r.discount_type?.toString().trim() || null,
    discount_value: r.discount_value ? Number(r.discount_value) : null,
    is_active: r.is_active?.toString().toUpperCase() !== 'FALSE',
    spec_groups: [],
    ...imagePayload, // only present if image_urls was filled in
  }

  return { rowNum, data, errors, warnings }
}

// ── Main component ─────────────────────────────────────────────
export default function BulkUploadPage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [parsed, setParsed] = useState<ParsedRow[]>([])
  const [fileName, setFileName] = useState('')
  const [importing, setImporting] = useState(false)
  const [imported, setImported] = useState<{ success: number; updated: number; failed: number } | null>(null)
  const [expandedRow, setExpandedRow] = useState<number | null>(null)
  const [existingNames, setExistingNames] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth'); return }
      const { data } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
      if (!['admin','super_admin'].includes(data?.role)) { router.push('/dashboard'); return }
    }
    check()
  }, [])

  // Fetch existing product names → id map, used for duplicate detection by name
  const loadExistingNames = async (): Promise<Map<string, string>> => {
    const map = new Map<string, string>()
    let from = 0
    const pageSize = 1000
    while (true) {
      const { data, error } = await supabase
        .from('products')
        .select('id, name')
        .range(from, from + pageSize - 1)
      if (error || !data) break
      data.forEach(p => map.set(p.name.trim().toLowerCase(), p.id))
      if (data.length < pageSize) break
      from += pageSize
    }
    setExistingNames(map)
    return map
  }

  const handleFile = (file: File) => {
    if (!file) return
    setFileName(file.name)
    setParsed([])
    setImported(null)

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })

        // Use the "Products" sheet if it exists, else first sheet
        const sheetName = wb.SheetNames.includes('Products') ? 'Products' : wb.SheetNames[0]
        const ws = wb.Sheets[sheetName]
        const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, { defval: '' })

        // Skip rows that are part of the template header (rows 1-8 of template = first 3 rows of JSON output)
        // Detect by checking if "name" or "name ★" column is missing or is a header/example
        const headerKeywords = ['product name', 'notes', 'example', '←', 'ℹ️', '★ = required']
        const dataRows = rows.filter(row => {
          const name = (row['name ★'] || row['name'] || '').toString().toLowerCase().trim()
          return name && !headerKeywords.some(kw => name.includes(kw))
        })

        if (dataRows.length === 0) {
          toast.error('No product rows found. Make sure you are using the correct template and have data from row 10 onwards.')
          return
        }

        // Load existing product names so we can flag new vs update
        const nameMap = await loadExistingNames()

        const result: ParsedRow[] = dataRows.map((row, i) => {
          const parsedRow = parseRow(row, i + 1)
          const key = parsedRow.data.name.trim().toLowerCase()
          const action: 'new' | 'update' = nameMap.has(key) ? 'update' : 'new'
          return { ...parsedRow, action }
        })

        setParsed(result)
        const newCount = result.filter(r => r.action === 'new').length
        const updateCount = result.filter(r => r.action === 'update').length
        toast.success(`Parsed ${result.length} rows — ${newCount} new, ${updateCount} match existing products`)
      } catch (err: any) {
        toast.error('Failed to read file: ' + err.message)
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const handleImport = async () => {
    const valid = parsed.filter(r => r.errors.length === 0)
    if (valid.length === 0) { toast.error('No valid rows to import'); return }

    const newCount = valid.filter(r => r.action === 'new').length
    const updateCount = valid.filter(r => r.action === 'update').length
    if (!confirm(`Import ${valid.length} products — ${newCount} new, ${updateCount} updates to existing products (matched by name)? Rows with errors will be skipped.`)) return

    setImporting(true)
    let success = 0
    let updated = 0
    let failed = 0

    for (const row of valid) {
      try {
        const key = row.data.name.trim().toLowerCase()
        const existingId = existingNames.get(key)
        let product: any = null

        if (existingId) {
          const { data, error } = await supabase
            .from('products')
            .update(row.data)
            .eq('id', existingId)
            .select()
            .single()
          if (error) { failed++; continue }
          product = data
          updated++
        } else {
          const { data, error } = await supabase
            .from('products')
            .insert(row.data)
            .select()
            .single()
          if (error) { failed++; continue }
          product = data
          success++
          // Track newly-inserted product so subsequent duplicate rows in the
          // same file (same name) are treated as updates, not double-inserts.
          existingNames.set(key, product.id)
        }

        // Handle collection linking
        if (row.data.collection && product) {
          const { data: col } = await supabase.from('collections').select('id').eq('slug', row.data.collection).single()
          if (col) await supabase.from('collection_products').upsert({ collection_id: col.id, product_id: product.id, sort_order: 0 })
        }
      } catch { failed++ }
    }

    setImporting(false)
    setImported({ success, updated, failed })
    toast.success(`Import complete: ${success} added, ${updated} updated${failed > 0 ? `, ${failed} failed` : ''}`)
  }

  const validCount = parsed.filter(r => r.errors.length === 0).length
  const errorCount = parsed.filter(r => r.errors.length > 0).length
  const warnCount = parsed.filter(r => r.errors.length === 0 && r.warnings.length > 0).length
  const newCount = parsed.filter(r => r.errors.length === 0 && r.action === 'new').length
  const updateCount = parsed.filter(r => r.errors.length === 0 && r.action === 'update').length

  return (
    <div style={{ maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap' as const, gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 22, marginBottom: 4, color: 'var(--text-primary)' }}>Bulk Product Upload</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 560 }}>
            Upload multiple products at once using the Excel template. Products are matched by <b>name</b> —
            existing products will be updated, new names will be added.
          </p>
        </div>
        <a href="/printhub-product-template.xlsx" download
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: 'var(--black)', color: 'white', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 13, textDecoration: 'none', flexShrink: 0, cursor: 'pointer' }}>
          <Download size={15} /> Download Template
        </a>
      </div>

      {/* Upload zone */}
      <div
        onClick={() => fileRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
        style={{ border: `2px dashed ${parsed.length > 0 ? 'var(--border-color)' : 'var(--red)'}`, borderRadius: 14, padding: '40px 24px', textAlign: 'center' as const, cursor: 'pointer', background: parsed.length > 0 ? 'var(--bg-secondary)' : 'var(--red-pale)', transition: 'all 0.2s', marginBottom: 28 }}>
        <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }} />
        <Upload size={32} color={parsed.length > 0 ? 'var(--text-secondary)' : 'var(--red)'} style={{ margin: '0 auto 12px' }} />
        {fileName ? (
          <div>
            <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', marginBottom: 4 }}>📄 {fileName}</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Click or drag to replace</div>
          </div>
        ) : (
          <div>
            <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 15, color: 'var(--red)', marginBottom: 6 }}>Click to upload or drag & drop your Excel file</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>.xlsx or .xls files only · Use the template above</div>
          </div>
        )}
      </div>

      {/* Summary bar */}
      {parsed.length > 0 && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' as const }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#d1fae5', border: '1px solid #34d399', borderRadius: 9, padding: '10px 16px' }}>
            <CheckCircle size={16} color="#059669" />
            <span style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 13, color: '#065f46' }}>{validCount} ready to import</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#ede9fe', border: '1px solid #c4b5fd', borderRadius: 9, padding: '10px 16px' }}>
            <span style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 13, color: '#6d28d9' }}>{newCount} new</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#dbeafe', border: '1px solid #93c5fd', borderRadius: 9, padding: '10px 16px' }}>
            <span style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 13, color: '#1d4ed8' }}>{updateCount} will update existing</span>
          </div>
          {errorCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fee2e2', border: '1px solid #f87171', borderRadius: 9, padding: '10px 16px' }}>
              <XCircle size={16} color="#dc2626" />
              <span style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 13, color: '#991b1b' }}>{errorCount} rows have errors (will be skipped)</span>
            </div>
          )}
          {warnCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fef9c3', border: '1px solid #fbbf24', borderRadius: 9, padding: '10px 16px' }}>
              <AlertCircle size={16} color="#d97706" />
              <span style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 13, color: '#92400e' }}>{warnCount} rows have warnings (will still import)</span>
            </div>
          )}
          <button onClick={handleImport} disabled={importing || validCount === 0}
            style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px', background: validCount === 0 || importing ? '#ccc' : 'var(--red)', color: 'white', border: 'none', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, cursor: validCount === 0 || importing ? 'not-allowed' : 'pointer', flexShrink: 0 }}>
            {importing ? <><Loader size={15} style={{ animation: 'spin 1s linear infinite' }} /> Importing...</> : `✓ Import ${validCount} Products`}
          </button>
        </div>
      )}

      {/* Import result */}
      {imported && (
        <div style={{ background: '#d1fae5', border: '1px solid #34d399', borderRadius: 12, padding: '20px 24px', marginBottom: 24 }}>
          <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 16, color: '#065f46', marginBottom: 8 }}>
            ✅ Import complete!
          </div>
          <div style={{ fontSize: 14, color: '#065f46' }}>
            {imported.success} new product{imported.success === 1 ? '' : 's'} added · {imported.updated} existing product{imported.updated === 1 ? '' : 's'} updated
            {imported.failed > 0 ? ` · ${imported.failed} failed` : ''}.
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button onClick={() => router.push('/dashboard/admin/products')}
              style={{ padding: '9px 20px', background: '#059669', color: 'white', border: 'none', borderRadius: 8, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              View Products
            </button>
            <button onClick={() => { setParsed([]); setFileName(''); setImported(null) }}
              style={{ padding: '9px 20px', background: 'transparent', color: '#065f46', border: '1px solid #34d399', borderRadius: 8, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              Upload Another File
            </button>
          </div>
        </div>
      )}

      {/* Preview table */}
      {parsed.length > 0 && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
            Preview — {parsed.length} rows parsed
          </div>
          <div style={{ overflowX: 'auto' as const }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' as const, fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)' }}>
                  {['#', 'Status', 'New/Update', 'Name', 'Category', 'Model', 'Price', 'MOQ', 'Badge', 'Featured', 'Issues'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left' as const, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase' as const, letterSpacing: '0.06em', whiteSpace: 'nowrap' as const, borderBottom: '1px solid var(--border-color)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parsed.map((row) => {
                  const hasError = row.errors.length > 0
                  const hasWarn = row.warnings.length > 0
                  const isExpanded = expandedRow === row.rowNum
                  return (
                    <>
                      <tr key={row.rowNum}
                        onClick={() => setExpandedRow(isExpanded ? null : row.rowNum)}
                        style={{ borderBottom: '1px solid var(--border-color)', background: hasError ? '#fff5f5' : hasWarn ? '#fffbeb' : 'var(--bg-card)', cursor: 'pointer' }}>
                        <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>{row.rowNum}</td>
                        <td style={{ padding: '10px 12px' }}>
                          {hasError
                            ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#fee2e2', color: '#dc2626', padding: '2px 8px', borderRadius: 20, fontWeight: 700, fontSize: 11 }}><XCircle size={11} /> Error</span>
                            : hasWarn
                              ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#fef9c3', color: '#d97706', padding: '2px 8px', borderRadius: 20, fontWeight: 700, fontSize: 11 }}><AlertCircle size={11} /> Warning</span>
                              : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#d1fae5', color: '#059669', padding: '2px 8px', borderRadius: 20, fontWeight: 700, fontSize: 11 }}><CheckCircle size={11} /> OK</span>
                          }
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          {row.action === 'update'
                            ? <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '2px 8px', borderRadius: 20, fontWeight: 700, fontSize: 11 }}>Update</span>
                            : <span style={{ background: '#ede9fe', color: '#7c3aed', padding: '2px 8px', borderRadius: 20, fontWeight: 700, fontSize: 11 }}>New</span>}
                        </td>
                        <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-primary)', maxWidth: 200 }}>{row.data.name || <span style={{ color: '#dc2626' }}>MISSING</span>}</td>
                        <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>{row.data.category || '—'}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{row.data.pricing_model || '—'}</span>
                        </td>
                        <td style={{ padding: '10px 12px', fontFamily: 'Montserrat', fontWeight: 700, color: 'var(--red)' }}>
                          {row.data.pricing_model === 'area' ? `₦${Number(row.data.area_rate || 0).toLocaleString()}/sqft` : `₦${Number(row.data.price || 0).toLocaleString()}`}
                        </td>
                        <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>{row.data.moq}</td>
                        <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>{row.data.badge || '—'}</td>
                        <td style={{ padding: '10px 12px' }}>{row.data.featured ? '✓' : ''}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {(row.errors.length > 0 || row.warnings.length > 0) ? (
                              <span style={{ fontSize: 11, color: hasError ? '#dc2626' : '#d97706' }}>
                                {row.errors.length > 0 ? row.errors[0] : row.warnings[0]}
                                {(row.errors.length + row.warnings.length > 1) ? ` +${row.errors.length + row.warnings.length - 1} more` : ''}
                              </span>
                            ) : <span style={{ color: '#059669', fontSize: 11 }}>—</span>}
                            {(row.errors.length + row.warnings.length > 1) && (
                              isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />
                            )}
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (row.errors.length + row.warnings.length > 0) && (
                        <tr key={`${row.rowNum}-expanded`} style={{ background: hasError ? '#fff5f5' : '#fffbeb' }}>
                          <td colSpan={11} style={{ padding: '8px 12px 12px 44px' }}>
                            {row.errors.map((e, i) => (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#dc2626', marginBottom: 4 }}>
                                <XCircle size={12} /> {e}
                              </div>
                            ))}
                            {row.warnings.map((w, i) => (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#d97706', marginBottom: 4 }}>
                                <AlertCircle size={12} /> {w}
                              </div>
                            ))}
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* How it works — shown before any upload */}
      {parsed.length === 0 && !fileName && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 8 }} className="bulk-how-grid">
          {[
            { icon: '📥', title: 'Download Template', desc: 'Get the Excel template above. It includes dropdown validation, example rows, and an instructions sheet.' },
            { icon: '✏️', title: 'Fill in Your Products', desc: 'Add one product per row from row 10 onwards. Required fields are marked with ★. Examples are in rows 5–8.' },
            { icon: '🚀', title: 'Upload & Import', desc: 'Upload the filled file here. Products are matched by name — existing products are updated, new names are added. Preview all rows, check for errors, then click Import.' },
          ].map((step, i) => (
            <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 12, padding: 24 }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>{step.icon}</div>
              <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', marginBottom: 8 }}>{step.title}</div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{step.desc}</p>
            </div>
          ))}
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media (max-width: 700px) { .bulk-how-grid { grid-template-columns: 1fr !important; } }
      ` }} />
    </div>
  )
}