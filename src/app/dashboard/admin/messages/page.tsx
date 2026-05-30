'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Mail, Phone, Check } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AdminMessagesPage() {
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all')

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth'); return }
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()
      if (data?.role !== 'admin') { router.push('/dashboard'); return }
      setIsAdmin(true)
      fetchMessages()
    }
    check()
  }, [])

  const fetchMessages = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('contact_messages')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setMessages(data)
    setLoading(false)
  }

  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from('contact_messages')
      .update({ is_read: true })
      .eq('id', id)
    if (!error) {
      setMessages(prev => prev.map(m => m.id === id ? { ...m, is_read: true } : m))
      toast.success('Marked as read')
    }
  }

  const filtered = messages.filter(m => {
    if (filter === 'unread') return !m.is_read
    if (filter === 'read') return m.is_read
    return true
  })

  const unreadCount = messages.filter(m => !m.is_read).length

  if (!isAdmin) return null

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap' as const, gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 22, marginBottom: 4, color: 'var(--text-primary)' }}>
            Messages
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            {messages.length} total · {unreadCount} unread
          </p>
        </div>
        <button onClick={fetchMessages}
          style={{ padding: '9px 18px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 600, fontSize: 13, cursor: 'pointer', color: 'var(--text-primary)' }}>
          Refresh
        </button>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {(['all', 'unread', 'read'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: '6px 18px', borderRadius: 20, border: `1px solid ${filter === f ? 'var(--red)' : 'var(--border-color)'}`, background: filter === f ? 'var(--red)' : 'var(--bg-card)', color: filter === f ? 'white' : 'var(--text-secondary)', fontSize: 13, fontWeight: filter === f ? 700 : 400, fontFamily: 'Montserrat', cursor: 'pointer', textTransform: 'capitalize' as const }}>
            {f} {f === 'unread' && unreadCount > 0 ? `(${unreadCount})` : ''}
          </button>
        ))}
      </div>

      {/* Messages list */}
      {loading ? (
        <div style={{ textAlign: 'center' as const, padding: 60, color: 'var(--text-secondary)' }}>Loading messages...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center' as const, padding: 60 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
          <div style={{ fontFamily: 'Montserrat', fontWeight: 600, fontSize: 16, color: 'var(--text-primary)' }}>No messages yet</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
          {filtered.map(msg => (
            <div key={msg.id}
              style={{ background: 'var(--bg-card)', border: `1px solid ${!msg.is_read ? 'var(--red)' : 'var(--border-color)'}`, borderRadius: 14, padding: '20px 24px', position: 'relative' as const }}>

              {/* Unread indicator */}
              {!msg.is_read && (
                <div style={{ position: 'absolute' as const, top: 20, right: 20, width: 8, height: 8, borderRadius: '50%', background: 'var(--red)' }} />
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 20, alignItems: 'start', marginBottom: 16 }} className="msg-grid">
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: 4 }}>From</div>
                  <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>{msg.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{msg.email}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: 4 }}>Phone</div>
                  <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>{msg.phone || '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: 4 }}>Service</div>
                  <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>{msg.service || '—'}</div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' as const }}>
                  {new Date(msg.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </div>

              <div style={{ background: 'var(--bg-secondary)', borderRadius: 9, padding: '12px 16px', fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.7, marginBottom: 16 }}>
                {msg.message}
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' as const }}>
                <a href={`mailto:${msg.email}?subject=Re: Your PrintHub enquiry`}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 13, fontFamily: 'Montserrat', fontWeight: 600, textDecoration: 'none', color: 'var(--text-primary)' }}>
                  <Mail size={14} /> Reply by email
                </a>
                {msg.phone && (
                  <a href={`https://wa.me/${msg.phone.replace(/\D/g, '')}?text=Hello%20${encodeURIComponent(msg.name)}%2C%20thank%20you%20for%20contacting%20PrintHub`}
                    target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#25D36620', border: '1px solid #25D36640', borderRadius: 8, fontSize: 13, fontFamily: 'Montserrat', fontWeight: 600, textDecoration: 'none', color: '#25D366' }}>
                    <Phone size={14} /> WhatsApp
                  </a>
                )}
                {!msg.is_read && (
                  <button onClick={() => markAsRead(msg.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'var(--red-pale)', border: '1px solid var(--red-light)', borderRadius: 8, fontSize: 13, fontFamily: 'Montserrat', fontWeight: 600, cursor: 'pointer', color: 'var(--red)' }}>
                    <Check size={14} /> Mark as read
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <style>{`@media (max-width: 700px) { .msg-grid { grid-template-columns: 1fr 1fr !important; } }`}</style>
    </div>
  )
}