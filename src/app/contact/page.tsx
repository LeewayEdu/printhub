'use client'

import { useState } from 'react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { supabase } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { MapPin, Phone, Mail, Clock, MessageCircle } from 'lucide-react'

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', phone: '', email: '', service: '', message: '' })
  const [sending, setSending] = useState(false)

  const set = (field: string, value: string) => setForm(p => ({ ...p, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    const { error } = await supabase.from('contact_messages').insert(form)
    if (error) {
      toast.error('Failed to send. Please try WhatsApp instead.')
    } else {
      toast.success('Message sent! We will respond within 2 hours.')
      setForm({ name: '', phone: '', email: '', service: '', message: '' })
    }
    setSending(false)
  }

  return (
    <>
      <Navbar />
      <main>
        {/* Hero */}
        <section style={{ background: 'var(--black)', padding: '72px 40px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(192,57,43,0.15) 0%, transparent 50%)' }} />
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
          <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 2 }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)', marginBottom: 12 }}>Contact us</div>
            <h1 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 'clamp(32px, 5vw, 52px)', color: 'white', lineHeight: 1.05, marginBottom: 16 }}>
              Let's talk about<br /><span style={{ color: 'var(--red)' }}>your next project.</span>
            </h1>
            <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', maxWidth: 480, lineHeight: 1.75 }}>
              Whether you have a question, need a quote, or are ready to place an order — we are here Monday to Saturday, 8am–7pm.
            </p>
          </div>
        </section>

        {/* Body */}
        <section style={{ background: 'var(--light)', padding: '72px 40px' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 380px', gap: 48, alignItems: 'start' }} className="contact-grid">

            {/* Form */}
            <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 16, padding: 36 }}>
              <h2 style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 20, marginBottom: 6 }}>Send us a message</h2>
              <p style={{ fontSize: 14, color: 'var(--gray)', marginBottom: 28 }}>We respond within 2 hours during business hours.</p>

              <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }} className="form-row">
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>Your name</label>
                    <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Amaka Johnson" required className="form-input" />
                  </div>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>Phone number</label>
                    <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+234 800 000 0000" className="form-input" />
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>Email address</label>
                  <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@example.com" required className="form-input" />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>What do you need?</label>
                  <select value={form.service} onChange={e => set('service', e.target.value)} className="form-input" style={{ cursor: 'pointer' }}>
                    <option value="">Select a service...</option>
                    <option>Banners & Large Format Printing</option>
                    <option>Business Starter Kit</option>
                    <option>Branded Souvenirs</option>
                    <option>Signage & Installation (FCT)</option>
                    <option>Product Labels & Stickers</option>
                    <option>Book Publishing</option>
                    <option>Election Campaign Materials</option>
                    <option>Graphic Design</option>
                    <option>Affiliate Program</option>
                    <option>Other / General Inquiry</option>
                  </select>
                </div>
                <div style={{ marginBottom: 24 }}>
                  <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>Your message</label>
                  <textarea value={form.message} onChange={e => set('message', e.target.value)} placeholder="Tell us about your project, quantity needed, deadline, etc." required className="form-input" style={{ minHeight: 120, resize: 'vertical' as const }} />
                </div>
                <button type="submit" disabled={sending}
                  style={{ width: '100%', padding: '14px', background: sending ? '#ccc' : 'var(--red)', color: 'white', border: 'none', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 15, cursor: sending ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}>
                  {sending ? 'Sending...' : 'Send Message →'}
                </button>
              </form>
            </div>

            {/* Contact info */}
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 14 }}>
              {/* WhatsApp */}
              <a href="https://wa.me/2348052929523?text=Hello%2C%20I%20want%20to%20discuss%20a%20print%20project"
                target="_blank" rel="noopener noreferrer"
                style={{ background: 'var(--black)', border: '1px solid rgba(37,211,102,0.2)', borderRadius: 14, padding: '20px 24px', display: 'flex', gap: 14, alignItems: 'flex-start', textDecoration: 'none', transition: 'all 0.2s' }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>💬</div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Fastest response</div>
                  <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 15, color: 'white', marginBottom: 2 }}>WhatsApp us directly</div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>+234 805 292 9523</div>
                </div>
              </a>

              {[
                { icon: Phone, label: 'Phone', value: '+234 805 292 9523\n+234 806 375 3209', href: 'tel:+2348052929523' },
                { icon: Mail, label: 'Email', value: 'info@cchumedia.com', href: 'mailto:info@cchumedia.com' },
                { icon: MapPin, label: 'Physical outlet', value: 'Suite 38, Mazfallah Shopping Complex\nKaru, AMAC 900110, Abuja FCT', href: null },
                { icon: Clock, label: 'Opening hours', value: 'Monday – Saturday: 8:00AM – 7:00PM\nSunday: Closed', href: null },
              ].map(({ icon: Icon, label, value, href }) => (
                <div key={label} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--red-pale)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={18} color="var(--red)" />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: 'var(--gray)', marginBottom: 4 }}>{label}</div>
                    {href ? (
                      <a href={href} style={{ fontSize: 14, fontWeight: 500, color: 'var(--dark)', textDecoration: 'none', lineHeight: 1.6, whiteSpace: 'pre-line' as const }}>{value}</a>
                    ) : (
                      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--dark)', lineHeight: 1.6, whiteSpace: 'pre-line' as const }}>{value}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <style>{`
        @media (max-width: 900px) {
          .contact-grid { grid-template-columns: 1fr !important; }
          .form-row { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  )
}