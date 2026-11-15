// Simple in-memory sliding-window rate limiter.
//
// Chosen because it needs no extra service or package and works on Vercel
// serverless. Its limits, stated plainly:
//  - The counters live in the memory of ONE running function instance. Vercel may run
//    several instances at once and recycles them, so the real limit per visitor can be
//    higher than the number set here, and it resets when an instance restarts.
//  - It stops casual spam and repeated clicks, not a determined attacker who rotates
//    IP addresses. A shared store (database column or Redis) is the upgrade path.

const hits = new Map<string, number[]>()

export function rateLimit(key: string, max: number, windowMs: number, now = Date.now()): { allowed: boolean; retryAfterSec: number } {
  const recent = (hits.get(key) || []).filter(t => now - t < windowMs)
  if (recent.length >= max) {
    hits.set(key, recent)
    return { allowed: false, retryAfterSec: Math.ceil((windowMs - (now - recent[0])) / 1000) }
  }
  recent.push(now)
  hits.set(key, recent)
  // keep memory bounded
  if (hits.size > 5000) {
    hits.forEach((v, k) => { if (!v.some(t => now - t < windowMs)) hits.delete(k) })
  }
  return { allowed: true, retryAfterSec: 0 }
}

export function clientIp(headers: Headers): string {
  return headers.get('x-forwarded-for')?.split(',')[0].trim() || headers.get('x-real-ip') || 'unknown'
}
