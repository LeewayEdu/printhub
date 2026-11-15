// Pro-forma invoice data, built from cart items. No database table is involved: the
// invoice number is generated from the date plus a short hash of the content, and the
// request itself is stored as a 'quote_form' lead.

import { VAT_RATE } from '@/lib/priceCalc'
import { PROFORMA_VALIDITY_DAYS } from '@/lib/constants'

export const PROFORMA_STORAGE_KEY = 'printhub-proforma'

export interface ProformaCartItem {
  name: string
  price: number            // total for the line, design fee included
  printPrice?: number      // print-only part
  displayQty: string
  specs?: Record<string, string>
  designPricing?: { hasOwnDesign: boolean; designCostTotal: number } | null
}

export interface ProformaDelivery { label: string; fee: number }
export interface ProformaCustomer { name: string; company?: string; phone: string; email?: string }

export interface ProformaLine {
  name: string
  options: string[]
  qty: number | null
  qtyLabel: string
  unitPrice: number | null   // print price per piece
  designFee: number
  designNote: string
  total: number
}

export interface Proforma {
  number: string
  issued: string             // ISO date
  validUntil: string         // ISO date
  customer: ProformaCustomer
  lines: ProformaLine[]
  itemsTotal: number
  vatIncluded: number
  vatRate: number
  delivery: ProformaDelivery | null
  total: number
}

function shortHash(text: string): string {
  let h = 5381
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) >>> 0
  return h.toString(36).toUpperCase().padStart(4, '0').slice(-4)
}

export function buildProforma(items: ProformaCartItem[], delivery: ProformaDelivery | null, customer: ProformaCustomer, now = new Date()): Proforma {
  const lines: ProformaLine[] = items.map(i => {
    const specQty = Number(String(i.specs?.Quantity ?? '').replace(/[^\d.]/g, ''))
    const displayQty = Number(String(i.displayQty).match(/^\s*(\d+(\.\d+)?)/)?.[1])
    const qty = specQty > 0 ? specQty : displayQty > 0 ? displayQty : null
    const designFee = Number(i.designPricing?.designCostTotal) || 0
    const printPart = i.printPrice ?? i.price - designFee
    return {
      name: i.name.trim(),
      options: Object.entries(i.specs || {}).filter(([k, v]) => v && k !== 'Quantity').map(([k, v]) => `${k}: ${v}`),
      qty,
      qtyLabel: i.displayQty,
      unitPrice: qty ? Math.round(printPart / qty) : null,
      designFee,
      designNote: i.designPricing ? (i.designPricing.hasOwnDesign ? "Customer's own design file" : designFee > 0 ? 'Design by PrintHub' : 'Design included') : '',
      total: i.price,
    }
  })
  const itemsTotal = lines.reduce((s, l) => s + l.total, 0)
  const total = itemsTotal + (delivery?.fee ?? 0)
  const valid = new Date(now.getTime() + PROFORMA_VALIDITY_DAYS * 86_400_000)
  const ymd = now.toISOString().slice(0, 10).replace(/-/g, '')
  return {
    number: `PF-${ymd}-${shortHash(JSON.stringify(lines) + customer.phone + now.getTime())}`,
    issued: now.toISOString(),
    validUntil: valid.toISOString(),
    customer, lines, itemsTotal,
    vatRate: VAT_RATE,
    vatIncluded: Math.round(itemsTotal * VAT_RATE / (100 + VAT_RATE)),
    delivery, total,
  }
}
