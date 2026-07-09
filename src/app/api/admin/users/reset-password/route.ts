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

    const { targetEmail, targetUserId } = await req.json()
    if (!targetEmail) return NextResponse.json({ error: 'Missing targetEmail' }, { status: 400 })

    // Send the standard Supabase password-recovery email (same link the user
    // would receive via "Forgot Password" — admin never sees or sets the password)
    const { error } = await db.auth.admin.generateLink({
      type: 'recovery',
      email: targetEmail,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://printhub.cchumedia.com'}/auth/update-password`,
      },
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Log the action — table created by admin-audit-log-migration.sql
    // Wrapped in its own try/catch so a missing table never blocks the primary action
    try {
      await db.from('admin_audit_logs').insert({
        admin_id: caller.id,
        action: 'reset_password',
        target_user_id: targetUserId || null,
        target_email: targetEmail,
        note: `Password reset email sent to ${targetEmail}`,
      })
    } catch { /* audit log table may not exist yet */ }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
