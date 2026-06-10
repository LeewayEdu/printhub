'use client'

import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Loader } from 'lucide-react'
import { BRAND } from '@/lib/constants'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hi! I am the PrintHub Assistant. How can I help you today? I can answer questions about our products, pricing, and services.' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  // Lead capture state
  const [leadCaptured, setLeadCaptured] = useState(false)
  const [leadName, setLeadName] = useState('')
  const [leadPhone, setLeadPhone] = useState('')
  const [showLeadForm, setShowLeadForm] = useState(false)
  const [leadSaving, setLeadSaving] = useState(false)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    if (!input.trim() || loading) return
    const userMsg: Message = { role: 'user', content: input.trim() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMsg] }),
      })
      const data = await res.json()
      const reply = data.reply || ''
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])

      // After 3 messages from user, offer lead capture if not yet captured
      const userMsgCount = [...messages, userMsg].filter(m => m.role === 'user').length
      if (userMsgCount >= 2 && !leadCaptured) {
        setTimeout(() => {
          setShowLeadForm(true)
        }, 800)
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please chat with us on WhatsApp.' }])
    }
    setLoading(false)
  }

  const saveLead = async () => {
    if (!leadName.trim() && !leadPhone.trim()) { setShowLeadForm(false); setLeadCaptured(true); return }
    setLeadSaving(true)
    try {
      // Save to Supabase leads table
      await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: leadName.trim(),
          phone: leadPhone.trim(),
          source: 'chatbot',
          conversation: messages.map(m => `${m.role}: ${m.content}`).join('\n'),
        })
      })
    } catch (e) { /* non-critical */ }
    setLeadSaving(false)
    setLeadCaptured(true)
    setShowLeadForm(false)
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: `Thanks${leadName ? `, ${leadName}` : ''}! We have your details. Our team will reach out on ${leadPhone || 'WhatsApp'} shortly. You can also continue chatting or click the WhatsApp button below.`
    }])
  }

  return (
    <>
      {/* Chat button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          style={{
            position: 'fixed', bottom: 28, right: 28, zIndex: 998,
            width: 52, height: 52, background: 'var(--red)',
            borderRadius: '50%', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            transition: 'transform 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.1)')}
          onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
          aria-label="Open chat"
        >
         <MessageCircle size={22} color="white" />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 28, right: 28, zIndex: 998,
          width: 340, height: 480,
          background: '#ffffff',
          borderRadius: 16, boxShadow: '0 8px 40px rgba(0,0,0,0.2)',
          border: '1px solid var(--border-color)',
          display: 'flex', flexDirection: 'column' as const,
          animation: 'fadeIn 0.2s ease',
        }}>

          {/* Header */}
          <div style={{ padding: '14px 16px', background: 'var(--black)', borderRadius: '16px 16px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
                <img src="/C-Chu_media_Logo_.png" alt="PrintHub" style={{ width: 36, height: 36, objectFit: 'contain' }} />
                </div>
              <div>
                <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 13, color: 'white' }}>PrintHub Assistant</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Powered by AI</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', padding: 4 }}>
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto' as const, padding: '16px 14px', display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '80%', padding: '10px 14px', borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  background: msg.role === 'user' ? 'var(--red)' : '#f7f7f5',
                  color: msg.role === 'user' ? 'white' : 'var(--text-primary)',
                  fontSize: 13, lineHeight: 1.6,
                  border: msg.role === 'assistant' ? '1px solid var(--border-color)' : 'none',
                }}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ padding: '10px 14px', borderRadius: '14px 14px 14px 4px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', display: 'flex', gap: 6, alignItems: 'center' }}>
                  <Loader size={14} color="var(--text-secondary)" style={{ animation: 'spin 1s linear infinite' }} />
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Typing...</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* WhatsApp suggestion */}
          <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
            <a href={`https://wa.me/${BRAND.whatsapp}?text=Hello%2C%20I%20need%20help%20with%20a%20print%20order`}
              target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '7px', background: '#25D36615', border: '1px solid #25D36630', borderRadius: 8, textDecoration: 'none', fontSize: 12, color: '#25D366', fontWeight: 600, fontFamily: 'Montserrat' }}>
              💬 Continue on WhatsApp instead
            </a>
          </div>

          {/* Lead capture form */}
          {showLeadForm && !leadCaptured && (
            <div style={{ padding: '12px 14px', background: '#fef5f5', borderTop: '1px solid #fde8e8' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--red)', fontFamily: 'Montserrat', marginBottom: 8 }}>
                📋 Leave your details and we'll follow up
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
                <input value={leadName} onChange={e => setLeadName(e.target.value)}
                  placeholder="Your name"
                  style={{ padding: '7px 10px', border: '1px solid #e8e8e5', borderRadius: 7, fontSize: 12, outline: 'none', fontFamily: 'Open Sans' }} />
                <input value={leadPhone} onChange={e => setLeadPhone(e.target.value)}
                  placeholder="WhatsApp / phone number"
                  style={{ padding: '7px 10px', border: '1px solid #e8e8e5', borderRadius: 7, fontSize: 12, outline: 'none', fontFamily: 'Open Sans' }} />
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={saveLead} disabled={leadSaving}
                    style={{ flex: 1, padding: '7px', background: 'var(--red)', color: 'white', border: 'none', borderRadius: 7, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                    {leadSaving ? 'Saving...' : 'Submit'}
                  </button>
                  <button onClick={() => { setShowLeadForm(false); setLeadCaptured(true) }}
                    style={{ padding: '7px 12px', background: 'white', border: '1px solid #e8e8e5', borderRadius: 7, fontSize: 11, cursor: 'pointer', color: '#888' }}>
                    Skip
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Input */}
          <div style={{ padding: '10px 14px 14px', display: 'flex', gap: 8 }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') send() }}
              placeholder="Ask me anything..."
              style={{ flex: 1, padding: '10px 14px', border: '1px solid #e8e8e5', borderRadius: 9, fontSize: 13, fontFamily: 'Open Sans', background: '#ffffff', color: '#1A1A1A', outline: 'none' }}
            />
            <button onClick={send} disabled={loading || !input.trim()}
              style={{ width: 38, height: 38, background: input.trim() ? 'var(--red)' : '#f7f7f5', border: '1px solid var(--border-color)', borderRadius: 9, cursor: input.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Send size={15} color={input.trim() ? 'white' : 'var(--text-secondary)'} />
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </>
  )
}