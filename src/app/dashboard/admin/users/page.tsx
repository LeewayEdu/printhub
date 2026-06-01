'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'

export default function AdminUsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth'); return }
      const { data } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
      if (!['admin','super_admin'].includes(data?.role)) { router.push('/dashboard'); return }
      fetchUsers()
    }
    check()
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
    if (data) setUsers(data)
    setLoading(false)
  }

  const filtered = users.filter(u =>
    `${u.first_name} ${u.last_name} ${u.email} ${u.phone}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 22, marginBottom: 4, color: 'var(--text-primary)' }}>Users</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{users.length} registered users</p>
      </div>

      <div style={{ position: 'relative' as const, marginBottom: 20, maxWidth: 360 }}>
        <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email or phone..." className="form-input" style={{ paddingLeft: 36 }} />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center' as const, padding: 60, color: 'var(--text-secondary)' }}>Loading...</div>
      ) : (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 14, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' as const }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
                {['Name', 'Email', 'Phone', 'Role', 'Loyalty Pts', 'Affiliate', 'Joined'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left' as const, fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' as const, letterSpacing: '0.06em', fontFamily: 'Montserrat', whiteSpace: 'nowrap' as const }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(user => (
                <tr key={user.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontFamily: 'Montserrat', fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>
                      {user.first_name} {user.last_name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>#{user.id.slice(0, 8)}</div>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>{user.email}</td>
                  <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>{user.phone || '—'}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ display: 'inline-flex', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, fontFamily: 'Montserrat', background: user.role === 'admin' ? '#C0392B20' : 'var(--bg-secondary)', color: user.role === 'admin' ? '#C0392B' : 'var(--text-secondary)', textTransform: 'uppercase' as const }}>
                      {user.role || 'customer'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', fontFamily: 'Montserrat', fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>
                    {Number(user.loyalty_points || 0).toLocaleString()}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    {user.is_affiliate
                      ? <span style={{ fontSize: 12, color: '#10b981', fontWeight: 600 }}>✓ Yes</span>
                      : <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>No</span>}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' as const }}>
                    {new Date(user.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center' as const, color: 'var(--text-secondary)', fontSize: 14 }}>No users found</div>
          )}
        </div>
      )}
    </div>
  )
}