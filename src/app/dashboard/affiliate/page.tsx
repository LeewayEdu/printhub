'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Copy, Check, TrendingUp, Users, DollarSign, Plus, Pencil, X } from 'lucide-react'
import toast from 'react-hot-toast'

// Referral code rules — kept simple and URL-safe since this becomes
// part of a public link (?ref=CODE). Enforced both client-side (for
// instant feedback) and should also be enforced by a DB constraint
// (see custom-referral-code-feature.sql) so it can't be bypassed by
// a direct API call.
const CODE_MIN_LENGTH = 4
const CODE_MAX_LENGTH = 16
const CODE_PATTERN = /^[A-Z0-9]+$/  // uppercase letters and numbers only, no spaces/symbols

export default function AffiliateDashboardPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [affiliate, setAffiliate] = useState<any>(null)
  const [commissions, setCommissions] = useState<any[]>([])
  const [referrals, setReferrals] = useState<any[]>([])
  const [payoutRequests, setPayoutRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [applying, setApplying] = useState(false)
  const [showPayoutModal, setShowPayoutModal] = useState(false)
  const [payoutAmount, setPayoutAmount] = useState('')
  const [submittingPayout, setSubmittingPayout] = useState(false)
  const [bankForm, setBankForm] = useState({ bank_name: '', account_number: '', account_name: '' })
  const [savingBank, setSavingBank] = useState(false)
  const [editingBank, setEditingBank] = useState(false)

  // ── Custom referral code state ──
  const [editingCode, setEditingCode] = useState(false)
  const [newCode, setNewCode] = useState('')
  const [savingCode, setSavingCode] = useState(false)
  const [codeError, setCodeError] = useState('')

  // ── Join Affiliate Program form state ──
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [joinForm, setJoinForm] = useState({
    referral_code: '', legal_name: '', occupation: '',
    bank_name: '', account_number: '', account_name: '',
  })
  const [joinErrors, setJoinErrors] = useState<Record<string, string>>({})

  const OCCUPATIONS = [
    'Graphic Designer', 'Printer/Print Shop Owner', 'Marketer/Social Media Influencer',
    'Event Planner', 'Student', 'Business Owner', 'Other',
  ]

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth'); return }

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      if (prof) {
        setProfile(prof)
        const { data: aff } = await supabase.from('affiliates').select('*').eq('profile_id', session.user.id).single()
        if (aff) {
          setAffiliate(aff)
          setNewCode(aff.referral_code || '')
          setBankForm({ bank_name: aff.bank_name || '', account_number: aff.account_number || '', account_name: aff.account_name || '' })

          const [commsRes, referralsRes, payoutsRes] = await Promise.all([
            supabase.from('commissions').select('*').eq('affiliate_id', aff.id).order('created_at', { ascending: false }).limit(20),
            supabase.from('referrals').select('*, profiles(first_name, last_name, email)').eq('affiliate_id', aff.id).order('total_commission', { ascending: false }),
            supabase.from('payout_requests').select('*').eq('affiliate_id', aff.id).order('created_at', { ascending: false }),
          ])

          if (commsRes.data) setCommissions(commsRes.data)
          if (referralsRes.data) setReferrals(referralsRes.data)
          if (payoutsRes.data) setPayoutRequests(payoutsRes.data)
        }
      }
      setLoading(false)
    }
    load()
  }, [])

  const openJoinModal = () => {
    setJoinForm({
      referral_code: '',
      legal_name: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : '',
      occupation: '',
      bank_name: '', account_number: '', account_name: '',
    })
    setJoinErrors({})
    setShowJoinModal(true)
  }

  const validateCode = (code: string): string | null => {
    if (code.length < CODE_MIN_LENGTH) return `Code must be at least ${CODE_MIN_LENGTH} characters`
    if (code.length > CODE_MAX_LENGTH) return `Code must be at most ${CODE_MAX_LENGTH} characters`
    if (!CODE_PATTERN.test(code)) return 'Only uppercase letters and numbers allowed, no spaces or symbols'
    return null
  }

  const validateJoinForm = (): Record<string, string> => {
    const errs: Record<string, string> = {}
    const code = joinForm.referral_code.trim().toUpperCase()
    if (!code) errs.referral_code = 'Choose a username for your referral link'
    else if (validateCode(code)) errs.referral_code = validateCode(code)!
    if (!joinForm.legal_name.trim()) errs.legal_name = 'Your full legal name is required'
    if (!joinForm.occupation) errs.occupation = 'Please select what you do'
    if (!joinForm.bank_name.trim()) errs.bank_name = 'Bank name is required'
    if (!joinForm.account_number.trim()) errs.account_number = 'Account number is required'
    else if (!/^\d{10}$/.test(joinForm.account_number.trim())) errs.account_number = 'Nigerian account numbers are 10 digits'
    if (!joinForm.account_name.trim()) errs.account_name = 'Account name is required'
    return errs
  }

  const handleApply = async () => {
    const errs = validateJoinForm()
    setJoinErrors(errs)
    if (Object.keys(errs).length > 0) return

    setApplying(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setApplying(false); return }

    const code = joinForm.referral_code.trim().toUpperCase()

    // Check the chosen code isn't already taken before inserting —
    // gives a clear error instead of relying solely on the DB's
    // unique constraint to reject it after the fact.
    const { data: existing } = await supabase
      .from('affiliates')
      .select('id')
      .eq('referral_code', code)
      .maybeSingle()

    if (existing) {
      setJoinErrors({ referral_code: 'This username is already taken — please choose another' })
      setApplying(false)
      return
    }

    const { error } = await supabase.from('affiliates').insert({
      profile_id: session.user.id,
      referral_code: code,
      legal_name: joinForm.legal_name.trim(),
      occupation: joinForm.occupation,
      bank_name: joinForm.bank_name.trim(),
      account_number: joinForm.account_number.trim(),
      account_name: joinForm.account_name.trim(),
    })

    if (error) {
      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        setJoinErrors({ referral_code: 'This username is already taken — please choose another' })
      } else {
        toast.error(error.message)
      }
      setApplying(false)
      return
    }

    await supabase.from('profiles').update({ is_affiliate: true }).eq('id', session.user.id)
    toast.success('Welcome to the affiliate program!')
    window.location.reload()
  }

  const handleCopy = () => {
    if (!referralLink) return
    navigator.clipboard.writeText(referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Custom referral code handlers ──
  const handleSaveCode = async () => {
    const cleaned = newCode.trim().toUpperCase()
    const validationError = validateCode(cleaned)
    if (validationError) { setCodeError(validationError); return }

    if (cleaned === affiliate.referral_code) {
      setEditingCode(false)
      return
    }

    setSavingCode(true)
    setCodeError('')

    // Check uniqueness before attempting the update — gives a clear
    // error message instead of a raw DB constraint violation. A DB-level
    // UNIQUE constraint (see SQL file) is still the real enforcement —
    // this check is just for a better user experience.
    const { data: existing } = await supabase
      .from('affiliates')
      .select('id')
      .eq('referral_code', cleaned)
      .neq('id', affiliate.id)
      .maybeSingle()

    if (existing) {
      setCodeError('This code is already taken — please choose another')
      setSavingCode(false)
      return
    }

    const { error } = await supabase
      .from('affiliates')
      .update({ referral_code: cleaned })
      .eq('id', affiliate.id)

    if (error) {
      // Catches the case where a DB UNIQUE constraint blocks it anyway
      // (e.g. a race condition where two people grabbed the same code
      // at the same moment) — same friendly message either way.
      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        setCodeError('This code is already taken — please choose another')
      } else {
        toast.error(error.message)
      }
      setSavingCode(false)
      return
    }

    setAffiliate((prev: any) => ({ ...prev, referral_code: cleaned }))
    toast.success('Your referral code has been updated!')
    setEditingCode(false)
    setSavingCode(false)
  }

  const cancelEditCode = () => {
    setNewCode(affiliate.referral_code)
    setCodeError('')
    setEditingCode(false)
  }

  const handleSaveBank = async () => {
    if (!bankForm.bank_name || !bankForm.account_number || !bankForm.account_name) {
      toast.error('Please fill all bank details')
      return
    }
    setSavingBank(true)
    const { error } = await supabase.from('affiliates').update(bankForm).eq('id', affiliate.id)
    if (error) { toast.error(error.message) } else { toast.success('Bank details saved!') }
    setSavingBank(false)
  }

  const handleRequestPayout = async () => {
    const amount = Number(payoutAmount)
    if (!amount || amount < 5000) { toast.error('Minimum payout is ₦5,000'); return }
    if (amount > affiliate.pending_payout) { toast.error(`Maximum is ₦${Number(affiliate.pending_payout).toLocaleString()}`); return }
    if (!bankForm.bank_name || !bankForm.account_number) { toast.error('Please save your bank details first'); return }

    setSubmittingPayout(true)
    const { error } = await supabase.from('payout_requests').insert({
      affiliate_id: affiliate.id,
      amount,
      status: 'pending',
    })
    if (error) { toast.error(error.message) } else {
      toast.success('Payout request submitted! We will process within 24 hours.')
      setShowPayoutModal(false)
      setPayoutAmount('')
      window.location.reload()
    }
    setSubmittingPayout(false)
  }

  const referralLink = affiliate ? `https://printhub.cchumedia.com?ref=${affiliate.referral_code}` : null

  const statusColor: Record<string, string> = { pending: '#f59e0b', approved: '#3b82f6', paid: '#10b981', rejected: '#ef4444' }

  if (loading) return <div style={{ padding: 40, textAlign: 'center' as const, color: 'var(--text-secondary)' }}>Loading...</div>

  if (!affiliate) return (
    <div style={{ maxWidth: 560 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 22, marginBottom: 4, color: 'var(--text-primary)' }}>Affiliate Program</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>You are not yet enrolled.</p>
      </div>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 16, padding: 32 }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>💰</div>
        <h2 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 20, marginBottom: 12, color: 'var(--text-primary)' }}>Start earning commissions</h2>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 20 }}>Earn up to 10% on every order your referrals place — for life.</p>
        {['10% on first 5 orders per client', '5% on orders 6-10', '3% on all orders after — forever', 'Unlimited referrals', 'Bank transfer payouts'].map(item => (
          <div key={item} style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
            <Check size={14} color="var(--red)" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{item}</span>
          </div>
        ))}
        <button onClick={openJoinModal}
          style={{ width: '100%', padding: '13px', background: 'var(--red)', color: 'white', border: 'none', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 15, cursor: 'pointer', marginTop: 20 }}>
          Join Affiliate Program
        </button>
      </div>

      {showJoinModal && (
        <div style={{ position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '20px', overflowY: 'auto' as const }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 16, width: '100%', maxWidth: 480, padding: 28, margin: '40px auto' }}>
            <h2 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 19, marginBottom: 6, color: 'var(--text-primary)' }}>Set up your Affiliate Account</h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 22, lineHeight: 1.6 }}>
              A few details to get you started. Your bank account name must match your legal name for payouts to be approved.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6, color: 'var(--text-primary)', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Choose Your Username *</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>?ref=</span>
                  <input
                    value={joinForm.referral_code}
                    onChange={e => setJoinForm(p => ({ ...p, referral_code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') }))}
                    maxLength={CODE_MAX_LENGTH}
                    placeholder="YOURNAME"
                    className="form-input"
                    style={{ flex: 1, fontFamily: 'Montserrat', fontWeight: 700 }}
                  />
                </div>
                {joinErrors.referral_code && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{joinErrors.referral_code}</div>}
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>This becomes your unique referral link — choose something memorable.</div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6, color: 'var(--text-primary)', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Full Legal Name *</label>
                <input
                  value={joinForm.legal_name}
                  onChange={e => setJoinForm(p => ({ ...p, legal_name: e.target.value }))}
                  placeholder="As it appears on your bank account"
                  className="form-input"
                />
                {joinErrors.legal_name && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{joinErrors.legal_name}</div>}
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6, color: 'var(--text-primary)', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>What do you do? *</label>
                <select
                  value={joinForm.occupation}
                  onChange={e => setJoinForm(p => ({ ...p, occupation: e.target.value }))}
                  className="form-input"
                  style={{ cursor: 'pointer' }}
                >
                  <option value="">Select one</option>
                  {OCCUPATIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
                {joinErrors.occupation && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{joinErrors.occupation}</div>}
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 16, marginTop: 4 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12, fontFamily: 'Montserrat' }}>Payout Bank Details</div>
                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 14 }}>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>Bank Name *</label>
                    <input value={joinForm.bank_name} onChange={e => setJoinForm(p => ({ ...p, bank_name: e.target.value }))} placeholder="e.g. GTBank" className="form-input" style={{ fontSize: 13 }} />
                    {joinErrors.bank_name && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{joinErrors.bank_name}</div>}
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>Account Number *</label>
                    <input value={joinForm.account_number} onChange={e => setJoinForm(p => ({ ...p, account_number: e.target.value.replace(/\D/g, '') }))} maxLength={10} placeholder="0123456789" className="form-input" style={{ fontSize: 13 }} />
                    {joinErrors.account_number && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{joinErrors.account_number}</div>}
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>Account Name *</label>
                    <input value={joinForm.account_name} onChange={e => setJoinForm(p => ({ ...p, account_name: e.target.value }))} placeholder="Must match your legal name above" className="form-input" style={{ fontSize: 13 }} />
                    {joinErrors.account_name && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{joinErrors.account_name}</div>}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button onClick={() => setShowJoinModal(false)} style={{ flex: 1, padding: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 600, fontSize: 14, cursor: 'pointer', color: 'var(--text-primary)' }}>Cancel</button>
              <button onClick={handleApply} disabled={applying}
                style={{ flex: 2, padding: '12px', background: applying ? '#ccc' : 'var(--red)', color: 'white', border: 'none', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, cursor: applying ? 'not-allowed' : 'pointer' }}>
                {applying ? 'Setting up...' : 'Become an Affiliate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 22, marginBottom: 4, color: 'var(--text-primary)' }}>Affiliate Dashboard</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Track your referrals and earnings.</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }} className="aff-stats">
        {[
          { label: 'Total Earnings', value: `₦${Number(affiliate.total_earnings).toLocaleString()}`, icon: TrendingUp, color: '#10b981' },
          { label: 'Pending Payout', value: `₦${Number(affiliate.pending_payout).toLocaleString()}`, icon: DollarSign, color: '#f59e0b' },
          { label: 'Total Referrals', value: affiliate.total_referrals, icon: Users, color: 'var(--red)' },
        ].map((stat, i) => (
          <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 14, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{stat.label}</span>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: `${stat.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <stat.icon size={16} color={stat.color} />
              </div>
            </div>
            <div style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 24, color: 'var(--text-primary)' }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Referral link — now with customizable code */}
      <div style={{ background: '#1A1A1A', borderRadius: 14, padding: '22px 24px', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, color: 'white' }}>Your referral link</div>
          {!editingCode && (
            <button onClick={() => setEditingCode(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: 12, fontFamily: 'Montserrat' }}>
              <Pencil size={11} /> Customize code
            </button>
          )}
        </div>

        {editingCode ? (
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontFamily: 'Montserrat', flexShrink: 0 }}>printhub.cchumedia.com?ref=</span>
              <input
                value={newCode}
                onChange={e => { setNewCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')); setCodeError('') }}
                maxLength={CODE_MAX_LENGTH}
                placeholder="YOURCODE"
                style={{ flex: 1, minWidth: 100, padding: '7px 10px', background: 'rgba(255,255,255,0.08)', border: `1px solid ${codeError ? '#ef4444' : 'rgba(255,255,255,0.2)'}`, borderRadius: 7, color: 'white', fontFamily: 'Montserrat', fontWeight: 700, fontSize: 13, outline: 'none' }}
              />
            </div>
            {codeError && (
              <div style={{ fontSize: 11, color: '#fca5a5', marginBottom: 8 }}>{codeError}</div>
            )}
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 10 }}>
              {CODE_MIN_LENGTH}-{CODE_MAX_LENGTH} characters, letters and numbers only. Changing your code breaks any links you've already shared with the old code.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={cancelEditCode}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 7, color: 'rgba(255,255,255,0.7)', fontFamily: 'Montserrat', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                <X size={12} /> Cancel
              </button>
              <button onClick={handleSaveCode} disabled={savingCode}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', background: savingCode ? '#6b7280' : 'var(--red)', border: 'none', borderRadius: 7, color: 'white', fontFamily: 'Montserrat', fontWeight: 700, fontSize: 12, cursor: savingCode ? 'not-allowed' : 'pointer' }}>
                <Check size={12} /> {savingCode ? 'Saving...' : 'Save Code'}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 9, padding: '10px 14px', marginBottom: 10 }}>
            <span style={{ flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.8)', fontFamily: 'Montserrat', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{referralLink}</span>
            <button onClick={handleCopy}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'var(--red)', color: 'white', border: 'none', borderRadius: 7, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 12, cursor: 'pointer', flexShrink: 0 }}>
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        )}
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>Share this link. When they register and order, you earn automatically.</div>
      </div>

      {/* Request payout — ALWAYS VISIBLE */}
      <div style={{ background: 'var(--bg-card)', border: `2px solid ${Number(affiliate.pending_payout) >= 5000 ? '#10b981' : 'var(--border-color)'}`, borderRadius: 14, padding: '20px 24px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: 12 }}>
        <div>
          <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', marginBottom: 4 }}>
            {Number(affiliate.pending_payout) >= 5000 ? 'Ready for payout!' : 'Payout not yet available'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {Number(affiliate.pending_payout) >= 5000
              ? `You have ₦${Number(affiliate.pending_payout).toLocaleString()} available to withdraw.`
              : `You need ₦${(5000 - Number(affiliate.pending_payout)).toLocaleString()} more to reach the ₦5,000 minimum.`}
          </div>
        </div>
        <div style={{ position: 'relative' as const }} className="payout-btn-wrap">
          <button
            onClick={Number(affiliate.pending_payout) >= 5000 ? () => setShowPayoutModal(true) : undefined}
            disabled={Number(affiliate.pending_payout) < 5000}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: Number(affiliate.pending_payout) >= 5000 ? '#10b981' : '#e5e7eb', color: Number(affiliate.pending_payout) >= 5000 ? 'white' : '#9ca3af', border: 'none', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, cursor: Number(affiliate.pending_payout) >= 5000 ? 'pointer' : 'not-allowed' }}>
            <Plus size={16} /> Request Payout
          </button>
          <style>{`.payout-btn-wrap:hover .payout-tooltip { opacity: 1; pointer-events: auto; }`}</style>
          {Number(affiliate.pending_payout) < 5000 && (
            <div className="payout-tooltip" style={{ position: 'absolute' as const, bottom: '110%', left: '50%', transform: 'translateX(-50%)', background: '#1a1a1a', color: 'white', fontSize: 11, padding: '6px 12px', borderRadius: 6, whiteSpace: 'nowrap', opacity: 0, transition: 'opacity 0.2s', pointerEvents: 'none', zIndex: 10 }}>
              Minimum payout is ₦5,000
            </div>
          )}
        </div>
      </div>

      {/* Bank details */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 14, padding: '22px 24px', marginBottom: 24 }}>
        <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', marginBottom: 16 }}>Payout bank details</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 14 }} className="bank-grid">
          {[
            { label: 'Bank name', field: 'bank_name', placeholder: 'e.g. GTBank' },
            { label: 'Account number', field: 'account_number', placeholder: '0123456789' },
            { label: 'Account name', field: 'account_name', placeholder: 'Your full name' },
          ].map(({ label, field, placeholder }) => (
            <div key={field}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>{label}</label>
              <input
                value={bankForm[field as keyof typeof bankForm]}
                onChange={e => setBankForm(p => ({ ...p, [field]: e.target.value }))}
                placeholder={placeholder}
                className="form-input"
                style={{ fontSize: 13 }}
                disabled={!!bankForm.bank_name && !editingBank}
              />
            </div>
          ))}
        </div>
        {!bankForm.bank_name || editingBank ? (
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={handleSaveBank} disabled={savingBank}
              style={{ padding: '10px 24px', background: savingBank ? '#ccc' : 'var(--red)', color: 'white', border: 'none', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, cursor: savingBank ? 'not-allowed' : 'pointer' }}>
              {savingBank ? 'Saving...' : 'Save Bank Details'}
            </button>
            {editingBank && (
              <button onClick={() => setEditingBank(false)}
                style={{ padding: '10px 20px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 600, fontSize: 14, cursor: 'pointer', color: 'var(--text-primary)' }}>
                Cancel
              </button>
            )}
          </div>
        ) : (
          <button onClick={() => setEditingBank(true)}
            style={{ padding: '10px 24px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 600, fontSize: 14, cursor: 'pointer', color: 'var(--text-primary)' }}>
            Edit Bank Details
          </button>
        )}
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 10 }}>Payouts processed within 24 hours of approved request. Minimum ₦5,000.</div>
      </div>

      {/* Payout history */}
      {payoutRequests.length > 0 && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 14, overflow: 'hidden', marginBottom: 24 }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-color)' }}>
            <h2 style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>Payout Requests</h2>
          </div>
          <div style={{ overflowX: 'auto' as const }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' as const }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
                  {['Date', 'Amount', 'Status', 'Note'].map(h => (
                    <th key={h} style={{ padding: '10px 20px', textAlign: 'left' as const, fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' as const, letterSpacing: '0.06em', fontFamily: 'Montserrat' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payoutRequests.map(req => (
                  <tr key={req.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px 20px', fontSize: 13, color: 'var(--text-secondary)' }}>{new Date(req.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td style={{ padding: '12px 20px', fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>₦{Number(req.amount).toLocaleString()}</td>
                    <td style={{ padding: '12px 20px' }}>
                      <span style={{ display: 'inline-flex', padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, fontFamily: 'Montserrat', background: `${statusColor[req.status]}20`, color: statusColor[req.status] }}>
                        {req.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 20px', fontSize: 13, color: 'var(--text-secondary)' }}>{req.note || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Referrals table */}
      {referrals.length > 0 && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 14, overflow: 'hidden', marginBottom: 24 }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-color)' }}>
            <h2 style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>My Referrals</h2>
          </div>
          <div style={{ overflowX: 'auto' as const }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' as const }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
                  {['Customer', 'Total Orders', 'Total Spent', 'Your Commission'].map(h => (
                    <th key={h} style={{ padding: '10px 20px', textAlign: 'left' as const, fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' as const, letterSpacing: '0.06em', fontFamily: 'Montserrat' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {referrals.map(ref => (
                  <tr key={ref.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px 20px' }}>
                      <div style={{ fontFamily: 'Montserrat', fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>
                        {ref.profiles?.first_name} {ref.profiles?.last_name}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{ref.profiles?.email}</div>
                    </td>
                    <td style={{ padding: '12px 20px', fontSize: 14, color: 'var(--text-primary)', fontFamily: 'Montserrat', fontWeight: 600 }}>{ref.total_orders}</td>
                    <td style={{ padding: '12px 20px', fontSize: 14, color: 'var(--text-primary)', fontFamily: 'Montserrat', fontWeight: 600 }}>₦{Number(ref.total_spent).toLocaleString()}</td>
                    <td style={{ padding: '12px 20px', fontSize: 14, color: '#10b981', fontFamily: 'Montserrat', fontWeight: 700 }}>₦{Number(ref.total_commission).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Commission history */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-color)' }}>
          <h2 style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>Commission History</h2>
        </div>
        {commissions.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' as const }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
            <div style={{ fontFamily: 'Montserrat', fontWeight: 600, fontSize: 15, color: 'var(--text-primary)', marginBottom: 6 }}>No commissions yet</div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Share your referral link to start earning.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' as const }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' as const }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
                  {['Order', 'Order Total', 'Rate', 'Commission', 'Status', 'Date'].map(h => (
                    <th key={h} style={{ padding: '10px 20px', textAlign: 'left' as const, fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' as const, letterSpacing: '0.06em', fontFamily: 'Montserrat' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {commissions.map(comm => (
                  <tr key={comm.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px 20px', fontSize: 13, fontFamily: 'Montserrat', fontWeight: 600, color: 'var(--text-primary)' }}>#{comm.order_id?.slice(0, 8).toUpperCase()}</td>
                    <td style={{ padding: '12px 20px', fontSize: 13, color: 'var(--text-primary)' }}>₦{Number(comm.order_total).toLocaleString()}</td>
                    <td style={{ padding: '12px 20px', fontSize: 13, color: 'var(--text-primary)' }}>{(Number(comm.rate) * 100).toFixed(0)}%</td>
                    <td style={{ padding: '12px 20px', fontSize: 13, fontFamily: 'Montserrat', fontWeight: 700, color: '#10b981' }}>₦{Number(comm.amount).toLocaleString()}</td>
                    <td style={{ padding: '12px 20px' }}>
                      <span style={{ display: 'inline-flex', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, fontFamily: 'Montserrat', background: `${statusColor[comm.status] || '#6b7280'}20`, color: statusColor[comm.status] || '#6b7280' }}>
                        {comm.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 20px', fontSize: 12, color: 'var(--text-secondary)' }}>{new Date(comm.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payout modal */}
      {showPayoutModal && (
        <div style={{ position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 16, width: '100%', maxWidth: 400, padding: 28 }}>
            <h2 style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 18, marginBottom: 8, color: 'var(--text-primary)' }}>Request Payout</h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>Available: ₦{Number(affiliate.pending_payout).toLocaleString()} · Min: ₦5,000</p>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6, color: 'var(--text-primary)' }}>Amount to withdraw (₦)</label>
              <input type="number" value={payoutAmount} onChange={e => setPayoutAmount(e.target.value)}
                placeholder="e.g. 10000" min="5000" max={affiliate.pending_payout} className="form-input" />
            </div>
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 9, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Payment to: <strong style={{ color: 'var(--text-primary)' }}>{bankForm.account_name}</strong> · {bankForm.bank_name} · {bankForm.account_number}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowPayoutModal(false)} style={{ flex: 1, padding: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 600, fontSize: 14, cursor: 'pointer', color: 'var(--text-primary)' }}>Cancel</button>
              <button onClick={handleRequestPayout} disabled={submittingPayout}
                style={{ flex: 2, padding: '12px', background: submittingPayout ? '#ccc' : 'var(--red)', color: 'white', border: 'none', borderRadius: 9, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, cursor: submittingPayout ? 'not-allowed' : 'pointer' }}>
                {submittingPayout ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 900px) { .aff-stats { grid-template-columns: 1fr !important; } .bank-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  )
}