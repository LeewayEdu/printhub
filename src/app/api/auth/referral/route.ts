import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { userId, referralCode } = await req.json()

    if (!userId || !referralCode) {
      return NextResponse.json({ ok: true })
    }

    const db = supabaseAdmin()

    // Look up the affiliate by referral code.
    // Select * so we can detect whether the owner FK is called
    // profile_id or user_id (live DB may differ from schema file).
    const { data: aff } = await db
      .from('affiliates')
      .select('*')
      .eq('referral_code', String(referralCode).trim().toUpperCase())
      .eq('is_active', true)
      .single()

    if (!aff) {
      return NextResponse.json({ ok: true })
    }

    // Resolve the FK column name — same defensive pattern as admin affiliates page
    const ownerField = 'profile_id' in aff ? 'profile_id' : 'user_id'
    const affiliateOwnerId = aff[ownerField]

    // Prevent self-referral
    if (affiliateOwnerId === userId) {
      return NextResponse.json({ ok: true })
    }

    // Check the new user's profile exists and isn't already attributed to someone
    const { data: profile } = await db
      .from('profiles')
      .select('id, referred_by')
      .eq('id', userId)
      .single()

    if (!profile) {
      console.error('Referral: profile not found for new user', userId)
      return NextResponse.json({ ok: true })
    }

    if (profile.referred_by) {
      return NextResponse.json({ ok: true })
    }

    // ── 1. Set referred_by on the new user's profile ──────────────────────
    await db
      .from('profiles')
      .update({ referred_by: affiliateOwnerId })
      .eq('id', userId)

    // ── 2. Increment total_referrals on the affiliate ─────────────────────
    await db
      .from('affiliates')
      .update({ total_referrals: (Number(aff.total_referrals) || 0) + 1 })
      .eq('id', aff.id)

    // ── 3. Insert a row in the referrals table ────────────────────────────
    const { error: refErr } = await db
      .from('referrals')
      .upsert(
        { affiliate_id: aff.id, profile_id: userId, total_orders: 0, total_spent: 0, total_commission: 0 },
        { onConflict: 'affiliate_id,profile_id', ignoreDuplicates: true },
      )

    if (refErr) {
      console.error('Referral: referrals table insert failed —', refErr.message, '(run referral-system-migration.sql)')
    }

    console.log(`✅ Referral attributed: user ${userId} → affiliate ${aff.id} (code: ${referralCode})`)
    return NextResponse.json({ ok: true })

  } catch (err: any) {
    console.error('Referral API error:', err.message)
    return NextResponse.json({ ok: true }) // always 200 — account creation must not be blocked
  }
}
