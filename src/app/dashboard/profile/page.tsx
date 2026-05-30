'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ first_name: '', last_name: '', phone: '' })

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      if (data) { setProfile(data); setForm({ first_name: data.first_name, last_name: data.last_name, phone: data.phone || '' }) }
      setLoading(false)
    }
    load()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { error } = await supabase.from('profiles').update(form).eq('id', session.user.id)
    if (error) { toast.error(error.message) } else { toast.success('Profile updated!') }
    setSaving(false)
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center' as const, color: 'var(--gray)' }}>Loading...</div>

  return (
    <div style={{ maxWidth: 600 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 22, marginBottom: 4 }}>My Profile</h1>
        <p style={{ fontSize: 14, color: 'var(--gray)' }}>Update your personal information.</p>
      </div>

      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 14, padding: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32, paddingBottom: 24, borderBottom: '1px solid var(--border)' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 24, color: 'white' }}>{profile?.first_name?.[0]?.toUpperCase() || 'U'}</span>
          </div>
          <div>
            <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 18 }}>{profile?.first_name} {profile?.last_name}</div>
            <div style={{ fontSize: 13, color: 'var(--gray)' }}>{profile?.email}</div>
            {profile?.role === 'admin' && (
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--red)', fontFamily: 'Montserrat', background: 'var(--red-pale)', padding: '2px 10px', borderRadius: 12, display: 'inline-block', marginTop: 4 }}>ADMIN</span>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }} className="profile-grid">
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--dark)', display: 'block', marginBottom: 6 }}>First name</label>
            <input value={form.first_name} onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))} className="form-input" />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--dark)', display: 'block', marginBottom: 6 }}>Last name</label>
            <input value={form.last_name} onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))} className="form-input" />
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--dark)', display: 'block', marginBottom: 6 }}>Email address</label>
          <input value={profile?.email || ''} disabled className="form-input" style={{ background: 'var(--light)', cursor: 'not-allowed', color: 'var(--gray)' }} />
          <div style={{ fontSize: 12, color: 'var(--gray)', marginTop: 4 }}>Email cannot be changed here.</div>
        </div>
        <div style={{ marginBottom: 28 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--dark)', display: 'block', marginBottom: 6 }}>Phone number</label>
          <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+234 800 000 0000" className="form-input" />
        </div>

        <button onClick={handleSave} disabled={saving}
          style={{ padding: '12px 28px', background: saving ? '#ccc' : 'var(--red)', color: 'white', border: 'none', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer' }}>
          {saving ? 'Saving...' : 'Save Changes →'}
        </button>
      </div>
      <style>{`@media (max-width: 600px) { .profile-grid { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  )
}
