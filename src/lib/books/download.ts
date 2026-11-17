// Entitlement and download rules, and the issuing of short-lived signed URLs. A download never returns
// a public URL: the file lives in the private bucket and the customer gets a link that expires.

import type { SupabaseClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { stampEpub, stampPdf } from './stamp'

export const PRIVATE_BUCKET = 'book-files'
export const SIGNED_URL_SECONDS = 600          // about 10 minutes
export const DEFAULT_MAX_DOWNLOADS = 5

export type DownloadDecision = { ok: true } | { ok: false; reason: 'revoked' | 'limit_reached' | 'not_found' }

/** The three checks every download must pass: it exists, it is not revoked, the limit is not used up. */
export function authorizeDownload(e: { revoked_at: string | null; download_count: number; max_downloads: number } | null): DownloadDecision {
  if (!e) return { ok: false, reason: 'not_found' }
  if (e.revoked_at) return { ok: false, reason: 'revoked' }
  if (Number(e.download_count) >= Number(e.max_downloads)) return { ok: false, reason: 'limit_reached' }
  return { ok: true }
}

export const REASON_TEXT: Record<string, string> = {
  revoked: 'This download is no longer available (the order was refunded or the access was withdrawn).',
  limit_reached: 'You have used all your downloads for this book. Please contact us if you need another copy.',
  not_found: 'We could not find that purchase.',
}

/** Salted hash of the IP so the log can show repeat use without storing the address itself */
export function hashIp(ip: string): string {
  const salt = process.env.DOWNLOAD_LOG_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || 'cchu-books'
  return crypto.createHash('sha256').update(`${salt}:${ip}`).digest('hex').slice(0, 32)
}

/** Paths for stamped copies use the entitlement id (a random uuid) and live in the private bucket */
export const stampedPath = (entitlementId: string, type: 'pdf' | 'epub') => `watermarked/${entitlementId}.${type}`

export const isPublicBucketPath = (path: string) => !path.startsWith('watermarked/') && !path.startsWith('ebooks/')

export async function issueSignedUrl(db: SupabaseClient, path: string): Promise<string | null> {
  const { data, error } = await db.storage.from(PRIVATE_BUCKET).createSignedUrl(path, SIGNED_URL_SECONDS)
  return error || !data?.signedUrl ? null : data.signedUrl
}

/** Returns the path of the buyer-stamped copy, making and caching it on first use. */
export async function getOrCreateStamped(db: SupabaseClient, entitlementId: string, type: 'pdf' | 'epub', sourcePath: string, label: string): Promise<string | null> {
  const target = stampedPath(entitlementId, type)
  const bucket = db.storage.from(PRIVATE_BUCKET)
  const { data: existing } = await bucket.list('watermarked', { search: `${entitlementId}.${type}`, limit: 1 })
  if (existing && existing.some(f => f.name === `${entitlementId}.${type}`)) return target

  const { data: blob, error } = await bucket.download(sourcePath)
  if (error || !blob) return null
  const bytes = new Uint8Array(await blob.arrayBuffer())
  const stamped = type === 'pdf' ? await stampPdf(bytes, label) : stampEpub(bytes, label)
  const { error: upErr } = await bucket.upload(target, stamped, {
    contentType: type === 'pdf' ? 'application/pdf' : 'application/epub+zip', upsert: true,
  })
  return upErr ? null : target
}
