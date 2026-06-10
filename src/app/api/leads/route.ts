import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { name, phone, source, conversation } = await req.json()
    if (!name && !phone) return NextResponse.json({ ok: true })

    await supabase.from('leads').insert({
      name: name || null,
      phone: phone || null,
      source: source || 'chatbot',
      conversation: conversation || null,
      created_at: new Date().toISOString(),
    })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ ok: true }) // always succeed — non-critical
  }
}