import { CASE_STUDIES, buildView, type CaseStudy, type CaseView } from '@/lib/case-studies'
import { isValidPreview } from '@/lib/case-study-preview'

/** Display-safe list for the small link blocks: PUBLISHED cases only, titles already through the consent rules. */
export function publicCaseLinks(cases: CaseStudy[] = CASE_STUDIES) {
  return cases.filter(c => c.published).map(buildView).map(c => ({ slug: c.slug, title: c.title, category: c.category, summary: c.summary, serviceHref: c.serviceLink.href }))
}

/**
 * The one rule for who sees a case study page:
 *   published        -> everyone
 *   not published    -> only with a valid preview token, otherwise the page does not exist (404)
 * Returns null for "404".
 */
export function resolveCase(
  slug: string,
  previewToken: string | string[] | undefined,
  env: Record<string, string | undefined> = process.env,
  cases: CaseStudy[] = CASE_STUDIES,
): { v: CaseView; preview: boolean } | null {
  const c = cases.find(x => x.slug === slug)
  if (!c) return null
  const v = buildView(c)
  if (c.published) return { v, preview: false }
  return isValidPreview(previewToken, env) ? { v, preview: true } : null
}
