// Visitor's cookie/tracking choice, kept in localStorage.
// null = not decided yet, 'granted' = accepted, 'denied' = declined.
export type Consent = 'granted' | 'denied' | null

const KEY = 'printhub-tracking-consent'
export const CONSENT_EVENT = 'printhub-consent-change'

export function readConsent(): Consent {
  try {
    const v = window.localStorage.getItem(KEY)
    return v === 'granted' || v === 'denied' ? v : null
  } catch {
    return null
  }
}

export function writeConsent(value: Exclude<Consent, null>) {
  try { window.localStorage.setItem(KEY, value) } catch { /* private mode: choice lasts for this page view only */ }
  window.dispatchEvent(new Event(CONSENT_EVENT))
}
