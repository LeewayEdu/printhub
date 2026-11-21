# Next.js 15 upgrade: plan (nothing has been upgraded)

Status: **plan only.** The site runs Next 14.2.35 with React 18 and Node 20 to 22. This note says what would change, how big it is,
and the order to do it in. Nothing in the code was touched for this note.

## What the code looks like today (counted from the repository)
| Item | Count | Why it matters for Next 15 |
|---|---|---|
| Page and layout files that read `params` | 7 | In Next 15 `params` and `searchParams` are promises and must be awaited |
| Files that read `searchParams` | 7 | Same change |
| `cookies()` / `headers()` calls | 1 | Both become asynchronous |
| API route handlers (`route.ts`) | 28 | `GET` handlers are no longer cached by default; context `params` is a promise |
| Pages marked `force-dynamic` | 16 | Fine as they are; Next 15 makes more things dynamic by default, so this list can shrink |
| `revalidate` settings | 4 | Re-check each one: `fetch` is no longer cached by default |
| Client components (`'use client'`) | 83 | React 19 changes (below) |

## What Next 15 changes that touches this site
1. **React 19.** The App Router in Next 15 expects React 19. React 18 only works with the older Pages Router. Moving React is the biggest step:
   check `react-hot-toast`, `framer-motion`, `lucide-react`, `zustand` and `resend` for versions that declare React 19 support, and update types (`@types/react`).
2. **Async request APIs** (`params`, `searchParams`, `cookies()`, `headers()`). The official codemod does most of it.
3. **Caching defaults.** `fetch` and `GET` route handlers are uncached unless asked. Today product pages depend on the database being read at request or build time; the
   pricing loader has its own short cache, so the effect should be small, but the sitemap and the case-study and book pages must be re-checked.
4. **ESLint.** `next lint` has no configuration in this repository today (it asks questions instead of running). The upgrade is a good moment to add one config,
   with ESLint 9 and `eslint-config-next` 15.
5. **Node.** Next 15 needs Node 18.18 or newer; the repository already pins 20 to 22, so nothing changes.
6. **Other:** `next/image` and `next/font` behave the same for how this site uses them; Turbopack stays optional.

## Proposed order (each step is its own branch, tests and build before the next)
1. Add ESLint config and fix what it finds (no version change, so risk is low).
2. Update safe minor versions (`@supabase/supabase-js`, `resend`, `zustand`) on Next 14 and run the full test suite.
3. Run the official codemod (`npx @next/codemod@latest upgrade`) on a branch; review the diff by hand, mainly the 7 pages and the checkout, order and payment routes.
4. Upgrade `next`, `react`, `react-dom`, `@types/react` together. Fix type errors. Rebuild.
5. Re-run the whole crawl and the order flow on a **Vercel preview deployment** with Paystack in test mode: card order, bank-transfer order, admin login, "My orders",
   webhook, and the notify email.
6. Only then promote to production, in a quiet hour, with Vercel's instant rollback ready.

## Risks and how they are covered
- **Payments.** The order, verify and webhook routes use `req.headers` and the request body; they must be re-tested end to end in test mode before production.
- **Caching surprises.** Compare page output (prices on 5 products, sitemap, case studies) before and after.
- **Dependency lag.** If any dependency does not support React 19 yet, wait or replace that one first.

## Effort (rough)
One focused day for steps 1 to 4, one more day for step 5 (testing on a preview), plus a waiting buffer. No new features are blocked by it, and the current version
still receives security fixes, so there is no urgency. Recommended after the first real orders have settled.
