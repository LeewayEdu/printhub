import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { rateLimit, clientIp } from '@/lib/rate-limit'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Where a lead came from. 'chatbot' is what the chat widget already sends.
const SOURCES = ['chatbot', 'whatsapp', 'quote_form', 'ad', 'organic', 'affiliate']

const clip = (v: unknown, max: number): string | null =>
  typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null

const RATE_MAX = 5                      // requests ...
const RATE_WINDOW_MS = 60 * 60 * 1000   // ... per IP per hour (best effort, see lib/rate-limit.ts)

// Accepts +234 80..., 0803..., 803... style numbers: 10-15 digits, optional leading +.
function normalisePhone(raw: string): string | null {
  const cleaned = raw.replace(/[\s\-().]/g, '')
  return /^\+?\d{10,15}$/.test(cleaned) ? cleaned : null
}

// Public endpoint, so it has: a honeypot, a per-IP rate limit, phone validation,
// field-length limits and a source whitelist.
export async function POST(req: NextRequest) {
  try {
    const raw = await req.text()
    if (raw.length > 60_000) return NextResponse.json({ error: 'too_large' }, { status: 413 })
    const body = JSON.parse(raw)

    // Honeypot: real visitors never see this field, bots fill it. Pretend success, store nothing.
    if (typeof body.website === 'string' && body.website.trim() !== '') return NextResponse.json({ ok: true })

    const limit = rateLimit(`leads:${clientIp(req.headers)}`, RATE_MAX, RATE_WINDOW_MS)
    if (!limit.allowed) {
      return NextResponse.json({ error: 'rate_limited' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } })
    }

    const source = SOURCES.includes(body.source) ? body.source : 'chatbot'
    const name = clip(body.name, 120)
    const email = clip(body.email, 160)
    const product_interest = clip(body.product_interest, 200)
    const notes = clip(body.notes, 1000)
    const quantity = Number.isFinite(Number(body.quantity)) && Number(body.quantity) > 0 ? Math.min(Math.round(Number(body.quantity)), 1_000_000) : null
    const conversation = typeof body.conversation === 'string' ? body.conversation.slice(0, 20_000) : null

    let phone: string | null = null
    const phoneInput = clip(body.phone, 40)
    if (phoneInput) {
      phone = normalisePhone(phoneInput)
      if (!phone) return NextResponse.json({ error: 'invalid_phone' }, { status: 400 })
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: 'invalid_email' }, { status: 400 })

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
    return NextResponse.json({ ok: true }) // malformed input or a database hiccup: never break the page
  }
}
