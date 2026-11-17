# C-Chu Books, Phase 1: plan

Branch `books-store` (from `ux-fixes`). Nothing in this plan has been run against a database: there is no
`SUPABASE_DB_URL`, so every database change is in `books-migration.sql` for you to review and run.

## What was read first
Product page and quick view, cart store, cart, checkout and confirmation pages, `/api/orders/create`,
`order-pricing.ts`, `pricing-server.ts`, `paystack.ts`, the verify route and webhook, `commissions.ts`,
admin orders and products pages, `reconcile.ts`, `alerts.ts`, `sitemap.ts`, `components/seo`, storage use
(one public bucket, `products`), `proforma.ts` and `docs/deploy-runbook.md`.

## Data model (all in `books-migration.sql`)
New tables, RLS on every one. Only the server (service key) writes. Customers can read only their own
`entitlements` (and the published catalogue); admins can read everything.

| Table | Purpose |
|---|---|
| `authors` | name, slug, bio, photo, social links, payout details reference (a reference, not bank details), `referral_code`, status |
| `books` | title, slug, subtitle, description, cover, author, language, categories, ISBN, pages, published date, preview path, status draft/published, `rights_confirmed` (default false), `rights_document_ref`, rights confirmed by/at/note, SEO fields. **CHECK: status = 'published' only if rights_confirmed** |
| `book_formats` | per book: type `print`/`ebook`/`bundle`, `price_ngn`, optional `price_usd`, `stock` (print), `print_cost_ngn` (print cost per copy, for royalties), ebook file paths (PDF, EPUB) in the private bucket, active |
| `entitlements` | one per paid ebook or bundle item: user, order, order item, format, granted_at, download_count, `max_downloads` (default 5), revoked_at. Unique per order item |
| `download_log` | entitlement, time, IP hash (never the raw IP), user agent |
| `royalty_rules` | book or default (book null), option name, ebook author share %, print author share %, print share basis, referral share %, hold_days (default 30), minimum_payout (default 5000). **All percentages live here, none in code** |
| `royalty_entries` | per order item: gross, payment_fee, net, author_share, company_share, source store/referral, status pending/payable/paid/reversed, payable_at, refund link, payout link |
| `royalty_payouts` | author, period, total, currency, status, paid_at, reference, notes |
| `books_settings` | single row: `book_affiliate_rate` (default 0), `usd_note`, so the book commission is separate from the 10/5/3 tiers |

Changes to existing tables (additive): `orders` gets `currency` (default 'NGN'), `payment_fee`,
`author_ref_code`; `order_items` gets `item_type` (default 'product'), `book_id`, `book_format_id`
(`product_id` is already nullable in the live schema, checked). Two storage buckets: `book-files`
(PRIVATE, ebook files and per-order watermarked copies) and `book-public` (public: covers and the preview sample).

## Routes
Public: `/books`, `/books/[slug]`, `/authors/[slug]`. Signed in: `/dashboard/my-books`.
Admin pages: `/dashboard/admin/books`, `/dashboard/admin/authors`, `/dashboard/admin/royalties`.
Server routes: `/api/admin/books/*` (save, publish, upload-url, upload-confirm), `/api/admin/authors`,
`/api/admin/royalties/*` (report, payout), `/api/books/download` (entitlement-checked signed URL),
`/api/admin/orders/books-refund`. Existing `/api/orders/create`, verify route and webhook are extended, not replaced.

## What is reused and what changes
| Existing code | Reuse or change |
|---|---|
| `orders/create` + `priceOrder` | **Reused.** Book lines are priced from `book_formats` only (never from the browser), mixed with product lines in one order, same ₦1 tolerance, same delivery table. Currency is chosen by the server rules below |
| `confirmOrderPayment` | **Reused, small change.** Compares the order's own currency (not a hard-coded NGN), and keeps the Paystack fee from the verify response. Still the only code that marks a Paystack order paid |
| Webhook and verify route | After a payment is confirmed (or found already confirmed) they call `fulfilBooksForOrder`, which is idempotent: grant entitlements, write ledger entries, send the email |
| `mark-paid` (manual) route | Calls the same fulfil function, so a bank-transfer ebook order also unlocks after an admin confirms the money |
| Cart store | New line type `kind: 'book'` with `bookFormatId`; product lines are unchanged |
| Checkout | Ebook-only carts skip delivery; print and bundles use the delivery table; USD only when the server rules allow |
| `commissions.ts` | Book lines are excluded from the 10/5/3 tiers and use the separate book rate (default 0%) |
| `sitemap.ts`, `components/seo` | Add published books and authors; new metadata helpers use `pageMetadata` |
| `proforma.ts` | Book lines supported (format, quantity, currency) |
| Admin order status | `refunded` calls the books refund route (revoke entitlements, negative ledger entries) |
| Rate limiter, alerts, Resend | Reused for downloads, admin alerts and purchase emails |

New dependencies (to approve): `pdf-lib` (PDF stamping) and `fflate` (read and write the EPUB zip).

## Rules that protect payment integrity
Orders are created only by the server route; prices come from the database; status is `pending` until
the server confirms with Paystack (amount AND currency); entitlements and ledger entries are written only
by server code after that confirmation, and are idempotent (unique keys), so repeated verify/webhook calls
cannot grant twice. The browser never writes to any books table.

## Currency
NGN by default. USD is offered only when ALL are true: env flag `BOOKS_USD_ENABLED` = `true`, the visitor's
country (Vercel `x-vercel-ip-country`) is not NG, and every line is an ebook with `price_usd` set. The server
re-checks the flag and the prices when the order is created, stores `orders.currency`, and the verify step
checks currency and amount. Print and bundles are NGN, Nigeria-only. Paystack fees are read from the verify
response (`fees`), never hard-coded.

## Assumptions (please read)
1. **No database connection**, so nothing is applied. Storefront pages tolerate the tables not existing yet (they show an empty catalogue) so the build and the rest of the site are unaffected before the migration is run.
2. **Sign-in is required** to buy, as today. Guest checkout does not exist, so digital purchases are tied to a user account.
3. **Royalty percentages are not invented.** You wrote "option B with referral bonus D / other" without the notes that define B and D, so every percentage is a database field, and a book with no rule gets ledger entries flagged "no royalty rule" with author share 0 until a rule is set. The defaults I did take from your message: hold days 30, minimum payout ₦5,000, download limit 5, book affiliate rate 0%, `BOOKS_USD_ENABLED` false.
4. **Ledger model.** Ebook share is on net (gross minus the Paystack fee share). Print share is on (price minus print cost minus fee share), with print cost from `book_formats.print_cost_ngn`. A bundle is split into an ebook part and a print part in proportion to the two formats' own prices; if one is missing, the whole bundle is treated as print. A referral sale (the buyer arrived through that author's own referral link, code stored on the order) uses the book's `referral_share_pct` instead of the normal share; a referral code from a different author gives that author nothing in this phase.
5. **Fee allocation.** Paystack's fee is shared across the order's lines in proportion to line value. If Paystack does not report a fee, 0 is used and the entry says so.
6. **Payable status** is computed when read (pending becomes payable once `payable_at` has passed), not by a scheduled job.
7. **Refunds**: an admin setting an order to `refunded` revokes its entitlements and creates a negative ledger entry for each original entry (the pair is marked `reversed` if nothing was paid out yet; if it was already paid, the negative entry stays payable and is netted from the next payout).
8. **Currencies in the ledger**: entries carry the order's currency; payouts are per author per currency. No FX conversion in Phase 1.
9. **Digital orders** have no delivery. They are stored with shipping method `pickup`, delivery area "Digital (no delivery)" and fee 0, because the live `shipping_method` column is a plain text field whose allowed values I cannot read.
10. **Large files**: Vercel functions cannot take uploads over a few MB, so the admin uploads ebook files directly to storage with a signed upload URL, and the server then checks the file's first bytes and size before recording it.
11. **Watermarking runs in a serverless function** on the first download of each purchase and the result is cached in the private bucket, so very large PDFs may need a longer function timeout than the free plan allows.
12. **Watermark text** is the buyer's name and email, small and light on every page; it deters casual sharing, it is not DRM.
13. **Storage rows** for the buckets are created by the migration (`storage.buckets`). If your project blocks that, create the two buckets in the dashboard instead.
14. **RLS is tested statically** (the migration file is parsed) because there is no database to execute policies against; the same checks must be repeated by hand after the migration is run (the runbook lists them).
15. **Local verification** uses fixtures through `BOOKS_USE_FIXTURES=true`. The fixture mode is ignored when `VERCEL_ENV` is `production`.
16. The new migration is independent of the three earlier ones, but it must run before the books code is deployed to production, and the books code must be deployed before the payment-integrity migration is relevant to books.
