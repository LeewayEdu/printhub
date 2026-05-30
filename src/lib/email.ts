import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export interface OrderEmailData {
  orderId: string
  customerName: string
  customerEmail: string
  customerPhone: string
  items: { name: string; displayQty?: string; price: number }[]
  subtotal: number
  deliveryFee: number
  total: number
  deliveryArea: string
  address: string
  paymentMethod: string
  paystackRef?: string
}

export async function sendOrderNotificationEmail(order: OrderEmailData) {
  const itemsHtml = order.items
    .map(
      item => `
      <tr>
        <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#2C2C2C">
          ${item.name}${item.displayQty ? ` <span style="color:#6B6B6B">(${item.displayQty})</span>` : ''}
        </td>
        <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#2C2C2C;text-align:right;font-weight:700">
          ₦${Number(item.price).toLocaleString()}
        </td>
      </tr>`
    )
    .join('')

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;padding:0;background:#F7F7F5;font-family:'Open Sans',Arial,sans-serif">
      <div style="max-width:580px;margin:32px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">

        <!-- Header -->
        <div style="background:#C0392B;padding:28px 32px">
          <div style="fontFamily:Montserrat,Arial,sans-serif;font-weight:900;font-size:22px;color:white;letter-spacing:-0.5px">
            📦 New PrintHub Order
          </div>
          <div style="font-size:13px;color:rgba(255,255,255,0.75);margin-top:4px">
            Order #${order.orderId} has just been placed
          </div>
        </div>

        <!-- Customer details -->
        <div style="padding:24px 32px;border-bottom:1px solid #F0F0F0">
          <div style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#C0392B;margin-bottom:14px">Customer Details</div>
          <table style="width:100%;border-collapse:collapse">
            <tr>
              <td style="padding:5px 0;font-size:12px;color:#6B6B6B;width:130px">Name</td>
              <td style="padding:5px 0;font-size:13px;color:#1A1A1A;font-weight:600">${order.customerName}</td>
            </tr>
            <tr>
              <td style="padding:5px 0;font-size:12px;color:#6B6B6B">Email</td>
              <td style="padding:5px 0;font-size:13px;color:#1A1A1A">${order.customerEmail}</td>
            </tr>
            <tr>
              <td style="padding:5px 0;font-size:12px;color:#6B6B6B">Phone</td>
              <td style="padding:5px 0;font-size:13px;color:#1A1A1A">${order.customerPhone}</td>
            </tr>
            <tr>
              <td style="padding:5px 0;font-size:12px;color:#6B6B6B">Delivery</td>
              <td style="padding:5px 0;font-size:13px;color:#1A1A1A">${order.deliveryArea}${order.address ? ` — ${order.address}` : ''}</td>
            </tr>
            <tr>
              <td style="padding:5px 0;font-size:12px;color:#6B6B6B">Payment</td>
              <td style="padding:5px 0;font-size:13px;color:#1A1A1A">
                ${order.paymentMethod === 'paystack' ? '💳 Paystack' : '🏦 Bank Transfer'}
                ${order.paystackRef ? ` <span style="color:#6B6B6B;font-size:11px">(${order.paystackRef})</span>` : ''}
              </td>
            </tr>
          </table>
        </div>

        <!-- Order items -->
        <div style="padding:24px 32px;border-bottom:1px solid #F0F0F0">
          <div style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#C0392B;margin-bottom:14px">Items Ordered</div>
          <table style="width:100%;border-collapse:collapse">
            <thead>
              <tr style="background:#F7F7F5">
                <th style="padding:10px 14px;font-size:11px;font-weight:700;color:#6B6B6B;text-align:left;text-transform:uppercase;letter-spacing:0.08em">Product</th>
                <th style="padding:10px 14px;font-size:11px;font-weight:700;color:#6B6B6B;text-align:right;text-transform:uppercase;letter-spacing:0.08em">Amount</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>
        </div>

        <!-- Totals -->
        <div style="padding:20px 32px;border-bottom:1px solid #F0F0F0">
          <table style="width:100%;border-collapse:collapse">
            <tr>
              <td style="padding:4px 0;font-size:13px;color:#6B6B6B">Subtotal</td>
              <td style="padding:4px 0;font-size:13px;color:#1A1A1A;text-align:right">₦${Number(order.subtotal).toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;font-size:13px;color:#6B6B6B">Delivery fee</td>
              <td style="padding:4px 0;font-size:13px;color:#1A1A1A;text-align:right">₦${Number(order.deliveryFee).toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding:10px 0 4px;font-size:15px;font-weight:700;color:#1A1A1A;border-top:2px solid #F0F0F0">Total Paid</td>
              <td style="padding:10px 0 4px;font-size:20px;font-weight:900;color:#C0392B;text-align:right;border-top:2px solid #F0F0F0">₦${Number(order.total).toLocaleString()}</td>
            </tr>
          </table>
        </div>

        <!-- CTA -->
        <div style="padding:24px 32px;text-align:center">
          <a href="https://printhub.cchumedia.com/dashboard/admin/orders"
            style="display:inline-block;background:#C0392B;color:white;font-weight:700;font-size:13px;padding:12px 28px;border-radius:8px;text-decoration:none;letter-spacing:0.04em">
            View Order in Dashboard →
          </a>
        </div>

        <!-- Footer -->
        <div style="padding:16px 32px;background:#F7F7F5;text-align:center">
          <div style="font-size:11px;color:#6B6B6B">
            PrintHub by C-Chu Media Limited · Suite 38, Mazfallah Shopping Complex, Karu, Abuja
          </div>
          <div style="font-size:11px;color:#6B6B6B;margin-top:2px">
            +234 805 292 9523 · info@cchumedia.com
          </div>
        </div>

      </div>
    </body>
    </html>
  `

  await resend.emails.send({
    from: 'PrintHub Orders <orders@cchumedia.com>',
    to: 'info@cchumedia.com',
    subject: `🛒 New Order #${order.orderId} — ₦${Number(order.total).toLocaleString()} (${order.paymentMethod === 'paystack' ? 'Paid' : 'Bank Transfer'})`,
    html,
  })
}