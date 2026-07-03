// TEMPORARY DEBUG ROUTE — delete this file after diagnosis
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Report which keys are present (lengths only — never log the actual key values)
  const keyReport = {
    url_set: !!url,
    url_value: url ?? '(missing)',
    service_key_set: !!serviceKey,
    service_key_length: serviceKey?.length ?? 0,
    service_key_prefix: serviceKey ? serviceKey.slice(0, 20) + '…' : '(missing)',
    anon_key_set: !!anonKey,
    anon_key_length: anonKey?.length ?? 0,
    anon_key_prefix: anonKey ? anonKey.slice(0, 20) + '…' : '(missing)',
  }

  if (!url || !serviceKey) {
    return NextResponse.json({ error: 'Missing env vars', keyReport }, { status: 500 })
  }

  // Raw fetch directly to Supabase REST — bypasses all app code
  let rawStatus: number | null = null
  let rawBody: unknown = null

  try {
    const res = await fetch(
      `${url}/rest/v1/products?select=id&limit=1`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
        cache: 'no-store',
      }
    )
    rawStatus = res.status
    rawBody = await res.json().catch(() => res.text())
  } catch (err) {
    rawBody = String(err)
  }

  return NextResponse.json({ keyReport, rawStatus, rawBody })
}
