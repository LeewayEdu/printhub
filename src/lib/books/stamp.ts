// Buyer identification, applied server-side at download time. This deters casual sharing; it is not DRM.
//   PDF  : a small light grey line on every page (name and email), plus the PDF "subject" metadata.
//   EPUB : a "licence" page added at the end of the book, plus a metadata entry in the package file.
// Nothing here touches the stored original; the stamped copy is a separate cached file.

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { unzipSync, zipSync, strFromU8, strToU8 } from 'fflate'

/** Standard PDF fonts only cover basic Latin, so reduce the label to printable ASCII */
export function safeLabel(label: string): string {
  return label.normalize('NFKD').replace(/[^\x20-\x7E]/g, '').replace(/\s+/g, ' ').trim().slice(0, 120) || 'Licensed copy'
}

const xmlEscape = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string))

export async function stampPdf(bytes: Uint8Array, rawLabel: string): Promise<Uint8Array> {
  const label = `Licensed to ${safeLabel(rawLabel)}`
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const font = await doc.embedFont(StandardFonts.Helvetica)
  for (const page of doc.getPages()) {
    const { width } = page.getSize()
    const size = 7
    const w = font.widthOfTextAtSize(label, size)
    page.drawText(label, { x: Math.max(12, (width - w) / 2), y: 12, size, font, color: rgb(0.55, 0.55, 0.55), opacity: 0.7 })
  }
  doc.setSubject(label)
  return doc.save()
}

function opfPath(files: Record<string, Uint8Array>): string {
  const container = files['META-INF/container.xml']
  if (!container) throw new Error('Not a valid EPUB: container.xml missing')
  const m = strFromU8(container).match(/full-path="([^"]+\.opf)"/i)
  if (!m) throw new Error('Not a valid EPUB: package file not found')
  return m[1]
}

export function stampEpub(bytes: Uint8Array, rawLabel: string): Uint8Array {
  const label = safeLabel(rawLabel)
  const files = unzipSync(bytes)
  const opf = opfPath(files)
  const dir = opf.includes('/') ? opf.slice(0, opf.lastIndexOf('/') + 1) : ''
  const colophonName = 'cchu-licence.xhtml'

  let pkg = strFromU8(files[opf])
  if (!/<\/manifest>/i.test(pkg) || !/<\/spine>/i.test(pkg)) throw new Error('Not a valid EPUB: package has no manifest or spine')
  pkg = pkg.replace(/<\/manifest>/i, `  <item id="cchu-licence" href="${colophonName}" media-type="application/xhtml+xml"/>\n</manifest>`)
  pkg = pkg.replace(/<\/spine>/i, `  <itemref idref="cchu-licence"/>\n</spine>`)
  pkg = pkg.replace(/<\/metadata>/i, `  <meta name="cchu:licensed-to" content="${xmlEscape(label)}"/>\n</metadata>`)

  const page = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml"><head><title>Licence</title></head>
<body><p style="font-size:0.8em;color:#666;text-align:center;margin-top:3em">This copy is licensed to ${xmlEscape(label)}.<br/>Please do not share it.</p></body></html>`

  // Rebuild the archive: "mimetype" first and stored uncompressed, as the EPUB format requires
  const out: Record<string, any> = {}
  if (files['mimetype']) out['mimetype'] = [files['mimetype'], { level: 0 }]
  for (const [name, data] of Object.entries(files)) {
    if (name === 'mimetype' || name.endsWith('/')) continue
    out[name] = name === opf ? strToU8(pkg) : data
  }
  out[dir + colophonName] = strToU8(page)
  return zipSync(out, { level: 6 })
}
