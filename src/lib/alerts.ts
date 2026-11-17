// Admin alerts. Uses the same channel the app already uses for order alerts: email through Resend
// to the PrintHub inbox. Failure to send is logged but never throws, so an alert problem can
// never break a payment or a cron run.

import { Resend } from 'resend'

const ALERT_TO = 'info@cchumedia.com'
const ALERT_FROM = 'PrintHub Orders <orders@cchumedia.com>'

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string))
const naira = (n: number) => `₦${Number(n).toLocaleString('en-NG', { maximumFractionDigits: 2 })}`

export async function sendAdminAlert(subject: string, lines: [string, string][], note?: string): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    console.error('[alert] RESEND_API_KEY not set; alert not sent:', subject)
    return false
  }
  const rows = lines.map(([k, v]) =>
    `<tr><td style="padding:6px 0;color:#6B6B6B;font-size:13px;width:170px">${esc(k)}</td><td style="padding:6px 0;font-size:13px;font-weight:600">${esc(v)}</td></tr>`).join('')
  const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:24px auto;border:1px solid #eee;border-radius:10px;overflow:hidden">
<div style="background:#C0392B;color:#fff;padding:18px 24px;font-weight:700;font-size:16px">${esc(subject)}</div>
<div style="padding:20px 24px"><table style="width:100%;border-collapse:collapse">${rows}</table>
${note ? `<p style="font-size:13px;color:#444;line-height:1.6">${esc(note)}</p>` : ''}
<p style="font-size:12px;color:#888">Orders screen: https://printhub.cchumedia.com/dashboard/admin/orders</p></div></div>`
  try {
    const r = await new Resend(process.env.RESEND_API_KEY).emails.send({ from: ALERT_FROM, to: ALERT_TO, subject, html })
    if (r.error) { console.error('[alert] send failed:', JSON.stringify(r.error)); return false }
    return true
  } catch (e: any) {
    console.error('[alert] send threw:', e?.message || e)
    return false
  }
}

export interface PaymentReviewInfo { orderId: string; reference: string; expectedNaira: number; paidNaira: number; currency: string }

/** Sent when an order moves into payment_review (paid amount or currency differs from the order). */
export function alertPaymentReview(i: PaymentReviewInfo) {
  return sendAdminAlert(
    `Payment needs review: order ${i.orderId.slice(0, 8)}`,
    [
      ['Order id', i.orderId],
      ['Paystack reference', i.reference],
      ['Expected amount', naira(i.expectedNaira)],
      ['Amount paid', `${naira(i.paidNaira)} ${i.currency}`],
    ],
    'The customer paid an amount or currency that does not match this order, so it was held as payment_review and not marked paid. Check the transaction in Paystack, then decide whether to accept it, ask for the difference, or refund.',
  )
}
