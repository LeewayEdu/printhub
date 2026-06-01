'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'

function AuthContent() {
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<'login' | 'register'>(
    searchParams.get('tab') === 'register' ? 'register' : 'login'
  )

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' as const }}>
      <AuthNav />
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: 'calc(100vh - 64px)' }} className="auth-wrap">
        <AuthLeft />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 40px', background: 'var(--light)' }}>
          <div style={{ width: '100%', maxWidth: 440 }}>
            <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 9, overflow: 'hidden', marginBottom: 28, background: 'white' }}>
              {(['login', 'register'] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  style={{ flex: 1, padding: '11px', fontSize: 14, fontWeight: tab === t ? 600 : 400, fontFamily: 'Open Sans', cursor: 'pointer', border: 'none', background: tab === t ? 'var(--red)' : 'none', color: tab === t ? 'white' : 'var(--gray)', transition: 'all 0.2s' }}>
                  {t === 'login' ? 'Login' : 'Register Free'}
                </button>
              ))}
            </div>
            {tab === 'login' ? <LoginForm /> : <RegisterForm onSuccess={() => setTab('login')} />}
          </div>
        </div>
      </div>
      <style>{`
        @media (max-width: 900px) { .auth-wrap { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  )
}

function AuthNav() {
  return (
    <nav style={{ padding: '0 40px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white', borderBottom: '1px solid var(--border)' }}>
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
        <img src="/C-Chu_media_Logo_.png" alt="C-Chu Media" style={{ width: 36, height: 36, objectFit: 'contain' }} />
        <div>
          <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 15, color: 'var(--black)' }}>PrintHub</div>
          <div style={{ fontSize: 11, color: 'var(--gray)' }}>by C-Chu Media Ltd</div>
        </div>
      </Link>
      <Link href="/" style={{ fontSize: 13, color: 'var(--gray)', textDecoration: 'none' }}>← Back to home</Link>
    </nav>
  )
}

function AuthLeft() {
  return (
    <div style={{ background: 'var(--black)', display: 'flex', flexDirection: 'column' as const, justifyContent: 'center', padding: '80px 60px', position: 'relative', overflow: 'hidden' }} className="auth-left">
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 20% 60%, rgba(192,57,43,0.2) 0%, transparent 50%)' }} />
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
      <div style={{ position: 'relative', zIndex: 2 }}>
        <div style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 28, color: 'white', marginBottom: 6 }}>PrintHub</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', marginBottom: 40 }}>by C-Chu Media Limited · Since 2011</div>
        <h2 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 'clamp(24px, 2.5vw, 36px)', color: 'white', lineHeight: 1.15, marginBottom: 16, letterSpacing: '-0.02em' }}>
          Order printing.<br /><span style={{ color: 'var(--red)' }}>Track everything.</span><br />Earn commissions.
        </h2>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.75, marginBottom: 36, maxWidth: 360 }}>
          Your PrintHub account gives you access to Nigeria's most complete online print ordering platform.
        </p>
        {[
          'Browse and order all print services online',
          'Track your orders from placement to delivery',
          'Access your affiliate dashboard and commissions',
          'Reorder previous jobs with one click',
          'Trusted by 3,000+ clients since 2011',
        ].map((perk) => (
          <div key={perk} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--red)', flexShrink: 0, marginTop: 7 }} />
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>{perk}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function LoginForm() {
  const { login, isLoading, error, success, setError } = useAuthStore()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showLoginPwd, setShowLoginPwd] = useState(false)

  useEffect(() => { setError(null) }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await login(email, password)
      toast.success('Welcome back!')
      router.push('/dashboard')
    } catch {}
  }

  return (
    <div>
      <div style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 26, color: 'var(--black)', marginBottom: 6 }}>Welcome back</div>
      <div style={{ fontSize: 14, color: 'var(--gray)', marginBottom: 28 }}>Login to your PrintHub account</div>

      {error && <div style={{ background: 'var(--red-pale)', border: '1px solid var(--red-light)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--red)', marginBottom: 20 }}>{error}</div>}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--dark)', display: 'block', marginBottom: 6 }}>Email address</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required className="form-input" />
        </div>
        <div style={{ marginBottom: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--dark)', display: 'block', marginBottom: 6 }}>Password</label>
          <div style={{ position: 'relative' as const }}>
            <input type={showLoginPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required className="form-input" style={{ paddingRight: 44 }} />
            <button type="button" onClick={() => setShowLoginPwd(p => !p)}
              style={{ position: 'absolute' as const, right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray)', display: 'flex', alignItems: 'center', padding: 0 }}>
              {showLoginPwd ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        <div style={{ textAlign: 'right' as const, marginBottom: 20 }}>
          <Link href="/auth/forgot-password" style={{ fontSize: 13, color: 'var(--red)', textDecoration: 'none' }}>Forgot password?</Link>
        </div>
        <button type="submit" disabled={isLoading}
          style={{ width: '100%', padding: 14, background: isLoading ? '#ccc' : 'var(--red)', color: 'white', border: 'none', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 15, cursor: isLoading ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}>
          {isLoading ? 'Logging in...' : 'Login to PrintHub →'}
        </button>
      </form>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '24px 0' }}>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        <span style={{ fontSize: 12, color: 'var(--gray)' }}>or</span>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>

      <a href="https://wa.me/2348052929523?text=Hello%2C%20I%20want%20to%20place%20an%20order"
        style={{ width: '100%', padding: 13, background: '#25D366', color: 'white', border: 'none', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 600, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, textDecoration: 'none' }}>
        💬 Order via WhatsApp instead
      </a>
    </div>
  )
}

function RegisterForm({ onSuccess }: { onSuccess: () => void }) {
  const { signup, isLoading, error, success, setError } = useAuthStore()
  const [showRegPwd, setShowRegPwd] = useState(false)
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '', password: '',
    heardFrom: '', isAffiliate: false,
  })

  useEffect(() => { setError(null) }, [])

  const set = (field: string, value: string | boolean) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await signup(form.email, form.password, form.firstName, form.lastName, form.phone, form.heardFrom, form.isAffiliate)
      toast.success('Account created! Check your email to confirm.')
      onSuccess()
    } catch {}
  }

  return (
    <div>
      <div style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 26, color: 'var(--black)', marginBottom: 6 }}>Create your account</div>
      <div style={{ fontSize: 14, color: 'var(--gray)', marginBottom: 28 }}>Free to register. Start ordering in minutes.</div>

      {error && <div style={{ background: 'var(--red-pale)', border: '1px solid var(--red-light)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--red)', marginBottom: 20 }}>{error}</div>}
      {success && <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#166534', marginBottom: 20 }}>{success}</div>}

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--dark)', display: 'block', marginBottom: 6 }}>First name</label>
            <input type="text" value={form.firstName} onChange={e => set('firstName', e.target.value)} placeholder="Amaka" required className="form-input" />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--dark)', display: 'block', marginBottom: 6 }}>Last name</label>
            <input type="text" value={form.lastName} onChange={e => set('lastName', e.target.value)} placeholder="Johnson" required className="form-input" />
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--dark)', display: 'block', marginBottom: 6 }}>Email address</label>
          <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@example.com" required className="form-input" />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--dark)', display: 'block', marginBottom: 6 }}>Phone number</label>
          <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+234 800 000 0000" className="form-input" />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--dark)', display: 'block', marginBottom: 6 }}>Password</label>
          <div style={{ position: 'relative' as const }}>
            <input type={showRegPwd ? 'text' : 'password'} value={form.password} onChange={e => set('password', e.target.value)} placeholder="Create a strong password" required minLength={6} className="form-input" style={{ paddingRight: 44 }} />
            <button type="button" onClick={() => setShowRegPwd((p: boolean) => !p)}
              style={{ position: 'absolute' as const, right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray)', display: 'flex', alignItems: 'center', padding: 0 }}>
              {showRegPwd ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--dark)', display: 'block', marginBottom: 6 }}>How did you hear about us?</label>
          <select value={form.heardFrom} onChange={e => set('heardFrom', e.target.value)} className="form-input" style={{ cursor: 'pointer' }}>
            <option value="">Select one...</option>
            <option>Facebook / Instagram</option>
            <option>WhatsApp</option>
            <option>Referred by a friend</option>
            <option>Google Search</option>
            <option>Flyers/Stickers</option>
            <option>Banner</option>
            <option>Other</option>
          </select>
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', fontSize: 13, color: 'var(--dark)' }}>
            <input type="checkbox" checked={form.isAffiliate} onChange={e => set('isAffiliate', e.target.checked)} style={{ marginTop: 3, accentColor: 'var(--red)' }} />
            <span>I'd like to join the <strong style={{ color: 'var(--red)' }}>C-Chu Media Affiliate Program</strong> and earn commissions by referring clients</span>
          </label>
        </div>
        <button type="submit" disabled={isLoading}
          style={{ width: '100%', padding: 14, background: isLoading ? '#ccc' : 'var(--red)', color: 'white', border: 'none', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 15, cursor: isLoading ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}>
          {isLoading ? 'Creating account...' : 'Create My Free Account →'}
        </button>
        <div style={{ textAlign: 'center' as const, fontSize: 12, color: 'var(--gray)', marginTop: 16, lineHeight: 1.6 }}>
          By registering you agree to our <Link href="/terms" style={{ color: 'var(--red)' }}>Terms</Link> and <Link href="/privacy" style={{ color: 'var(--red)' }}>Privacy Policy</Link>
        </div>
      </form>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>}>
      <AuthContent />
    </Suspense>
  )
}