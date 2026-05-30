'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase/client'
import { LayoutDashboard, ShoppingBag, User, LogOut, Package, Menu, X, ChevronRight, MessageSquare, TrendingUp, Truck, Tag, Bell, Image, DollarSign, Users, Zap, Star, FileSpreadsheet, Heart } from 'lucide-react'

const customerLinks = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/orders', label: 'My Orders', icon: ShoppingBag },
  { href: '/dashboard/wishlist', label: 'Wishlist', icon: Heart },
  { href: '/dashboard/affiliate', label: 'Affiliate', icon: TrendingUp },
  { href: '/dashboard/profile', label: 'Profile', icon: User },
]

const adminLinks = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/admin/orders', label: 'All Orders', icon: ShoppingBag },
  { href: '/dashboard/admin/products', label: 'Products', icon: Package },
  { href: '/dashboard/admin/bulk-upload', label: 'Bulk Upload', icon: FileSpreadsheet },
  { href: '/dashboard/admin/delivery', label: 'Delivery', icon: Truck },
  { href: '/dashboard/admin/promos', label: 'Promo Codes', icon: Tag },
  { href: '/dashboard/admin/notifications', label: 'Notifications', icon: Bell },
  { href: '/dashboard/admin/banners', label: 'Hero Banners', icon: Image },
  { href: '/dashboard/admin/flash-sale', label: 'Flash Sale', icon: Zap },
  { href: '/dashboard/admin/testimonials', label: 'Testimonials', icon: Star },
  { href: '/dashboard/admin/reviews', label: 'Product Reviews', icon: MessageSquare },
  { href: '/dashboard/admin/messages', label: 'Messages', icon: MessageSquare },
  { href: '/dashboard/orders', label: 'My Orders', icon: ShoppingBag },
  { href: '/dashboard/profile', label: 'Profile', icon: User },
  { href: '/dashboard/admin/payouts', label: 'Payouts', icon: DollarSign },
  { href: '/dashboard/admin/users', label: 'Users', icon: Users },
] 

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { logout } = useAuthStore()
  const router = useRouter()
  const pathname = usePathname()
  const [role, setRole] = useState<string>('customer')
  const [profile, setProfile] = useState<{ first_name: string; last_name: string; email: string } | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/auth'); return }
      supabase.from('profiles')
        .select('first_name, last_name, email, role')
        .eq('id', session.user.id)
        .single()
        .then(({ data }) => {
          if (data) { setRole(data.role); setProfile(data) }
        })
    })
  }, [])

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  const links = role === 'admin' ? adminLinks : customerLinks

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--light)' }}>
      <aside style={{ width: 260, background: 'var(--black)', display: 'flex', flexDirection: 'column' as const, position: 'fixed' as const, top: 0, left: 0, height: '100vh', zIndex: 200, transition: 'transform 0.3s ease', transform: sidebarOpen ? 'translateX(0)' : undefined }} className="sidebar">
        <div style={{ padding: '24px 24px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <img src="/C-Chu_media_Logo_.png" alt="C-Chu Media" style={{ width: 32, height: 32, objectFit: 'contain' }} />
            <div>
              <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 15, color: 'white' }}>PrintHub</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>by C-Chu Media</div>
            </div>
          </Link>
        </div>
        {profile && (
          <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
              <span style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 16, color: 'white' }}>{profile.first_name?.[0]?.toUpperCase() || 'U'}</span>
            </div>
            <div style={{ fontFamily: 'Montserrat', fontWeight: 600, fontSize: 14, color: 'white' }}>{profile.first_name} {profile.last_name}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{profile.email}</div>
            {role === 'admin' && (
              <div style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(192,57,43,0.2)', border: '1px solid rgba(192,57,43,0.4)', borderRadius: 12, padding: '3px 10px' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--red)', fontFamily: 'Montserrat' }}>ADMIN</span>
              </div>
            )}
          </div>
        )}
        <nav style={{ flex: 1, padding: '16px 12px', overflowY: 'auto' as const }}>
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link key={href} href={href} onClick={() => setSidebarOpen(false)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 9, marginBottom: 4, textDecoration: 'none', transition: 'all 0.2s', background: active ? 'rgba(192,57,43,0.15)' : 'transparent', color: active ? 'white' : 'rgba(255,255,255,0.55)', borderLeft: active ? '3px solid var(--red)' : '3px solid transparent' }}>
                <Icon size={17} />
                <span style={{ fontSize: 14, fontFamily: 'Open Sans' }}>{label}</span>
                {active && <ChevronRight size={14} style={{ marginLeft: 'auto' }} />}
              </Link>
            )
          })}
        </nav>
        <div style={{ padding: '16px 12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button onClick={handleLogout}
            style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '10px 12px', borderRadius: 9, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.45)', fontSize: 14, fontFamily: 'Open Sans' }}>
            <LogOut size={17} />
            Sign out
          </button>
        </div>
      </aside>

      <div style={{ flex: 1, marginLeft: 260, display: 'flex', flexDirection: 'column' as const }} className="dash-main">
        <header style={{ background: 'white', borderBottom: '1px solid var(--border)', padding: '0 32px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky' as const, top: 0, zIndex: 100 }}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--dark)' }} className="hamburger">
            {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 18, color: 'var(--black)' }}>
            {links.find(l => l.href === pathname)?.label || 'Dashboard'}
          </div>
          <Link href="/shops" style={{ fontSize: 13, fontWeight: 700, padding: '8px 18px', background: 'var(--red)', color: 'white', borderRadius: 8, textDecoration: 'none', fontFamily: 'Montserrat' }}>
            + New Order
          </Link>
        </header>
        <main style={{ flex: 1, padding: 32, overflowY: 'auto' as const }}>{children}</main>
      </div>

      {sidebarOpen && <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 199 }} />}

      <style>{`
        @media (max-width: 900px) {
          .sidebar { transform: ${sidebarOpen ? 'translateX(0)' : 'translateX(-260px)'} !important; }
          .dash-main { margin-left: 0 !important; }
          .hamburger { display: flex !important; }
        }
      `}</style>
    </div>
  )
}