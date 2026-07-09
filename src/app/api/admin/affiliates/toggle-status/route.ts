import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = supabaseAdmin()

    // Verify the caller's identity and role server-side
    const { data: { user: caller }, error: authErr } = await db.auth.getUser(token)
    if (authErr || !caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: callerProfile } = await db
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .single()

    if (!callerProfile || !['admin', 'super_admin'].includes(callerProfile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { affiliateId, isActive } = await req.json()
    if (!affiliateId || typeof isActive !== 'boolean') {
      return NextResponse.json({ error: 'Missing affiliateId or isActive' }, { status: 400 })
    }

    const { error } = await db
      .from('affiliates')
      .update({ is_active: isActive })
      .eq('id', affiliateId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Fetch referral code for the audit note
    const { data: aff } = await db
      .from('affiliates')
      .select('referral_code')
      .eq('id', affiliateId)
      .single()

    try {
      await db.from('admin_audit_logs').insert({
        admin_id: caller.id,
        action: isActive ? 'enable_affiliate' : 'disable_affiliate',
        target_entity_id: affiliateId,
        note: `Affiliate ${aff?.referral_code || affiliateId} ${isActive ? 'enabled' : 'disabled'}`,
      })
    } catch { /* audit log table may not exist yet */ }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
