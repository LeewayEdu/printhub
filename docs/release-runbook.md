# Release runbook: release/2026-11

Written for the owner. Nothing in this document has been run. There is no production access and no database connection from the
machine that prepared this branch. Do the steps in order. Nothing is pushed or deployed.

## 0. What this release is
- Branch `release/2026-11`, created from `main` (which equals `origin/main` at `6995b10`, the only branch on the remote, so `main` is
  assumed to be the production branch. Check Vercel > Settings > Git > Production Branch).
- Merged in this order: `ux-fixes` (includes `audit-fixes`), `books-store`, `case-studies`. `books-phase-2` is NOT included.
- One merge conflict, in `src/app/sitemap.ts` (books and case studies each added to the same lines). Resolved by keeping both: the
  list returns static pages, book pages and case-study pages (each already gated by its own rules).
- Footer, home page and the leads route merged without conflicts.
- Checks on the merged branch: typecheck clean; 150 tests (149 pass, 0 fail, 1 skipped by design); production build passes.
  `next lint` has no ESLint configuration in the repo, so lint is not available and the build's type check is the only static check.
- **Clean-checkout check (done):** a fresh clone of the branch, `npm ci`, the build and the tests all pass. The lockfile was out of sync
  (`pdf-lib` and `fflate`, added by books-store, were missing from `package-lock.json`, so `npm ci` failed). The commit "Sync lockfile"
  fixes it and adds only those six packages. Vercel runs `npm ci` style installs, so this fix is required.
- **Node version:** `package.json` now has `"engines": { "node": ">=20 <23" }`. I chose a range, not a single major, because I could not see
  which Node version the Vercel project uses (20 or 22 are both plausible); it was tested on Node 22 (v22.22.2) and the upper bound stops
  an untested Node 23 or newer being picked up silently. Check Project Settings > General > Node.js Version shows 20.x or 22.x.
- **Build-required variables** (the build stops while collecting pages if any is missing, verified by building with none set):
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`. Everything else is read only
  at runtime. The build also succeeds with `BOOKS_NAV_ENABLED`, `BOOKS_USD_ENABLED` and `CASE_STUDY_PREVIEW_TOKEN` all unset, and then the
  Books link is absent and the case studies are hidden (checked on the built app).

## 1. Migrations
Run in the Supabase SQL editor, one file at a time. "Old code breaks" means: the code that is live today, if the file runs BEFORE the
new code is deployed.

| File | What it does | Kind | Old live code breaks if run before deploy? | Run |
|---|---|---|---|---|
| `admin-audit-log-migration.sql` | New table `admin_audit_logs` and an admin read policy | Additive | No | Probably already run (the live password-reset route writes to it). Confirm with query R1 |
| `affiliate-consistency-migration.sql` | Backfills and adds a trigger that creates an `affiliates` row when `is_affiliate` becomes true | Additive (trigger) | No | Probably already run. Confirm with R1 |
| `referral-system-migration.sql` | New table `referrals`, two columns on `affiliates` | Additive | No | Already run per earlier sessions (6 referral rows exist). Confirm with R1 |
| `design-pricing-migration.sql` | Design pricing columns on `products`, two new tables, new columns on `order_items` | Additive (new tables have RLS) | No | Already run (design pricing is live). Confirm with R1 |
| `min-order-amount-migration.sql` | Nullable column `products.min_order_amount` | Additive | No | Already run (four products have a minimum). Confirm with R1 |
| `commission-uniqueness-migration.sql` | Two unique indexes (one commission per order, one referral per pair) | Restrictive (constraint), but pre-checked: no duplicates exist | No | After deploy (step A) |
| `lead-capture-migration.sql` | Adds lead columns, sets default status, turns on RLS for `leads` and creates admin-only read and update policies | **Restrictive (RLS)** | **Yes**: the old code wrote leads from the browser, which RLS now refuses | After deploy (step B) |
| `payment-fields-migration.sql` | Five new columns on `orders` (`payment_method`, `payment_note`, `is_test`, `paid_amount`, `paystack_status`) | Additive | No (new code works with or without it) | After A and B (step C) |
| `books-migration.sql` | All C-Chu Books tables, RLS, rights-before-publish constraint, two storage buckets, new columns on `orders` and `order_items` (all with defaults), the `is_admin()` helper | Additive. RLS is switched on only for the new tables | No | Any time after deploy, before the first book is added. Can also run before deploy |
| `books-1b-migration.sql` | Royalty options, ledger flags, naira settlement columns, stamping columns, ebook size setting. Replaces the one-default-rule index on `royalty_rules` | Additive (one index replaced, on a new table) | No | Right after `books-migration.sql` |
| `books-royalty-seed.sql` | Inserts two default royalty rules (distribution 70/30/85, package 80/40/85, hold 30 days, minimum ₦5,000), only if they do not exist | Data insert | No | After `books-1b-migration.sql` |
| `payment-integrity-migration.sql` | Drops ALL policies on `orders` and `order_items` and recreates read-own plus admin policies; one unique index on the Paystack reference | **Restrictive (RLS, drops policies)** | **Yes**: the old checkout inserts orders from the browser, so every customer's checkout would fail | **Last**, only after a real order has gone through the new server path (step D) |
| `supabase-schema.sql` | The original full schema | Baseline | n/a | Never re-run |
| `docs/db-introspection-queries.sql` | Read-only queries | Read only | No | Run query 1 and save the result before step D |

### Rollback statements
**A. commission-uniqueness**
```sql
drop index if exists public.commissions_order_id_key;
drop index if exists public.referrals_affiliate_user_key;
```
**B. lead-capture**
```sql
drop policy if exists "Admins can read leads" on public.leads;
drop policy if exists "Admins can update leads" on public.leads;
drop index if exists public.leads_status_created_idx;
alter table public.leads alter column status drop default;
-- columns product_interest, quantity, email, notes are kept (dropping deletes data)
-- only if leads had RLS off before (check the saved policy result): alter table public.leads disable row level security;
```
**C. payment-fields** (WARNING: deletes stored paid amounts, notes and test labels)
```sql
alter table public.orders
  drop column if exists payment_method, drop column if exists payment_note,
  drop column if exists is_test, drop column if exists paid_amount, drop column if exists paystack_status;
```
**D. payment-integrity** (restores browser write access to orders: emergency use only)
```sql
drop policy if exists "Customers read own orders" on public.orders;
drop policy if exists "Admins manage orders" on public.orders;
drop policy if exists "Customers read own order items" on public.order_items;
drop policy if exists "Admins manage order items" on public.order_items;
-- recreate the old policies from the saved result of query 1 in docs/db-introspection-queries.sql.
-- If it was not saved, the repo schema's original for orders was:
create policy "orders_own" on public.orders for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- (order_items needs its own equivalent from the saved result)
drop index if exists public.orders_paystack_reference_key;
```
**books-migration.sql** (deletes all books data; only if you must remove books entirely)
```sql
update public.books set status = 'draft';
drop table if exists public.royalty_entries, public.royalty_payouts, public.royalty_rules,
  public.download_log, public.entitlements, public.book_formats, public.books, public.authors, public.books_settings cascade;
alter table public.order_items drop column if exists item_type, drop column if exists book_id, drop column if exists book_format_id;
alter table public.orders drop column if exists currency, drop column if exists payment_fee, drop column if exists author_ref_code;
-- empty the buckets in the dashboard first, then:
delete from storage.buckets where id in ('book-files', 'book-public');
drop function if exists public.is_admin();
```
Do not drop `order_items.item_type` or `orders.currency` while a book order still needs a refund. Roll the code back first.

**books-1b-migration.sql**
```sql
alter table public.royalty_rules drop column if exists option_key;
alter table public.books drop column if exists royalty_option;
alter table public.royalty_entries drop column if exists flag, drop column if exists rate_to_ngn, drop column if exists author_share_ngn, drop column if exists settled_note;
alter table public.orders drop column if exists settled_ngn;
alter table public.entitlements drop column if exists stamp_status, drop column if exists stamped_pdf_path, drop column if exists stamped_epub_path, drop column if exists stamp_attempts, drop column if exists stamp_error, drop column if exists stamp_started_at;
alter table public.books_settings drop column if exists max_ebook_mb;
drop index if exists public.royalty_rules_option_key;
create unique index if not exists royalty_rules_default_key on public.royalty_rules ((true)) where book_id is null;
```
**books-royalty-seed.sql**
```sql
delete from public.royalty_rules where book_id is null and option_key in ('distribution','package');
```
**Earlier files** (only if one of them turns out not to have been run and you later want to undo it; each loses its data)
```sql
-- min-order-amount:     alter table public.products drop column if exists min_order_amount;
-- design-pricing:       drop table if exists public.product_design_addons, public.design_addons;
--                       alter table public.products drop column if exists design_pricing_type, drop column if exists design_flat_fee, drop column if exists design_unit_label, drop column if exists design_unit_rate, drop column if exists design_min_units;
--                       alter table public.order_items drop column if exists has_own_design, drop column if exists design_addons_selected, drop column if exists design_units, drop column if exists design_cost_total, drop column if exists design_request_notes;
-- referral-system:      drop table if exists public.referrals;   (the two affiliates columns can stay)
-- affiliate-consistency: drop trigger if exists enforce_affiliate_consistency on public.profiles; drop function if exists public.ensure_affiliate_row();
-- admin-audit-log:      drop table if exists public.admin_audit_logs;
```

## 2. Recommended order
1. **Before deploying** (additive only, old code unaffected): nothing is required. `books-migration.sql`, `books-1b-migration.sql` and the seed may be run now or after deploy.
2. **Deploy** the release (Vercel: merge or promote). Set the environment variables in section 3 first.
3. **After deploy, in this order:** A `commission-uniqueness`, B `lead-capture`, C `payment-fields`, then (if not yet run) `books-migration.sql`, `books-1b-migration.sql`, `books-royalty-seed.sql`.
4. Run the smoke checklist (section 5), including a low-value real order.
5. **Last:** save query 1 of `docs/db-introspection-queries.sql`, then run `payment-integrity-migration.sql`, only after a real order has gone through the new server path and shown pending, then paid with `paid_amount` filled and Paystack status `success`.

## 3. Environment variables (Vercel > Production)
| Variable | Needed? | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Required, **build and runtime** | The build fails without them |
| `SUPABASE_SERVICE_ROLE_KEY` | Required, **build and runtime** | Server only. Used by every server route. The build fails without it |
| `PAYSTACK_SECRET_KEY`, `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | Required, runtime only | Live keys stay as they are. Do not change them in this release |
| `RESEND_API_KEY` | Required, **build and runtime** | The build fails without it. Order, alert, design reminder and ebook emails |
| `NEXT_PUBLIC_SITE_URL` | Required, runtime only | Canonical links fall back to the production address if it is unset, but the Paystack webhook's order notification and the stamping trigger build their address from it with no fallback. A value containing "localhost" is ignored for canonical links |
| `CRON_SECRET` | Required, runtime only | Closed by default: without it the reconcile job, the design reminders and background ebook stamping refuse to run |
| `BOOKS_USD_ENABLED` | Optional, leave unset or `false` | `true` shows USD ebook prices outside Nigeria. Needs USD enabled on Paystack first |
| `BOOKS_NAV_ENABLED` | Optional, leave unset or `false` | `true` shows "Books" in the menu and footer. Read at build time, so it needs a redeploy |
| `CASE_STUDY_PREVIEW_TOKEN` | Optional | 16+ characters. Only needed to preview an unpublished case study with `?preview=<token>`. Without it previews are impossible |
| `DOWNLOAD_LOG_SALT` | Optional | Salt for the hashed network address in the download log. Falls back to the service key |
| `GROQ_API_KEY` | Required for the chatbot, runtime only | |
| `NEXT_PUBLIC_META_PIXEL_ID` | Optional | Ad tracking |
| `NOTIFY_PHONE`, `ULTRAMSG_INSTANCE_ID`, `ULTRAMSG_TOKEN`, `CALLMEBOT_API_KEY` | Optional | WhatsApp alerts |
| `PAYSTACK_API_BASE` | Optional | Leave unset |
| `BOOKS_USE_FIXTURES` | Never on Vercel | Local development only (ignored when `VERCEL_ENV` is `production`) |

**Defaults verified on the merged branch:** with `BOOKS_NAV_ENABLED` unset the menu and footer have no Books link; `usdEnabled()` returns
true only when `BOOKS_USD_ENABLED` is exactly `true`; both case studies are `published: false` and `consentGiven: false`, return 404
publicly, and the sitemap has no case-study URLs.

## 4. Vercel cron jobs and limits
`vercel.json` has two jobs: `/api/cron/reconcile` at 07:00 and `/api/cron/design-reminders` at 08:00 (UTC). I assumed the Hobby plan, which allows 2 cron
jobs, once per day each, so both slots are used and no job was added. Background ebook stamping is also swept from the 08:00 job, and
starts immediately after payment when `CRON_SECRET` is set. Check your plan's current cron and function-duration limits in Vercel; I could
not confirm them from here. Stamping a large PDF needs memory (a generated 250 MB PDF took about 1.2 GB), hence the 30 MB default
ebook limit (setting `books_settings.max_ebook_mb`).

## 5. Post-deploy smoke checklist
Tick each one on production. Use the test customer approach in `docs/deploy-runbook.md` section 1a for test-key orders.
- [ ] `/`, `/shop`, a product page, `/cart` load, console clean, no sideways scrolling on a phone
- [ ] Product page: choose options, price updates, Add to cart works, the cart shows the line and the delivery range
- [ ] **Low-value real order:** place a small real order (a product at its minimum). In Admin > Orders it appears **pending**, then becomes **paid** only after verification, with `paid_amount` filled and Paystack status `success`. A delivery option is required
- [ ] Bank-transfer order: pending with "Awaiting receipt"; Approve Receipt asks for a reason
- [ ] Admin > Orders: loads, filters and counts work, "Check payments vs orders" returns a result
- [ ] Leads: Admin > Leads loads; the WhatsApp lead button creates one row; submitting twice quickly is limited
- [ ] **Case-study lead:** only possible once a case is published. Until then confirm `/case-studies` shows the empty state, both case URLs are 404, `/sitemap.xml` has no case URLs. After publishing one: tap the WhatsApp button and confirm a lead with source `case_study` and the case slug (see known issues: the `leads.source` restriction)
- [ ] Reconciliation: `curl -H "Authorization: Bearer $CRON_SECRET" https://printhub.cchumedia.com/api/cron/reconcile` (type the secret yourself) returns `{"ok":true,...}`
- [ ] **Books soft launch** (after the books migrations and seed):
  1. Admin > Books: add an author and a **draft** book with an ebook format (and a print format if wanted); upload the files
  2. Confirm **rights** (a book cannot publish without it)
  3. Check the **royalty rule** exists (seed) and the book's option (distribution or package) is right
  4. Enter the **print cost** per copy for any print format (until then print sales show "print cost missing" and the author share stays 0)
  5. **Publish**, then open `/books` and the book page
  6. **Buy** it with a test-key order (or a small real one); delivery is not asked for an ebook-only order
  7. Order becomes paid only after verification; "Preparing your copy" may show for a few minutes
  8. **Download**: My books > Download; the file carries the buyer's name; **stamping** completes without waiting on the download request
  9. **Email**: the "Your books are ready" email arrives
  10. **Royalty entry**: Admin > Royalties shows the sale, the right percentage and no flag
  11. **Admin download count**: Admin > Orders > open the order > "Ebook downloads" shows the count and the time
  12. Refund the order: access is withdrawn and the royalty entries reverse
- [ ] Sitemap lists the published book and its author and no drafts

## 6. Rollback plan
1. **Code:** Vercel > Deployments > the previous deployment > Promote to Production (instant, no data is lost).
2. **If `payment-integrity-migration.sql` already ran and you roll the code back, roll that migration back first** (section 1, D), because
   the old checkout writes orders from the browser.
3. **Migrations:** use the rollback statements in section 1, newest first. Additive columns can safely stay if you only roll back the code.
4. **Exported policies:** before step D run query 1 of `docs/db-introspection-queries.sql` and save the result somewhere outside the
   repo. Do the same for `leads` (query 1 covers related tables). Those are what you restore.
5. **Books flags:** to hide Books quickly, leave `BOOKS_NAV_ENABLED` unset and redeploy (the pages stay reachable by URL; set books to
   draft in Admin to remove them from the public site and sitemap). To stop USD, unset `BOOKS_USD_ENABLED`.

## 7. Read-only queries to run (no database connection was available)
`SUPABASE_DB_URL` is not set in `.env.local` on this machine, so no live comparison was made. Run these in the Supabase SQL editor
(they only read):
```sql
-- R1: which migrations have already run (tables and columns)
select table_name from information_schema.tables where table_schema='public' and table_name in
 ('admin_audit_logs','referrals','design_addons','product_design_addons','authors','books','book_formats','entitlements','download_log','royalty_rules','royalty_entries','royalty_payouts','books_settings','leads','commissions') order by 1;
select table_name, column_name from information_schema.columns where table_schema='public' and
 ((table_name='orders' and column_name in ('payment_method','payment_note','is_test','paid_amount','paystack_status','currency','payment_fee','author_ref_code','settled_ngn'))
  or (table_name='order_items' and column_name in ('item_type','book_id','book_format_id','has_own_design','design_cost_total'))
  or (table_name='products' and column_name in ('min_order_amount','design_pricing_type'))
  or (table_name='leads' and column_name in ('source','product_interest','quantity','email','notes'))) order by 1,2;
-- R2: policies on the order tables and leads
select tablename, policyname, cmd, roles, qual, with_check from pg_policies where schemaname='public' and tablename in ('orders','order_items','leads') order by 1,2;
select relname, relrowsecurity from pg_class where relname in ('orders','order_items','leads') and relnamespace='public'::regnamespace;
-- R3: would 'case_study' leads be dropped? Look for a check constraint or enum on leads.source
select conname, pg_get_constraintdef(oid) from pg_constraint where conrelid='public.leads'::regclass;
select column_name, data_type, udt_name from information_schema.columns where table_schema='public' and table_name='leads' and column_name='source';
-- R4: is there any other writer to orders (triggers)?
select tgname, tgrelid::regclass from pg_trigger where not tgisinternal and tgrelid::regclass::text in ('public.orders','public.order_items','public.profiles') order by 2,1;
-- R5: storage buckets (after the books migration)
select id, public from storage.buckets where id in ('book-files','book-public');
```
For R3: if `leads.source` has a check constraint or enum that does not list `case_study`, a case-study lead insert would be refused. The
route falls back to the chatbot lead path only for unknown values, but a database-level restriction would drop the row silently.

## 8. Known issues I am launching with
- **No migration has ever been run by me.** Nothing about the books tables, RLS, buckets, stamping or the seed is tested against a real database.
- **Books are hidden** (menu flag off) and USD is off. The `/books` pages exist by URL and show "coming soon" until a book is published.
- **Print cost per book is not set**, so print book sales will be flagged "needs print cost" with author share 0 until it is entered.
- **Stamping, Paystack, emails and storage have not been exercised live.** The 30 MB ebook limit and function memory are based on generated test files.
- **Naira settled amount for USD orders is entered by hand** (the Paystack field was not confirmed). USD is off, so this is dormant.
- **Statements for authors do not exist yet** (that is Phase 2, not in this release).
- **Case studies are unpublished** and both clients' written consent is outstanding. The Ezra cover photos print the book title on the cover, which is visible if the photo is shown without consent.
- **Refund policy and Terms:** the digital refund policy is a draft and not live; the live Terms are unchanged; contact placeholders remain.
- **Loyalty points:** a database function or trigger that awards points has not been inspected (`docs/loyalty-fix-plan.md`).
- **Content CSP is report-only**, not enforcing.
- **Open data items from earlier work:** the 900gsm business-card option is hidden but needs a percentage; area minimums still need numbers.
- **Guest checkout is not built** (plan only).
- **`.env.example`** was rewritten to match what the code reads (required at build, required at runtime, optional). Placeholders only.
- **Security advisories (`npm audit`, after upgrading `next` and `eslint-config-next` from 14.2.5 to 14.2.35, the latest 14.2.x patch):**
  - *Fixed by the patch:* 12 of the 37 published `next` advisories, among them the middleware authorisation bypass (critical), the
    authorisation bypass (high), cache poisoning, two Server Components denial-of-service issues, the Server Actions denial-of-service and
    the image optimisation issues that had a 14.2 fix.
  - *Remaining in `next` (25):* every one is fixed only in 15.x or later (the 14.x line has no further patches). Whether they affect this
    app: the app uses no middleware, no Server Actions, no `beforeInteractive` scripts or CSP nonces, no Pages Router or i18n, no custom
    server and no edge runtime, and `next.config.js` has redirects but no rewrites, so the middleware, Server Actions, rewrites, i18n,
    WebSocket and nonce advisories do not apply. **Still relevant:** the image optimisation advisories (`next/image` is used, with
    AVIF/WebP) and the Server Components denial-of-service advisories. The image ones are described for self-hosted Next.js; on Vercel
    the platform serves the optimiser, but I could not confirm Vercel's own mitigation from here. Move to Next 15.5.x or later as a
    separate, tested task.
  - *Other direct dependencies still flagged (not changed in this release):* `next-auth` (critical), `zod` (high), `paystack` (the old
    `request` library chain: critical `request` and `form-data`, no fix published) and `nanoid` (high) are listed in `package.json` but
    **not imported anywhere in `src`**, so they never run; removing them is a safe follow-up. `xlsx` (high, no fix published) is used by
    the admin bulk-upload page only. `resend` (moderate) is used for email; its fix is a major version. Totals: production 20 before and
    after (the `next` package stays flagged), all dependencies 28 before and 26 after. Do not run `npm audit fix --force`: it would force
    major upgrades.
- **Lint is not configured** (`next lint` has no ESLint config); build type checking is the only static check.
- **Two older commits already on `main` (`e33e164`, `e606a86`) carry an automated co-author line at the end of their commit messages.** They are intentionally left as they are.
- **Your uncommitted changes** (`package.json`, `package-lock.json`, `.gitignore`, the project rules file, plus the `android/`, `ios/`, `www/` folders and `capacitor.config.ts`) are not part of this release. See the notes with the report on how to commit them separately.
