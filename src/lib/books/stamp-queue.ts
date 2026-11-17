// Buyer-name stamping in the BACKGROUND. After a verified payment the entitlement is queued (stamp_status
// 'pending'); a secret-protected job route makes the stamped copies and stores them privately; the download
// route only ever serves a stored copy, so no download request waits for a large PDF to be processed.

import type { SupabaseClient } from '@supabase/supabase-js'
import { SITE_URL } from '@/lib/site-url'
import { getOrCreateStamped } from './download'

export const MAX_EBOOK_MB_DEFAULT = 30          // proposed default, editable in Admin > Books > settings (books_settings.max_ebook_mb)
export const MAX_STAMP_ATTEMPTS = 3
export const STALE_PROCESSING_MS = 10 * 60 * 1000
export const PREPARING_MESSAGE = 'Preparing your copy, check back in a few minutes.'

export const maxEbookBytes = (settings: { max_ebook_mb?: number | string | null } | null | undefined): number => {
  const mb = Number(settings?.max_ebook_mb)
  return (Number.isFinite(mb) && mb >= 1 ? Math.min(mb, 500) : MAX_EBOOK_MB_DEFAULT) * 1024 * 1024
}

export type Readiness =
  | { state: 'ready'; path: string }
  | { state: 'preparing' }
  | { state: 'failed' }

/** What the download route should do for this entitlement and file type. Pure. */
export function downloadReadiness(ent: { stamp_status?: string | null; stamp_attempts?: number | null; stamped_pdf_path?: string | null; stamped_epub_path?: string | null }, type: 'pdf' | 'epub'): Readiness {
  const path = type === 'pdf' ? ent.stamped_pdf_path : ent.stamped_epub_path
  if (ent.stamp_status === 'ready' && path && path.startsWith('watermarked/')) return { state: 'ready', path }
  if (ent.stamp_status === 'failed' && Number(ent.stamp_attempts) >= MAX_STAMP_ATTEMPTS) return { state: 'failed' }
  return { state: 'preparing' }
}

export interface StampRunResult { claimed: number; ready: number; failed: number; skipped: number }

async function sourcePaths(db: SupabaseClient, ent: any) {
  const { data: fmt } = await db.from('book_formats').select('ebook_pdf_path, ebook_epub_path').eq('id', ent.book_format_id).maybeSingle()
  let paths = fmt
  if (!paths?.ebook_pdf_path && !paths?.ebook_epub_path) {         // a bundle's files live on the book's ebook format
    const { data: eb } = await db.from('book_formats').select('ebook_pdf_path, ebook_epub_path').eq('book_id', ent.book_id).eq('type', 'ebook').maybeSingle()
    paths = eb
  }
  return { pdf: paths?.ebook_pdf_path as string | undefined, epub: paths?.ebook_epub_path as string | undefined }
}

/**
 * Makes the stamped copies for queued entitlements. Safe to run often and in parallel: each entitlement is claimed with a
 * compare-and-set on its status, finished work is never redone, and a failure is counted and retried up to MAX_STAMP_ATTEMPTS.
 */
export async function processStampQueue(
  db: SupabaseClient,
  opts: { entitlementId?: string; limit?: number; now?: Date; stamp?: typeof getOrCreateStamped } = {},
): Promise<StampRunResult> {
  const now = opts.now || new Date()
  const stamp = opts.stamp || getOrCreateStamped
  const result: StampRunResult = { claimed: 0, ready: 0, failed: 0, skipped: 0 }

  let q = db.from('entitlements').select('*')
  q = opts.entitlementId ? q.eq('id', opts.entitlementId) : q.in('stamp_status', ['pending', 'failed', 'processing'])
  const { data } = await q.limit(opts.limit ?? 5)
  const candidates = ((data || []) as any[]).filter(e => {
    if (e.revoked_at) return false
    if (e.stamp_status === 'ready') return false
    if (e.stamp_status === 'failed' && Number(e.stamp_attempts) >= MAX_STAMP_ATTEMPTS) return false
    if (e.stamp_status === 'processing' && e.stamp_started_at && now.getTime() - new Date(e.stamp_started_at).getTime() < STALE_PROCESSING_MS) return false   // someone is on it
    return true
  })

  for (const ent of candidates) {
    // claim: only one runner wins
    const { data: won } = await db.from('entitlements')
      .update({ stamp_status: 'processing', stamp_started_at: now.toISOString() })
      .eq('id', ent.id).eq('stamp_status', ent.stamp_status).select('id')
    if (!won || won.length === 0) { result.skipped++; continue }
    result.claimed++

    try {
      const src = await sourcePaths(db, ent)
      if (!src.pdf && !src.epub) throw new Error('the book has no ebook file')
      const { data: profile } = await db.from('profiles').select('first_name, last_name, email').eq('id', ent.user_id).maybeSingle()
      const label = `${[profile?.first_name, profile?.last_name].filter(Boolean).join(' ')} <${profile?.email || ent.user_id}>`
      const out: { stamped_pdf_path?: string; stamped_epub_path?: string } = {}
      if (src.pdf) { const p = await stamp(db, ent.id, 'pdf', src.pdf, label); if (!p) throw new Error('the PDF could not be stamped'); out.stamped_pdf_path = p }
      if (src.epub) { const p = await stamp(db, ent.id, 'epub', src.epub, label); if (!p) throw new Error('the EPUB could not be stamped'); out.stamped_epub_path = p }
      await db.from('entitlements').update({ ...out, stamp_status: 'ready', stamp_error: null }).eq('id', ent.id)
      result.ready++
    } catch (e: any) {
      await db.from('entitlements').update({ stamp_status: 'failed', stamp_attempts: Number(ent.stamp_attempts || 0) + 1, stamp_error: String(e?.message || e).slice(0, 300) }).eq('id', ent.id)
      result.failed++
    }
  }
  return result
}

/**
 * On-demand trigger: asks the secret-protected job route to run now. The request is dispatched and then not waited for
 * (only long enough to be sent), so the caller never waits for the stamping. Without CRON_SECRET nothing is sent and the
 * daily sweep picks the work up instead.
 */
export async function triggerStampJob(entitlementId?: string): Promise<boolean> {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  try {
    const url = `${SITE_URL}/api/cron/books-stamp${entitlementId ? `?entitlement=${encodeURIComponent(entitlementId)}` : ''}`
    await Promise.race([
      fetch(url, { headers: { Authorization: `Bearer ${secret}` }, cache: 'no-store' }).catch(() => null),
      new Promise(r => setTimeout(r, 1500)),
    ])
    return true
  } catch { return false }
}
