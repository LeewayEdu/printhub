// Fetches every URL in a sitemap and reports any that do not return 200.
//
// Usage (Node 22+, no extra dependencies):
//   node scripts/check-sitemap.ts [baseUrl]
// baseUrl defaults to http://localhost:3000. URLs inside the sitemap are
// rewritten onto baseUrl, so a local build can be checked even though the
// sitemap lists production addresses.
// Exits with code 1 if any URL is not 200.

const base = (process.argv[2] || 'http://localhost:3000').replace(/\/$/, '')

async function main(): Promise<void> {
  const res = await fetch(`${base}/sitemap.xml`)
  if (!res.ok) {
    console.error(`Could not fetch ${base}/sitemap.xml (HTTP ${res.status})`)
    process.exit(1)
  }
  const xml = await res.text()
  const locs = Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g), m => m[1].trim())
  console.log(`Checking ${locs.length} sitemap URLs against ${base}\n`)

  const bad: { url: string; status: number | string }[] = []
  const queue = [...locs]
  const worker = async () => {
    for (let loc = queue.shift(); loc; loc = queue.shift()) {
      const u = new URL(loc)
      const target = `${base}${u.pathname}${u.search}`
      try {
        const r = await fetch(target, { redirect: 'manual' })
        if (r.status !== 200) bad.push({ url: loc, status: r.status })
      } catch (e) {
        bad.push({ url: loc, status: `error: ${(e as Error).message}` })
      }
    }
  }
  await Promise.all(Array.from({ length: 5 }, worker))

  if (bad.length) {
    console.log('Non-200 responses:')
    bad.forEach(b => console.log(`  ${b.status}  ${b.url}`))
    process.exit(1)
  }
  console.log(`All ${locs.length} URLs returned 200.`)
}

main()
