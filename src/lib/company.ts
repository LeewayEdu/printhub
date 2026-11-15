// Single source of truth for company facts that change over time.

export const FOUNDING_YEAR = 2011

/** Whole years since founding, e.g. 15 in 2026. */
export function yearsInBusiness(now: Date = new Date()): number {
  return now.getFullYear() - FOUNDING_YEAR
}

/** "15+" — for stat tiles. */
export function yearsPlus(now?: Date): string {
  return `${yearsInBusiness(now)}+`
}

/** "15+ years" — for running copy. */
export function yearsLabel(now?: Date): string {
  return `${yearsPlus(now)} years`
}

/**
 * Rewrites any stale "<n>+ years" in text that is stored elsewhere (for example
 * the trust-ticker rows in the database) so it always shows the current figure.
 */
export function freshenYears(text: string, now?: Date): string {
  return text.replace(/\b\d+\+(\s*)(years?)\b/gi, (_m, space: string, word: string) => `${yearsPlus(now)}${space}${word}`)
}
