// A small in-memory stand-in for the Supabase query builder, shared by the books tests.
// Supports: select, eq, in, is(null), ilike(no wildcard), order, limit, maybeSingle, single,
// insert(...).select().single(), update, delete, and unique constraints (error code 23505).
// Embedded selects such as books(id, title) are served from rows[table].__embed if a test sets them.

export function fakeDb(tables, { unique = {} } = {}) {
  let seq = 0
  const db = {
    tables,
    from(name) {
      const rows = (tables[name] ||= [])
      const q = { eq: [], inn: [], isn: [], patch: null, del: false, ins: null, lim: null }
      const match = r => q.eq.every(([k, v]) => r[k] === v) && q.inn.every(([k, vs]) => vs.includes(r[k])) && q.isn.every(([k]) => r[k] == null)
      const run = () => {
        if (q.ins) {
          const list = Array.isArray(q.ins) ? q.ins : [q.ins]
          const made = []
          for (const row of list) {
            for (const u of unique[name] || []) {
              const keys = Array.isArray(u) ? u : u.keys
              if (!Array.isArray(u) && u.where && !u.where(row)) continue       // partial unique index
              if (rows.some(r => keys.every(k => r[k] != null && r[k] === row[k]) && (Array.isArray(u) || !u.where || u.where(r)))) return { data: null, error: { code: '23505', message: `duplicate key on ${name}` } }
            }
            const full = { id: `${name}-${++seq}`, created_at: new Date().toISOString(), ...row }
            rows.push(full); made.push({ ...full })
          }
          return { data: Array.isArray(q.ins) ? made : made[0], error: null }
        }
        let hit = rows.filter(match)
        if (q.patch) { hit.forEach(r => Object.assign(r, q.patch)); return { data: hit.map(r => ({ ...r })), error: null } }
        if (q.del) { const keep = rows.filter(r => !match(r)); rows.length = 0; rows.push(...keep); return { data: null, error: null } }
        if (q.lim) hit = hit.slice(0, q.lim)
        return { data: hit.map(r => ({ ...r })), error: null }
      }
      const b = {
        select() { return b }, order() { return b }, limit(n) { q.lim = n; return b },
        eq(k, v) { q.eq.push([k, v]); return b }, in(k, vs) { q.inn.push([k, vs]); return b }, is(k) { q.isn.push([k]); return b },
        update(p) { q.patch = p; return b }, delete() { q.del = true; return b }, insert(r) { q.ins = r; return b },
        maybeSingle() { const r = run(); return Promise.resolve({ data: Array.isArray(r.data) ? (r.data[0] ?? null) : r.data, error: r.error }) },
        single() { const r = run(); return Promise.resolve({ data: Array.isArray(r.data) ? (r.data[0] ?? null) : r.data, error: r.error }) },
        then(res, rej) { return Promise.resolve(run()).then(res, rej) },
      }
      return b
    },
  }
  return db
}
