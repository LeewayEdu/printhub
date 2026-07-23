// Thin wrapper around window.fbq — every call site guards against the
// pixel script not being loaded (missing env var, ad blocker, still loading)
// so tracking calls can never throw and break the surrounding UI flow.
export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID

declare global {
  interface Window {
    fbq?: (...args: any[]) => void
  }
}

export function fbTrack(event: string, params?: Record<string, unknown>) {
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') return
  window.fbq('track', event, params)
}

export function fbPageview() {
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') return
  window.fbq('track', 'PageView')
}
