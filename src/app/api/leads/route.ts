import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Where a lead came from. 'chatbot' is what the chat widget already sends.
const SOURCES = ['chatbot', 'whatsapp', 'quote_form', 'ad', 'organic', 'affiliate']

const clip = (v: unknown, max: number): string | null =>
  typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null

// Public endpoint, so every field is length-limited and the source is whitelisted.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const source = SOURCES.includes(body.source) ? body.source : 'chatbot'
    const name = clip(body.name, 120)
    const phone = clip(body.phone, 40)
    const email = clip(body.email, 160)
    const product_interest = clip(body.product_interest, 200)
    const notes = clip(body.notes, 1000)
    const quantity = Number.isFinite(Number(body.quantity)) && Number(body.quantity) > 0 ? Math.round(Number(body.quantity)) : null
    const conversation = body.conversation ?? null

    // A lead needs a way to reach the person or something to follow up on
    if (!name && !phone && !email && !product_interest) return NextResponse.json({ ok: true })

    const row = { source, name, phone, email, product_interest, quantity, notes, conversation, status: 'new', created_at: new Date().toISOString() }
    const { error } = await supabase.from('leads').insert(row)

    if (error) {
      // The new columns may not exist yet (lead-capture-migration.sql not run):
      // keep the lead using the original columns, with the details in `conversation`.
      const details = [product_interest && `Product: ${product_interest}`, quantity && `Quantity: ${quantity}`, notes, email && `Email: ${email}`]
        .filter(Boolean).join('\n')
      await supabase.from('leads').insert({
        source, name, phone, status: 'new', created_at: row.created_at,
        conversation: conversation ?? (details || null),
      })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true }) // always succeed: lead capture must never break the page
  }
}
