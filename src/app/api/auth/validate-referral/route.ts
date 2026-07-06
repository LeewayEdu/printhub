import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')?.trim().toUpperCase()

  if (!code) {
    return NextResponse.json({ valid: false })
  }

  try {
    const db = supabaseAdmin()
    const { data } = await db
      .from('affiliates')
      .select('id')
      .eq('referral_code', code)
      .eq('is_active', true)
      .maybeSingle()

    return NextResponse.json({ valid: !!data })
  } catch {
    return NextResponse.json({ valid: false })
  }
}
