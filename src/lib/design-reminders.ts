// Sends the "please send your design file" reminders. Channel: email through Resend, the same channel
// the app already uses for order emails. The email carries a WhatsApp click-to-chat link to the PrintHub
// number so the customer can send the file there. Nothing is sent to customers by WhatsApp itself: the
// WhatsApp providers in the app (UltraMsg / CallMeBot) are only set up to alert the owner, and are off.
//
// Double sends are prevented by a record in admin_audit_logs (action design_reminder_24h / _72h,
// target_entity_id = order id). The record is written BEFORE sending and removed if sending fails.

import type { SupabaseClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { SITE_URL } from '@/lib/site-url'
import { BRAND } from '@/lib/constants'
const WHATSAPP = BRAND.whatsapp
import { REMINDER_ORDER_STATUSES, reminderAction, selectDueReminders, type ReminderKind, type ReminderCandidate } from '@/lib/design-status'

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string))

export type Mailer = (to: string, subject: string, html: string) => Promise<boolean>

export const resendMailer: Mailer = async (to, subject, html) => {
  if (!process.env.RESEND_API_KEY) return false
  try {
    const r = await new Resend(process.env.RESEND_API_KEY).emails.send({ from: 'PrintHub Orders <orders@cchumedia.com>', to, subject, html })
    return !r.error
  } catch { return false }
}

export function reminderEmail(o: { id: string; first_name?: string | null; job_number?: string | null }, kind: ReminderKind) {
  const ref = o.job_number || o.id.slice(0, 8).toUpperCase()
  const link = `${SITE_URL}/dashboard/orders?order=${o.id}`
  const wa = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(`Hello, I am sending the design file for order #${ref}`)}`
  const subject = kind === '24h' ? `Please send your design file for order #${ref}` : `Reminder: we are still waiting for your design file (order #${ref})`
  const html = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:24px auto;border:1px solid #eee;border-radius:10px;overflow:hidden">
<div style="background:#C0392B;color:#fff;padding:18px 24px;font-weight:700;font-size:16px">PrintHub: design file needed</div>
<div style="padding:22px 24px;font-size:14px;line-height:1.7;color:#222">
<p>Hi ${esc(o.first_name || 'there')},</p>
<p>Thank you for your order #${esc(ref)}. We have your payment, but <strong>we will not start printing until we have your design file</strong>.</p>
<p><a href="${link}" style="display:inline-block;background:#C0392B;color:#fff;text-decoration:none;font-weight:700;padding:11px 22px;border-radius:8px">Upload your design file</a></p>
<p>Prefer WhatsApp? <a href="${wa}">Send it to us on WhatsApp</a>. If you would rather we design it for you, reply to this email or message us.</p>
<p style="font-size:12px;color:#888">PrintHub by C-Chu Media Limited · Suite 38, Mazfallah Shopping Complex, Karu, Abuja</p>
</div></div>`
  return { subject, html }
}

export interface ReminderRunResult { checked: number; sent: { orderId: string; kind: ReminderKind }[]; failed: number; skippedNoEmail: number }

export async function runDesignReminders(db: SupabaseClient, opts: { now?: Date; mailer?: Mailer } = {}): Promise<ReminderRunResult> {
  const now = opts.now || new Date()
  const mailer = opts.mailer || resendMailer

  const { data: orders } = await db.from('orders')
    .select('*')   // '*' so it also works before the is_test column exists
    .in('status', REMINDER_ORDER_STATUSES).limit(500)
  const real = (orders || []).filter((o: any) => !o.is_test)
  if (real.length === 0) return { checked: 0, sent: [], failed: 0, skippedNoEmail: 0 }

  const ids = real.map((o: any) => o.id)
  const { data: items } = await db.from('order_items').select('order_id, has_own_design, design_file_url, design_link').in('order_id', ids)
  const byOrder = new Map<string, any[]>()
  for (const it of items || []) byOrder.set(it.order_id, [...(byOrder.get(it.order_id) || []), it])

  const { data: logs } = await db.from('admin_audit_logs').select('target_entity_id, action').in('target_entity_id', ids)
  const sentSet = new Set<string>()
  for (const l of logs || []) {
    if (l.action === reminderAction('24h')) sentSet.add(`${l.target_entity_id}:24h`)
    if (l.action === reminderAction('72h')) sentSet.add(`${l.target_entity_id}:72h`)
  }

  const candidates: ReminderCandidate[] = real.map((o: any) => ({ ...o, items: byOrder.get(o.id) || [] }))
  const due = selectDueReminders(candidates, sentSet, now)
  const result: ReminderRunResult = { checked: candidates.length, sent: [], failed: 0, skippedNoEmail: candidates.filter(c => !c.email).length }

  for (const d of due) {
    const order: any = real.find((o: any) => o.id === d.orderId)
    // Claim first so two overlapping runs cannot both send; undo the claim if the email fails
    const claim = await db.from('admin_audit_logs').insert({ action: reminderAction(d.kind), target_entity_id: d.orderId, note: 'Design file reminder by email' }).select('id').single()
    if (claim.error || !claim.data) { result.failed++; continue }   // cannot record it, so do not send it
    const { subject, html } = reminderEmail(order, d.kind)
    const ok = await mailer(order.email, subject, html)
    if (ok) result.sent.push(d)
    else { result.failed++; await db.from('admin_audit_logs').delete().eq('id', claim.data.id) }
  }
  return result
}
