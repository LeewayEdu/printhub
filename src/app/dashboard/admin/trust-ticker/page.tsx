'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, GripVertical, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'

interface TickerItem {
  id: string
  text: string
  emoji: string
  sort_order: number
  is_active: boolean
}

export default function TrustTickerPage() {
  const router = useRouter()
  const [items, setItems] = useState<TickerItem[]>([])
  const [loading, setLoading] = useState(true)
  const [newText, setNewText] = useState('')
  const [newEmoji, setNewEmoji] = useState('✅')
  const [saving, setSaving] = useState(false)
  const [tickerEnabled, setTickerEnabled] = useState(true)

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
      .from('trust_ticker')
      .select('*')
      .order('sort_order')
    if (data) setItems(data)
    setLoading(false)
  }

  const addItem = async () => {
    if (!newText.trim()) { toast.error('Enter ticker text'); return }
    setSaving(true)
    const maxOrder = items.length ? Math.max(...items.map(i => i.sort_order)) : 0
    const { error } = await supabase.from('trust_ticker').insert({
      text: newText.trim(),
      emoji: newEmoji,
      sort_order: maxOrder + 1,
      is_active: true,
    })
    if (error) { toast.error(error.message) } else {
      toast.success('Item added')
      setNewText('')
      setNewEmoji('✅')
      load()
    }
    setSaving(false)
  }

  const toggleItem = async (id: string, current: boolean) => {
    await supabase.from('trust_ticker').update({ is_active: !current }).eq('id', id)
    setItems(prev => prev.map(i => i.id === id ? { ...i, is_active: !current } : i))
  }

  const deleteItem = async (id: string) => {
    if (!confirm('Delete this ticker item?')) return
    await supabase.from('trust_ticker').delete().eq('id', id)
    toast.success('Deleted')
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const updateText = async (id: string, text: string, emoji: string) => {
    await supabase.from('trust_ticker').update({ text, emoji }).eq('id', id)
    toast.success('Updated')
    load()
  }

  const inputStyle = {
    padding: '9px 12px', border: '1px solid var(--border-color)', borderRadius: 8,
    fontSize: 13, fontFamily: 'Open Sans', outline: 'none', background: 'var(--bg-card)',
    color: 'var(--text-primary)', width: '100%', boxSizing: 'border-box' as const
  }

  const activeCount = items.filter(i => i.is_active).length

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap' as const, gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 22, marginBottom: 4, color: 'var(--text-primary)' }}>Trust Ticker</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            {activeCount} active item{activeCount !== 1 ? 's' : ''} scrolling on homepage
          </p>
        </div>

        {/* Preview strip */}
        <div style={{ background: 'var(--red)', borderRadius: 8, padding: '8px 16px', overflow: 'hidden', maxWidth: 400 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)', fontFamily: 'Montserrat', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 4 }}>Live preview</div>
          <div style={{ fontSize: 11, color: 'white', fontFamily: 'Montserrat', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
            {items.filter(i => i.is_active).map(i => `${i.emoji} ${i.text}`).join('  ·  ') || 'No active items'}
          </div>
        </div>
      </div>

      {/* Add new item */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 12, padding: '20px 24px', marginBottom: 24 }}>
        <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, marginBottom: 14, color: 'var(--text-primary)' }}>Add New Item</div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <div style={{ width: 70 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Emoji</label>
            <input value={newEmoji} onChange={e => setNewEmoji(e.target.value)} style={{ ...inputStyle, textAlign: 'center' as const, fontSize: 18 }} maxLength={4} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Text</label>
            <input
              value={newText}
              onChange={e => setNewText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addItem()}
              placeholder="e.g. Same-day delivery available in Abuja"
              style={inputStyle}
            />
          </div>
          <button onClick={addItem} disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: 'var(--red)', color: 'white', border: 'none', borderRadius: 8, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 13, cursor: 'pointer', flexShrink: 0 }}>
            <Plus size={14} /> Add
          </button>
        </div>
      </div>

      {/* Items list */}
      {loading ? (
        <div style={{ textAlign: 'center' as const, padding: 40, color: 'var(--text-secondary)' }}>Loading...</div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center' as const, padding: 40, color: 'var(--text-secondary)' }}>No ticker items yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
          {items.map(item => (
            <ItemRow
              key={item.id}
              item={item}
              onToggle={() => toggleItem(item.id, item.is_active)}
              onDelete={() => deleteItem(item.id)}
              onUpdate={(text, emoji) => updateText(item.id, text, emoji)}
              inputStyle={inputStyle}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ItemRow({ item, onToggle, onDelete, onUpdate, inputStyle }: {
  item: TickerItem
  onToggle: () => void
  onDelete: () => void
  onUpdate: (text: string, emoji: string) => void
  inputStyle: any
}) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(item.text)
  const [emoji, setEmoji] = useState(item.emoji)

  return (
    <div style={{ background: 'var(--bg-card)', border: `1px solid ${item.is_active ? 'var(--border-color)' : '#e5e7eb'}`, borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, opacity: item.is_active ? 1 : 0.5 }}>
      <GripVertical size={16} color="var(--text-secondary)" style={{ flexShrink: 0, cursor: 'grab' }} />

      {editing ? (
        <>
          <input value={emoji} onChange={e => setEmoji(e.target.value)} style={{ ...inputStyle, width: 50, textAlign: 'center' as const, fontSize: 16 }} maxLength={4} />
          <input value={text} onChange={e => setText(e.target.value)} style={{ ...inputStyle, flex: 1 }}
            onKeyDown={e => { if (e.key === 'Enter') { onUpdate(text, emoji); setEditing(false) } if (e.key === 'Escape') setEditing(false) }} />
          <button onClick={() => { onUpdate(text, emoji); setEditing(false) }}
            style={{ padding: '6px 12px', background: 'var(--red)', color: 'white', border: 'none', borderRadius: 7, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 12, cursor: 'pointer', flexShrink: 0 }}>
            Save
          </button>
          <button onClick={() => setEditing(false)}
            style={{ padding: '6px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 7, fontFamily: 'Montserrat', fontWeight: 600, fontSize: 12, cursor: 'pointer', flexShrink: 0 }}>
            Cancel
          </button>
        </>
      ) : (
        <>
          <span style={{ fontSize: 18, flexShrink: 0 }}>{item.emoji}</span>
          <span style={{ flex: 1, fontSize: 13, fontFamily: 'Open Sans', color: 'var(--text-primary)' }}
            onDoubleClick={() => setEditing(true)}>
            {item.text}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'Montserrat', flexShrink: 0 }}>
            double-click to edit
          </span>
        </>
      )}

      <button onClick={onToggle}
        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 20, border: `1px solid ${item.is_active ? '#10b981' : 'var(--border-color)'}`, background: item.is_active ? '#10b98115' : 'transparent', color: item.is_active ? '#10b981' : 'var(--text-secondary)', fontSize: 11, fontWeight: 600, fontFamily: 'Montserrat', cursor: 'pointer', flexShrink: 0 }}>
        {item.is_active ? <><Eye size={11} /> Visible</> : <><EyeOff size={11} /> Hidden</>}
      </button>

      <button onClick={onDelete}
        style={{ background: 'none', border: '1px solid #fca5a5', borderRadius: 7, padding: '5px 8px', cursor: 'pointer', color: 'var(--red)', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
        <Trash2 size={13} />
      </button>
    </div>
  )
}