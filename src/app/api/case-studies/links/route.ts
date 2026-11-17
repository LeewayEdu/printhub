import { NextResponse } from 'next/server'
import { publicCaseLinks } from '@/lib/case-study-access'

// Display-safe list of PUBLISHED case studies for small link blocks on client-side pages (footer, book
// publishing, election campaign). Unpublished cases are never included, and titles have already been
// through the consent rules. Cached briefly: a flag change is picked up on the next deploy anyway.
export function GET() {
  return NextResponse.json({ cases: publicCaseLinks() }, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } })
}
