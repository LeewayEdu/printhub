// Measures buyer-name stamping on PDFs of increasing size (generated locally, random bytes so they do not compress).
// Usage: node --import ./scripts/alias-register.mjs scripts/test-stamp-size.mjs 5 20 40 80
// Reports file size, time and peak memory per size. Nothing is uploaded and no database is touched.
import crypto from 'node:crypto'
import { PDFDocument } from 'pdf-lib'
import { stampPdf } from '../src/lib/books/stamp.ts'

const sizes = (process.argv.slice(2).map(Number).filter(n => n > 0))
if (!sizes.length) sizes.push(5, 20, 40)
const mb = n => (n / 1024 / 1024).toFixed(0)

for (const target of sizes) {
  const doc = await PDFDocument.create()
  const PAGES = Number(process.env.PAGES) || 200
  for (let i = 0; i < PAGES; i++) doc.addPage([420, 595])                       // default: a 200-page book
  const chunk = 4 * 1024 * 1024
  for (let left = target * 1024 * 1024; left > 0; left -= chunk) doc.context.register(doc.context.stream(crypto.randomBytes(Math.min(chunk, left))))
  const original = await doc.save({ useObjectStreams: false })
  if (global.gc) global.gc()
  const rss0 = process.memoryUsage().rss
  let peak = rss0
  const timer = setInterval(() => { peak = Math.max(peak, process.memoryUsage().rss) }, 50)
  const t0 = Date.now()
  const out = await stampPdf(original, 'Test Buyer <buyer@example.com>')
  const ms = Date.now() - t0
  clearInterval(timer); peak = Math.max(peak, process.memoryUsage().rss)
  console.log(`${mb(original.length)} MB in -> ${mb(out.length)} MB out | ${(ms / 1000).toFixed(1)} s | peak memory +${mb(peak - rss0)} MB (total ${mb(peak)} MB)`)
}
