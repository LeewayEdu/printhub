import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Admin-only access to the leads table. Runs with the service key on the server, so it
// keeps working when Row Level Security on `leads` allows no direct browser access.
const STATUSES = ['new', 'contacted', 'quoted', 'won', 'lost']

async function requireAdmin(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const db = supabaseAdmin()
  const { data: { user }, error } = await db.auth.getUser(token)
  if (error || !user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { db }
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (auth.error) return auth.error
  const { data, error } = await auth.db!.from('leads').select('*').order('created_at', { ascending: false }).limit(500)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ leads: data || [] })
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (auth.error) return auth.error
  const { id, status } = await req.json().catch(() => ({}))
  if (!id || !STATUSES.includes(status)) return NextResponse.json({ error: 'Invalid id or status' }, { status: 400 })
  const { error } = await auth.db!.from('leads').update({ status }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
