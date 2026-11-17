import crypto from 'crypto'

// Preview access for unpublished case studies: /case-studies/<slug>?preview=<token>.
// The token is the CASE_STUDY_PREVIEW_TOKEN environment variable. It is never stored in code, never
// returned by any route, and preview is OFF when the variable is missing or too short to be safe.
export const MIN_PREVIEW_TOKEN_LENGTH = 16

export function isValidPreview(given: string | string[] | undefined | null, env: Record<string, string | undefined> = process.env): boolean {
  const secret = env.CASE_STUDY_PREVIEW_TOKEN
  const token = Array.isArray(given) ? given[0] : given
  if (!secret || secret.length < MIN_PREVIEW_TOKEN_LENGTH || typeof token !== 'string') return false
  const a = Buffer.from(token), b = Buffer.from(secret)
  return a.length === b.length && crypto.timingSafeEqual(a, b)   // constant time, equal length only
}
