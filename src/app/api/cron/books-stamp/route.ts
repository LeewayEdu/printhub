import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { processStampQueue } from '@/lib/books/stamp-queue'

export const dynamic = 'force-dynamic'
export const maxDuration = 60   // stamping a large PDF takes a while (Vercel plan limits apply)

// Makes the buyer-stamped copies of purchased ebooks. Protected by CRON_SECRET exactly like the other jobs: with no
// secret configured the route refuses every request. Called on demand right after a verified payment, when a customer
// asks for a copy that is not ready, and as a daily safety sweep. Optional ?entitlement=<id> processes just that one.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  const given = req.headers.get('authorization') || ''
  const expected = `Bearer ${secret || ''}`
  const ok = !!secret && given.length === expected.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected))
  if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('entitlement') || undefined
  if (id && !/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Bad entitlement id' }, { status: 400 })
  const r = await processStampQueue(supabaseAdmin(), { entitlementId: id, limit: id ? 1 : 5 })
  return NextResponse.json(r)
}
