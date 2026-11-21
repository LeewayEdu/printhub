// Thin wrapper around window.fbq — every call site guards against the
// pixel script not being loaded (missing env var, ad blocker, still loading)
// so tracking calls can never throw and break the surrounding UI flow.
export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID

declare global {
  interface Window {
    fbq?: (...args: any[]) => void
  }
}

// eventId (optional) is Meta's de-duplication id: the same id sent twice is counted once.
export function fbTrack(event: string, params?: Record<string, unknown>, eventId?: string) {
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') return
  if (eventId) window.fbq('track', event, params ?? {}, { eventID: eventId })
  else window.fbq('track', event, params)
}

export function fbPageview() {
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') return
  window.fbq('track', 'PageView')
}
