'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { ShoppingBag, Clock, CheckCircle, TrendingUp } from 'lucide-react'

export default function DashboardPage() {
  const [stats, setStats] = useState({ total: 0, pending: 0, delivered: 0, spent: 0, points: 0 })
  const [recentOrders, setRecentOrders] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const [profileRes, ordersRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', session.user.id).single(),
        supabase.from('orders').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(5),
      ])
      if (profileRes.data) {
        setProfile(profileRes.data)
        setStats(s => ({ ...s, points: profileRes.data.loyalty_points || 0 }))
      }
      if (ordersRes.data) {
        setRecentOrders(ordersRes.data)
        setStats({
  total: ordersRes.data.length,
  pending: ordersRes.data.filter((o: any) => o.status === 'pending').length,
  delivered: ordersRes.data.filter((o: any) => o.status === 'delivered').length,
  spent: ordersRes.data.reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0),
  points: profileRes.data?.loyalty_points || 0,
})
      }
      setLoading(false)
    }
    load()
  }, [])

  const statusColor: Record<string, string> = {
    pending: '#f59e0b', paid: '#3b82f6', processing: '#8b5cf6',
    shipped: '#06b6d4', delivered: '#10b981', cancelled: '#ef4444', refunded: '#6b7280',
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
      <div style={{ fontSize: 14, color: 'var(--gray)' }}>Loading...</div>
    </div>
  )

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 26, color: 'var(--black)', marginBottom: 6 }}>
          Welcome back, {profile?.first_name} 👋
        </h1>
        <p style={{ fontSize: 14, color: 'var(--gray)' }}>Here is what is happening with your PrintHub account.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }} className="stats-grid">
        {[
          { label: 'Total Orders', value: stats.total, icon: ShoppingBag, color: 'var(--red)' },
          { label: 'Pending', value: stats.pending, icon: Clock, color: '#f59e0b' },
          { label: 'Delivered', value: stats.delivered, icon: CheckCircle, color: '#10b981' },
          { label: 'Total Spent', value: `₦${stats.spent.toLocaleString()}`, icon: TrendingUp, color: '#8b5cf6' },
        ].map((stat, i) => (
          <div key={i} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 14, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ fontSize: 13, color: 'var(--gray)' }}>{stat.label}</span>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: `${stat.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <stat.icon size={18} color={stat.color} />
              </div>
            </div>
            <div style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 28, color: 'var(--black)' }}>{stat.value}</div>
          </div>
        ))}
      </div>
      
      {/* Loyalty Points Banner */}
<div style={{ background: 'linear-gradient(135deg, #1A1A1A 0%, #2C2C2C 100%)', borderRadius: 14, padding: '24px 28px', marginBottom: 32, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: 16 }}>
  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
    <div style={{ fontSize: 40 }}>⭐</div>
    <div>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 4, textTransform: 'uppercase' as const, letterSpacing: '0.06em', fontFamily: 'Montserrat', fontWeight: 600 }}>Loyalty Points</div>
      <div style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 32, color: 'var(--gold)', lineHeight: 1 }}>{(profile?.loyalty_points || 0).toLocaleString()} pts</div>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>1 point = ₦1 at checkout · Earned on every delivered order</div>
    </div>
  </div>
  <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6, alignItems: 'flex-end' }}>
    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>Redeemable value</div>
    <div style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 22, color: 'white' }}>₦{(profile?.loyalty_points || 0).toLocaleString()}</div>
    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>Points awarded when order is delivered</div>
  </div>
</div>
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 16 }}>Recent Orders</h2>
          <Link href="/dashboard/orders" style={{ fontSize: 13, color: 'var(--red)', textDecoration: 'none', fontWeight: 500 }}>View all →</Link>
        </div>
        {recentOrders.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' as const }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
            <div style={{ fontFamily: 'Montserrat', fontWeight: 600, fontSize: 16, marginBottom: 8 }}>No orders yet</div>
            <p style={{ fontSize: 14, color: 'var(--gray)', marginBottom: 20 }}>Place your first order and it will appear here.</p>
            <Link href="/shops" style={{ background: 'var(--red)', color: 'white', fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, padding: '10px 24px', borderRadius: 9, textDecoration: 'none' }}>
              Browse Services →
            </Link>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' as const }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' as const }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--light)' }}>
                  {['Order ID', 'Date', 'Total', 'Status'].map(h => (
                    <th key={h} style={{ padding: '12px 20px', textAlign: 'left' as const, fontSize: 12, fontWeight: 600, color: 'var(--gray)', textTransform: 'uppercase' as const, letterSpacing: '0.06em', fontFamily: 'Montserrat' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '14px 20px', fontSize: 13, fontFamily: 'Montserrat', fontWeight: 600 }}>#{order.id.slice(0, 8).toUpperCase()}</td>
                    <td style={{ padding: '14px 20px', fontSize: 13, color: 'var(--gray)' }}>{new Date(order.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td style={{ padding: '14px 20px', fontSize: 13, fontFamily: 'Montserrat', fontWeight: 700 }}>₦{Number(order.total_amount).toLocaleString()}</td>
                    <td style={{ padding: '14px 20px' }}>
                      <span style={{ display: 'inline-flex', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, fontFamily: 'Montserrat', background: `${statusColor[order.status]}20`, color: statusColor[order.status] }}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <style>{`
        @media (max-width: 900px) { .stats-grid { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 480px) { .stats-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  )
}
