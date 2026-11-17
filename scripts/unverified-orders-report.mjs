// Read-only report of paid orders whose Paystack reference Paystack does not recognise.
// Usage: node --env-file=.env.local scripts/unverified-orders-report.mjs
// Reads the database (SELECT only) and Paystack (GET only). Writes docs/unverified-orders.md and
// docs/unverified-orders.csv. Contains no keys. It does contain customer first and last names.
import { writeFileSync } from 'node:fs'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL, dbKey = process.env.SUPABASE_SERVICE_ROLE_KEY, psKey = process.env.PAYSTACK_SECRET_KEY
if (!url || !dbKey || !psKey) { console.error('Missing environment variables.'); process.exit(1) }
const H = { apikey: dbKey, Authorization: `Bearer ${dbKey}` }
const get = async path => { const r = await fetch(`${url}/rest/v1/${path}`, { headers: H }); if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`); return r.json() }
const money = n => `₦${Number(n).toLocaleString('en-NG')}`

const orders = await get('orders?select=id,created_at,status,total_amount,paystack_reference,first_name,last_name,user_id&paystack_reference=not.is.null&status=in.(paid,processing,shipped,delivered)&order=created_at.asc')
const rows = []
let verifiedCount = 0
for (const o of orders) {
  const r = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(o.paystack_reference)}`, { method: 'GET', headers: { Authorization: `Bearer ${psKey}` } })
  const j = await r.json().catch(() => ({}))
  if (r.ok && j?.data?.status === 'success' && Math.abs(Number(j.data.amount) / 100 - Number(o.total_amount)) <= 1) { verifiedCount++; continue }
  const [items, logA, logB, comm] = await Promise.all([
    get(`order_items?select=name,price&order_id=eq.${o.id}`),
    get(`loyalty_log?select=points,type&order_id=eq.${o.id}`),
    get(`loyalty_transactions?select=points,type&order_id=eq.${o.id}`),
    get(`commissions?select=amount,status&order_id=eq.${o.id}`),
  ])
  const sum = l => l.reduce((a, x) => a + Number(x.points || 0), 0)
  rows.push({
    id: o.id.slice(0, 8), reference: o.paystack_reference, date: o.created_at.slice(0, 10), amount: Number(o.total_amount), status: o.status,
    customer: `${o.first_name || ''} ${o.last_name || ''}`.trim(), items: items.map(i => i.name).join('; '),
    delivered: o.status === 'delivered' ? 'yes' : 'no',
    points_log: sum(logA), points_transactions: sum(logB), commission: comm.reduce((a, x) => a + Number(x.amount || 0), 0),
    paystack_says: r.ok ? `${j.data?.status}, ${Number(j.data?.amount) / 100}` : (j?.message || `HTTP ${r.status}`),
  })
}

const csvCell = v => `"${String(v).replace(/"/g, '""')}"`
const cols = ['id', 'reference', 'date', 'amount', 'status', 'customer', 'items', 'delivered', 'points_log', 'points_transactions', 'commission', 'paystack_says']
writeFileSync('docs/unverified-orders.csv', [cols.join(','), ...rows.map(r => cols.map(c => csvCell(r[c])).join(','))].join('\n') + '\n')

// Which order carries each commission, and is it one Paystack verified?
const commissions = await get('commissions?select=order_id,amount,rate,affiliate_id,referred_customer,status')
const unverifiedIds = new Set(rows.map(r => r.id))
const commLines = []
for (const c of commissions) {
  const [o] = await get(`orders?select=id,status,total_amount,paystack_reference,first_name,last_name,user_id&id=eq.${c.order_id}`)
  const [aff] = await get(`affiliates?select=referral_code&id=eq.${c.affiliate_id}`)
  const ref = o?.paystack_reference ? await (await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(o.paystack_reference)}`, { method: 'GET', headers: { Authorization: `Bearer ${psKey}` } })).json().catch(() => ({})) : {}
  const ok = ref?.data?.status === 'success' && Math.abs(Number(ref.data.amount) / 100 - Number(o.total_amount)) <= 1
  commLines.push(`- Commission ${money(c.amount)} (${c.rate * 100}% of ${money(o.total_amount)}, ${c.status}) for affiliate ${aff?.referral_code || '?'} was awarded on order **${c.order_id.slice(0, 8)}** (${o.first_name} ${o.last_name}, ${o.status}). Paystack verification of that order: **${ok ? 'success, same amount' : 'NOT verified'}**. Order is ${unverifiedIds.has(c.order_id.slice(0, 8)) ? 'in the unrecognised list above' : 'not in the unrecognised list'}; referred customer matches order owner: ${c.referred_customer === o.user_id ? 'yes' : 'NO'}.`)
}

const tot = rows.reduce((a, r) => a + r.amount, 0)
const md = `# Paid orders that Paystack does not recognise

Generated read-only on ${new Date().toISOString().slice(0, 10)} by \`scripts/unverified-orders-report.mjs\`. Nothing was changed.
Contains customer names (no emails, phone numbers or keys). Keep this repository private.

Paystack was asked about every order that is paid or later and carries a reference. ${verifiedCount} matched Paystack (success and the same amount);
**${rows.length}** were not found by the live account, worth ${money(tot)} in total.

| Order | Reference | Date | Amount | Status | Customer | Delivered | Points (log / transactions) | Commission paid |
|---|---|---|---|---|---|---|---|---|
${rows.map(r => `| ${r.id} | ${r.reference} | ${r.date} | ${money(r.amount)} | ${r.status} | ${r.customer} | ${r.delivered} | ${r.points_log} / ${r.points_transactions} | ${r.commission ? money(r.commission) : '-'} |`).join('\n')}

## Commissions
${commLines.join('\n')}

Items per order are in \`docs/unverified-orders.csv\`.

Totals for these orders: delivered ${rows.filter(r => r.delivered === 'yes').length}, loyalty points in log ${rows.reduce((a, r) => a + r.points_log, 0)} and in transactions ${rows.reduce((a, r) => a + r.points_transactions, 0)}, commission ${money(rows.reduce((a, r) => a + r.commission, 0))}.
`
writeFileSync('docs/unverified-orders.md', md)
console.log(`${rows.length} unrecognised, ${verifiedCount} verified. Files written.`)
console.table(rows.map(({ id, status, amount, delivered, points_log, points_transactions, commission }) => ({ id, status, amount, delivered, points_log, points_transactions, commission })))
