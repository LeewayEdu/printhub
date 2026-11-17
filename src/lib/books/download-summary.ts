// What an admin needs to decide an ebook refund under the digital refund policy: was the file downloaded, how many
// times, and when last. Counts and times only: no IP hash, no browser details, no buyer details.

import type { SupabaseClient } from '@supabase/supabase-js'

export interface EbookDownloadRow {
  entitlementId: string
  title: string
  downloads: number
  lastDownloadedAt: string | null
  revoked: boolean
}

/** One row per ebook entitlement on the order. Nothing is written. */
export async function ebookDownloadsForOrder(db: SupabaseClient, orderId: string): Promise<EbookDownloadRow[]> {
  const { data: ents } = await db.from('entitlements').select('id, book_id, download_count, revoked_at').eq('order_id', orderId)
  const list = (ents || []) as any[]
  if (list.length === 0) return []

  const bookIds = Array.from(new Set(list.map(e => e.book_id)))
  const { data: books } = await db.from('books').select('id, title').in('id', bookIds)
  const titles = new Map(((books || []) as any[]).map(b => [b.id, b.title as string]))

  const { data: logs } = await db.from('download_log').select('entitlement_id, downloaded_at').in('entitlement_id', list.map(e => e.id))
  const last = new Map<string, string>()
  for (const l of (logs || []) as any[]) {
    const prev = last.get(l.entitlement_id)
    if (!prev || new Date(l.downloaded_at) > new Date(prev)) last.set(l.entitlement_id, l.downloaded_at)
  }

  return list.map(e => ({
    entitlementId: e.id,
    title: titles.get(e.book_id) || 'Book',
    downloads: Number(e.download_count) || 0,
    lastDownloadedAt: last.get(e.id) || null,
    revoked: !!e.revoked_at,
  }))
}
