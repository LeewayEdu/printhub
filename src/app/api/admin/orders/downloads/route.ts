import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, isResponse } from '@/lib/admin-auth'
import { ebookDownloadsForOrder } from '@/lib/books/download-summary'

// Read-only. Admin only. Returns ebook download counts and the last download time for one order, so a refund
// request can be judged against the digital refund policy. No buyer details are returned.
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (isResponse(auth)) return auth
  const orderId = req.nextUrl.searchParams.get('orderId') || ''
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) return NextResponse.json({ error: 'Missing or invalid orderId' }, { status: 400 })
  const rows = await ebookDownloadsForOrder(auth.db, orderId)
  return NextResponse.json({ downloads: rows }, { headers: { 'Cache-Control': 'no-store' } })
}
