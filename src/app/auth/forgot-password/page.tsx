'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    })
    if (error) {
      toast.error(error.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 16, padding: '40px 36px', width: '100%', maxWidth: 420 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', marginBottom: 32 }}>
          <img src="/C-Chu_media_Logo_.png" alt="C-Chu Media" style={{ width: 32, height: 32, objectFit: 'contain' }} />
          <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>PrintHub</div>
        </Link>

        {sent ? (
          <div style={{ textAlign: 'center' as const }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📧</div>
            <h1 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 22, marginBottom: 10, color: 'var(--text-primary)' }}>Check your email</h1>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 24 }}>
              We sent a password reset link to <strong>{email}</strong>. Click the link in the email to reset your password.
            </p>
            <Link href="/auth" style={{ color: 'var(--red)', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
              Back to login
            </Link>
          </div>
        ) : (
          <>
            <h1 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 24, marginBottom: 8, color: 'var(--text-primary)' }}>Reset your password</h1>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 28, lineHeight: 1.6 }}>
              Enter your email address and we will send you a link to reset your password.
            </p>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6, color: 'var(--text-primary)' }}>Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="form-input"
                />
              </div>
              <button type="submit" disabled={loading}
                style={{ width: '100%', padding: '13px', background: loading ? '#ccc' : 'var(--red)', color: 'white', border: 'none', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer' }}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
            <div style={{ textAlign: 'center' as const, marginTop: 20 }}>
              <Link href="/auth" style={{ fontSize: 13, color: 'var(--text-secondary)', textDecoration: 'none' }}>
                Back to login
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}