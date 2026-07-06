'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

// Reads ?ref=CODE from the URL and persists it in a 30-day cookie so it
// survives navigation to /auth and page reloads before the user registers.
export default function ReferralCapture() {
  const searchParams = useSearchParams()

  useEffect(() => {
    const ref = searchParams.get('ref')
    if (ref) {
      const clean = ref.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
      if (clean) {
        document.cookie = `ref_code=${encodeURIComponent(clean)}; max-age=${30 * 24 * 60 * 60}; path=/; SameSite=Lax`
      }
    }
  }, [searchParams])

  return null
}
