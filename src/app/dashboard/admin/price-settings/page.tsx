'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { RefreshCw, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { invalidateCache } from '@/lib/priceEngine'

const CATEGORIES = [
  { key: 'flex',         label: '🏷 Flex / Banners' },
  { key: 'businesscard', label: '💳 Business Cards' },
  { key: 'flyer',        label: '📄 Flyers / Leaflets' },
  { key: 'sticker',      label: '🔖 Stickers / Labels' },
  { key: 'backdrop',     label: '🎨 Backdrops / Roll-ups' },
  { key: 'signage',      label: '🪧 Signage' },
  { key: 'apparel',      label: '👕 Apparel / Uniforms' },
  { key: 'book',         label: '📚 Books / Publishing' },
  { key: 'general',      label: '⚙️ General (VAT, Markup)' },
]

export default function PriceSettingsPage() {
  const router = useRouter()
  const [settings, setSettings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [edited, setEdited] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('flex')

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth'); return }
      const { data } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
      if (!['admin', 'super_admin'].includes(data?.role)) { router.push('/dashboard'); return }
      load()
    }
    check()
  }, [])

  const load = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('price_settings')
      .select('*')
      .order('category').order('label')
    if (data) setSettings(data)
    setLoading(false)
  }

  const saveOne = async (id: string, category: string, key: string) => {
    const val = edited[id]
    if (val === undefined) return
    setSaving(id)
    const { error } = await supabase
      .from('price_settings')
      .update({ value: Number(val), updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) { toast.error(error.message) }
    else {
      toast.success('Rate updated ✅')
      setEdited(e => { const n = { ...e }; delete n[id]; return n })
      invalidateCache()
      load()
    }
    setSaving(null)
  }

  const saveAll = async () => {
    const ids = Object.keys(edited)
    if (!ids.length) { toast('No changes to save'); return }
    setSaving('all')
    let errors = 0
    for (const id of ids) {
      const { error } = await supabase
        .from('price_settings')
        .update({ value: Number(edited[id]), updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) errors++
    }
    setSaving(null)
    invalidateCache()
    if (errors) toast.error(`${errors} errors. Others saved.`)
    else { toast.success(`${ids.length} rates saved ✅`); setEdited({}) }
    load()
  }

  const grouped = CATEGORIES.map(cat => ({
    ...cat,
    items: settings.filter(s => s.category === cat.key)
  }))

  const activeItems = grouped.find(g => g.key === activeTab)?.items || []
  const hasChanges = Object.keys(edited).length > 0

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap' as const, gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 22, marginBottom: 4, color: 'var(--text-primary)' }}>Price Settings</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            Update production rates — all quotes and calculator prices update instantly
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'var(--light)', border: '1px solid var(--border)', borderRadius: 9, fontSize: 13, fontFamily: 'Montserrat', fontWeight: 600, cursor: 'pointer' }}>
            <RefreshCw size={13} /> Refresh
          </button>
          {hasChanges && (
            <button onClick={saveAll} disabled={saving === 'all'}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', background: 'var(--red)', color: 'white', border: 'none', borderRadius: 9, fontSize: 13, fontFamily: 'Montserrat', fontWeight: 700, cursor: 'pointer' }}>
              <Save size={13} /> Save All ({Object.keys(edited).length})
            </button>
          )}
        </div>
      </div>

      {/* Category tabs */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const, marginBottom: 24 }}>
        {CATEGORIES.map(cat => (
          <button key={cat.key} onClick={() => setActiveTab(cat.key)}
            style={{ padding: '6px 14px', borderRadius: 20, border: `1px solid ${activeTab === cat.key ? 'var(--red)' : 'var(--border)'}`, background: activeTab === cat.key ? 'rgba(192,57,43,0.08)' : 'white', color: activeTab === cat.key ? 'var(--red)' : 'var(--gray)', fontSize: 12, fontWeight: activeTab === cat.key ? 700 : 400, fontFamily: 'Montserrat', cursor: 'pointer' }}>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Settings table */}
      {loading ? (
        <div style={{ textAlign: 'center' as const, padding: 60, color: 'var(--gray)' }}>Loading...</div>
      ) : activeItems.length === 0 ? (
        <div style={{ textAlign: 'center' as const, padding: 60, color: 'var(--gray)' }}>No settings in this category yet.</div>
      ) : (
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 100px 80px', padding: '10px 20px', background: 'var(--light)', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>
            <div>Setting</div><div>Current Value</div><div>Unit</div><div></div>
          </div>
          {activeItems.map((s, i) => {
            const isEdited = edited[s.id] !== undefined
            const val = isEdited ? edited[s.id] : String(Number(s.value))
            return (
              <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '1fr 160px 100px 80px', padding: '14px 20px', borderBottom: i < activeItems.length - 1 ? '1px solid var(--border)' : 'none', alignItems: 'center', background: isEdited ? '#fffbeb' : 'white', transition: 'background 0.2s' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 2 }}>{s.label}</div>
                  {s.description && <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{s.description}</div>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, color: 'var(--gray)' }}>₦</span>
                  <input
                    type="number"
                    value={val}
                    onChange={e => setEdited(prev => ({ ...prev, [s.id]: e.target.value }))}
                    style={{ width: '100%', padding: '7px 10px', border: `1px solid ${isEdited ? '#fbbf24' : 'var(--border)'}`, borderRadius: 8, fontSize: 14, fontFamily: 'Montserrat', fontWeight: 600, outline: 'none', background: isEdited ? '#fffbeb' : 'white' }}
                  />
                </div>
                <div style={{ fontSize: 12, color: 'var(--gray)' }}>{s.unit}</div>
                <div>
                  {isEdited && (
                    <button onClick={() => saveOne(s.id, s.category, s.key)}
                      disabled={saving === s.id}
                      style={{ padding: '5px 12px', background: '#10b981', color: 'white', border: 'none', borderRadius: 7, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>
                      {saving === s.id ? '...' : 'Save'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}