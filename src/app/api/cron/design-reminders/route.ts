import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { runDesignReminders } from '@/lib/design-reminders'
import { processStampQueue } from '@/lib/books/stamp-queue'

export const dynamic = 'force-dynamic'

// Vercel Cron calls this daily with "Authorization: Bearer <CRON_SECRET>". With no CRON_SECRET set the
// route refuses every request, so it is never open to the public.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  const given = req.headers.get('authorization') || ''
  const expected = `Bearer ${secret || ''}`
  const ok = !!secret && given.length === expected.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected))
  if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = supabaseAdmin()
  const r = await runDesignReminders(db)
  // daily safety sweep for ebook copies that were not stamped yet (see /api/cron/books-stamp); harmless when there are none
  const stamped = await processStampQueue(db, { limit: 3 }).catch(() => null)
  return NextResponse.json({ checked: r.checked, sent: r.sent.length, failed: r.failed, skippedNoEmail: r.skippedNoEmail, stamp: stamped })
}
