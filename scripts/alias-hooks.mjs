// Lets plain Node load the app's TypeScript modules that import '@/...' (used by scripts/check-order-pricing.mts).
import { promises as fs } from 'node:fs'
const SRC = new URL('../src/', import.meta.url).pathname
export async function resolve(specifier, context, next) {
  if (specifier.startsWith('@/')) {
    const p = SRC + specifier.slice(2)
    for (const ext of ['.ts', '/index.ts']) { try { await fs.access(p + ext); return next('file://' + p + ext, context) } catch {} }
  }
  if (context.parentURL?.includes('/src/') && specifier.startsWith('./') && !specifier.match(/\.\w+$/)) {
    try { return await next(specifier + '.ts', context) } catch {}
  }
  return next(specifier, context)
}
