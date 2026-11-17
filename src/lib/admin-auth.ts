import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase'

/** Same check the other admin routes make: a valid session token whose profile role is admin or super_admin. */
export async function requireAdmin(req: NextRequest): Promise<{ db: SupabaseClient; user: User } | NextResponse> {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = supabaseAdmin()
  const { data: { user }, error } = await db.auth.getUser(token)
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'super_admin'].includes(profile.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return { db, user }
}

export const isResponse = (x: unknown): x is NextResponse => x instanceof NextResponse
