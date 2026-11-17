'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Download } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

interface MyBook {
  entitlementId: string; title: string; slug: string | null; cover: string | null; grantedAt: string
  revoked: boolean; downloadsLeft: number; maxDownloads: number; pdf: boolean; epub: boolean; preparing?: boolean
}

export default function MyBooksPage() {
  const router = useRouter()
  const [books, setBooks] = useState<MyBook[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/auth?tab=login'); return }
    const res = await fetch('/api/books/mine', { headers: { Authorization: `Bearer ${session.access_token}` } })
    const json = await res.json().catch(() => ({}))
    setBooks(res.ok ? json.books : [])
  }
  useEffect(() => { load() // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const download = async (b: MyBook, type: 'pdf' | 'epub') => {
    setBusy(`${b.entitlementId}:${type}`)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/books/download', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
        body: JSON.stringify({ entitlementId: b.entitlementId, type }),
      })
      const json = await res.json().catch(() => ({}))
      if (res.status === 202) { toast(json.message || 'Preparing your copy, check back in a few minutes.', { icon: '⏳' }); load(); return }
      if (!res.ok) { toast.error(json.error || 'Download failed'); return }
      window.location.href = json.url          // short-lived signed link (about 10 minutes)
      load()
    } finally { setBusy(null) }
  }

  if (books === null) return <div role="status" style={{ padding: 40, textAlign: 'center', color: 'var(--gray)' }}>Loading your books…</div>

  return (
    <div>
      <h1 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 22, marginBottom: 4 }}>My books</h1>
      <p style={{ fontSize: 14, color: 'var(--gray)', marginBottom: 20 }}>Your ebook purchases. Downloads are personal to your account and limited per book; each file carries your name.</p>
      {books.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <p style={{ marginBottom: 16 }}>You have no ebooks yet.</p>
          <Link href="/books" style={{ color: 'var(--red)', fontWeight: 700 }}>Browse books</Link>
        </div>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 12 }}>
          {books.map(b => (
            <li key={b.entitlementId} style={{ display: 'flex', gap: 14, background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: 14, alignItems: 'center', flexWrap: 'wrap' }}>
              {b.cover
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={b.cover} alt="" width={56} height={84} style={{ width: 56, height: 84, objectFit: 'cover', borderRadius: 6 }} />
                : <div aria-hidden="true" style={{ width: 56, height: 84, background: '#eee', borderRadius: 6 }} />}
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ fontFamily: 'Montserrat', fontWeight: 700 }}>{b.slug ? <Link href={`/books/${b.slug}`} style={{ color: 'inherit' }}>{b.title}</Link> : b.title}</div>
                <div style={{ fontSize: 12, color: 'var(--gray)', marginTop: 2 }}>
                  {b.revoked ? 'Access withdrawn' : b.preparing ? 'Preparing your copy, check back in a few minutes' : `${b.downloadsLeft} of ${b.maxDownloads} downloads left`}
                </div>
              </div>
              {!b.revoked && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {(['pdf', 'epub'] as const).filter(t => b[t]).map(t => (
                    <button key={t} type="button" onClick={() => download(b, t)} disabled={b.downloadsLeft <= 0 || busy === `${b.entitlementId}:${t}`}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 9, border: 'none', background: b.downloadsLeft <= 0 ? '#d1d5db' : 'var(--red)', color: '#fff', fontFamily: 'Montserrat', fontWeight: 700, fontSize: 13, cursor: b.downloadsLeft <= 0 ? 'not-allowed' : 'pointer' }}>
                      <Download size={14} aria-hidden="true" /> {busy === `${b.entitlementId}:${t}` ? 'Preparing…' : `Download ${t.toUpperCase()}`}
                    </button>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
