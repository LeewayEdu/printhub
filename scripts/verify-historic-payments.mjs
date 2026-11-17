// Read-only check of historic Paystack orders.
// Usage: node --env-file=.env.local scripts/verify-historic-payments.mjs
// Reads orders (SELECT only) and asks Paystack to verify each reference (GET only).
// Never prints keys, never writes to the database or to Paystack.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const dbKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const psKey = process.env.PAYSTACK_SECRET_KEY
if (!url || !dbKey || !psKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or PAYSTACK_SECRET_KEY in the environment.')
  process.exit(1)
}

const PAID_OR_LATER = ['paid', 'processing', 'shipped', 'delivered']
const q = `${url}/rest/v1/orders?select=id,status,total_amount,paystack_reference,created_at` +
  `&paystack_reference=not.is.null&status=in.(${PAID_OR_LATER.join(',')})&order=created_at.asc`

const res = await fetch(q, { headers: { apikey: dbKey, Authorization: `Bearer ${dbKey}` } })
if (!res.ok) { console.error('Could not read orders: HTTP', res.status); process.exit(1) }
const orders = await res.json()

const rows = []
for (const o of orders) {
  let psAmount = '', psStatus = '', note = ''
  try {
    const r = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(o.paystack_reference)}`, {
      method: 'GET', headers: { Authorization: `Bearer ${psKey}` },
    })
    const j = await r.json().catch(() => ({}))
    if (!r.ok || !j?.data) { psStatus = `HTTP ${r.status}`; note = j?.message || 'not found at Paystack' }
    else {
      psStatus = j.data.status
      psAmount = (Number(j.data.amount) / 100).toFixed(2)
      if (j.data.currency !== 'NGN') note = `currency ${j.data.currency}`
    }
  } catch (e) { psStatus = 'error'; note = e.message }
  const orderAmt = Number(o.total_amount)
  const flags = []
  if (psStatus !== 'success') flags.push('NOT SUCCESS')
  if (psAmount !== '' && Math.abs(Number(psAmount) - orderAmt) > 1) flags.push('AMOUNT MISMATCH')
  if (note) flags.push(note)
  rows.push({
    order: o.id.slice(0, 8), reference: o.paystack_reference, order_status: o.status,
    order_amount: orderAmt.toFixed(2), paystack_amount: psAmount || '-', paystack_status: psStatus,
    flag: flags.length ? flags.join('; ') : 'ok',
  })
}
console.table(rows)
const bad = rows.filter(r => r.flag !== 'ok')
console.log(`${rows.length} orders checked, ${bad.length} flagged.`)
