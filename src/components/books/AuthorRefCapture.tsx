'use client'

import { useEffect } from 'react'

// An author's own referral link looks like /books/some-book?aref=CODE. Remember the code for 30 days so
// checkout can send it along. The server checks the code against the authors table; a wrong code is
// simply ignored, so nothing here is trusted.
export default function AuthorRefCapture() {
  useEffect(() => {
    try {
      const code = new URLSearchParams(window.location.search).get('aref')
      if (code && /^[A-Za-z0-9_-]{2,40}$/.test(code)) {
        document.cookie = `author_ref=${encodeURIComponent(code)}; max-age=${30 * 86400}; path=/; samesite=lax`
      }
    } catch { /* cookies blocked: no referral, nothing breaks */ }
  }, [])
  return null
}
