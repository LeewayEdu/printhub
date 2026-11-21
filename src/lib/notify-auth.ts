// Who may call /api/notify. It sends email (to the shop and to the customer) from the shop's own address, so it must not be open.
//  - 'secret': a server caller (the Paystack webhook) that sends the shared secret in x-notify-secret.
//  - 'user'  : a signed-in customer's browser (the checkout page) sending its session token; the route then checks the order is theirs.
//  - 'none'  : refused.
// The shared secret is NOTIFY_SECRET; until that is set, CRON_SECRET (already required for the cron jobs) is used. With neither set,
// no secret ever matches, so the route stays closed rather than open.
import { timingSafeEqual } from 'node:crypto'

export type NotifyCaller = { mode: 'secret' } | { mode: 'user'; token: string } | { mode: 'none' }

export function notifySecret(env: Record<string, string | undefined> = process.env): string {
  return (env.NOTIFY_SECRET || env.CRON_SECRET || '').trim()
}

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a), y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

export function identifyNotifyCaller(headers: { get(name: string): string | null }, env: Record<string, string | undefined> = process.env): NotifyCaller {
  const secret = notifySecret(env)
  const sent = (headers.get('x-notify-secret') || '').trim()
  if (secret && sent && safeEqual(sent, secret)) return { mode: 'secret' }
  const m = /^Bearer\s+(.+)$/i.exec((headers.get('authorization') || '').trim())
  if (m && m[1] && m[1] !== secret) return { mode: 'user', token: m[1] }
  return { mode: 'none' }
}

/** The short id shown to people (first 8 characters of the order id, upper case). */
export const shortOrderId = (id: string) => String(id).slice(0, 8).toUpperCase()

/** Escape text before it goes inside the HTML of an email. */
export function escapeHtml(v: unknown): string {
  return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}
