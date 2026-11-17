'use client'

import { useEffect, useState } from 'react'

// "From" prices computed on the server by the shared pricing function. Pages that fetch their own
// product lists in the browser use this so their cards match the shop and the product page.
export function useFromPrices(): Record<string, number> {
  const [prices, setPrices] = useState<Record<string, number>>({})
  useEffect(() => {
    let alive = true
    fetch('/api/pricing/from').then(r => r.json()).then(j => { if (alive && j?.prices) setPrices(j.prices) }).catch(() => {})
    return () => { alive = false }
  }, [])
  return prices
}
