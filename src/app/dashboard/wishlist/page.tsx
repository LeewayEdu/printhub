'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Heart, ShoppingCart, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function WishlistPage() {
  const router = useRouter()
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth'); return }
      const { data } = await supabase
        .from('wishlists')
        .select('*, products(*)')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
      if (data) setItems(data)
      setLoading(false)
    }
    load()
  }, [])

  const remove = async (wishlistId: string, productName: string) => {
    await supabase.from('wishlists').delete().eq('id', wishlistId)
    setItems(prev => prev.filter(i => i.id !== wishlistId))
    toast.success(`${productName} removed from wishlist`)
  }

  const displayPrice = (p: any) => {
    if (p.pricing_model === 'area') return `₦${Number(p.area_rate).toLocaleString()}/${p.area_unit}`
    return `From ₦${Number(p.price).toLocaleString()}`
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center' as const, color: 'var(--gray)' }}>Loading wishlist...</div>

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 22, marginBottom: 4, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Heart size={20} color="var(--red)" fill="var(--red)" /> My Wishlist
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{items.length} saved item{items.length !== 1 ? 's' : ''}</p>
      </div>

      {items.length === 0 ? (
        <div style={{ textAlign: 'center' as const, padding: '60px 24px' }}>
          <Heart size={48} color="#d1d5db" style={{ margin: '0 auto 16px', display: 'block' }} />
          <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 18, marginBottom: 8, color: 'var(--text-primary)' }}>Your wishlist is empty</div>
          <p style={{ color: 'var(--gray)', marginBottom: 24, fontSize: 14 }}>Save items you like by clicking the ♡ on any product.</p>
          <Link href="/shop" style={{ background: 'var(--red)', color: 'white', fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, padding: '12px 28px', borderRadius: 9, textDecoration: 'none' }}>
            Browse the Shop →
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }} className="wishlist-grid">
          {items.map(item => {
            const p = item.products
            if (!p) return null
            const img = p.images?.[0] || p.image_url
            return (
              <div key={item.id} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                {/* Image */}
                <div style={{ height: 160, background: 'var(--light)', position: 'relative' as const, overflow: 'hidden' }}>
                  {img
                    ? <img src={img} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>🖨️</div>}
                  <button onClick={() => remove(item.id, p.name)}
                    style={{ position: 'absolute' as const, top: 8, right: 8, width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.92)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <Heart size={14} fill="#C0392B" color="#C0392B" />
                  </button>
                </div>

                {/* Info */}
                <div style={{ padding: '12px 14px' }}>
                  <div style={{ fontSize: 10, color: 'var(--gray)', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 4 }}>{p.category}</div>
                  <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 13, marginBottom: 6, color: 'var(--black)' }}>{p.name}</div>
                  <div style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 15, color: 'var(--red)', marginBottom: 12 }}>{displayPrice(p)}</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Link href="/shop"
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px', background: 'var(--red)', color: 'white', borderRadius: 8, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 12, textDecoration: 'none' }}>
                      <ShoppingCart size={13} /> Order Now
                    </Link>
                    <button onClick={() => remove(item.id, p.name)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '9px 12px', background: 'var(--light)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', color: 'var(--gray)' }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
      <style dangerouslySetInnerHTML={{ __html: `@media (max-width: 700px) { .wishlist-grid { grid-template-columns: repeat(2, 1fr) !important; } } @media (max-width: 400px) { .wishlist-grid { grid-template-columns: 1fr !important; } }` }} />
    </div>
  )
}