# Deploy runbook: ux-fixes branch

Written for the owner. Nothing here has been run; there is no production access from this machine.
Do the steps in order. Do not skip step 3 (the migration order matters).

## 0. What is going live
The `ux-fixes` branch (not pushed yet). The parts that touch money or data:
- orders are created and paid-confirmed on the server, storing the verified amount and Paystack status (`/api/orders/create`, `/api/payments/verify`, webhook)
- orders are re-priced on the server and refused if a line differs by more than ₦1
- commission is earned when an order is marked delivered
- daily payment reconciliation (`/api/cron/reconcile`) and `payment_review` alert email
- lead capture protection (`/api/leads`)

## 1. Preview deployment with Paystack TEST keys
Create the preview in Vercel (Project > Settings > Environment Variables > tick **Preview** only, not
Production). Never paste keys into git, chat or a file in the repo.

| Variable | Preview value | Note |
|---|---|---|
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | `pk_test_...` from the Paystack dashboard, Test mode | must start `pk_test_` |
| `PAYSTACK_SECRET_KEY` | `sk_test_...` | must start `sk_test_`. The webhook signature and verify call both use this key |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | see warning below | |
| `NEXT_PUBLIC_SITE_URL` | the preview URL | used for canonical links |
| `RESEND_API_KEY` | same as production | alert and order emails go to the real inbox, so expect test emails |
| `GROQ_API_KEY` | same as production | chatbot |
| `NEXT_PUBLIC_META_PIXEL_ID` | leave **unset** | so test visits are not counted as ad traffic |
| `NOTIFY_PHONE`, `ULTRAMSG_*`, `CALLMEBOT_API_KEY` | leave unset | WhatsApp alerts stay off |
| `CRON_SECRET` | leave unset on preview | Vercel does not run crons on previews |

**The database (your decision: test on the production database).** The preview uses the production Supabase
keys, so test orders are written to the real database. That is safe only if every test order is labelled and
kept out of the real flow. Follow section 1a exactly.

**Paystack test webhook:** in the Paystack dashboard (Test mode) > Settings > API Keys & Webhooks, set the
test webhook URL to `https://<preview-url>/api/webhooks/paystack`. Use Paystack's documented test cards
(their docs list the card number, expiry, CVV and PIN) so no real money moves.

**Production variables to add (Production only):**
- `CRON_SECRET`: any long random string. Without it the reconciliation route refuses every call (it is
  closed by default) and the daily job reports nothing.
- Keep the live `pk_live_` / `sk_live_` keys as they are. Do not change them as part of this deploy.

## 1a. Testing with Paystack test keys on the production database
1. **Set CRON_SECRET in Production** (Vercel > Project > Settings > Environment Variables > Add, tick
   **Production** only). Value: a long random string you generate yourself (for example 40+ random
   characters from a password manager). Redeploy production afterwards, because variables apply to new
   deployments only. Without it the daily reconciliation job refuses to run. Do not paste the value into
   chat, git or a file.
2. **Create a dedicated test customer.** Register a normal account on the site with an inbox you control
   (for example a plus-address such as `yourname+printhubtest@...`), first name `TEST`, last name
   `CUSTOMER`. Do not register it through an affiliate referral link, so it can never create a commission.
   Use only this account for tests. Write down its profile id (Supabase > Authentication > Users).
3. **Place the test order on the preview URL** (which has the `pk_test_` / `sk_test_` keys) while logged in
   as the test customer, using Paystack's documented test card.
4. **Label it.** After the payment-fields migration (section 3, step C) the app labels card orders
   `is_test = true` automatically when Paystack reports the transaction as test mode. Check in
   Admin > Orders that the order shows a blue **Test** badge. Bank-transfer test orders have no Paystack
   record, so label them by hand in the SQL editor (this is a database write: check the rows first):
   ```sql
   select id, status, total_amount from public.orders where user_id = '<test customer id>' and is_test = false;
   update public.orders set is_test = true where user_id = '<test customer id>' and is_test = false;
   ```
5. **Never mark a test order delivered.** Delivery awards loyalty points and affiliate commission. The
   app skips both for `is_test` orders, but a database trigger that awards loyalty points (not yet
   inspected, see `docs/loyalty-fix-plan.md`) may not. Leave test orders at `paid`, or set them to
   `cancelled` when finished.
6. Test orders are excluded from the admin order count, the customer "spent" total, loyalty and commission,
   but remain visible with the Test badge.
7. Do not run a real card payment with live keys on the preview, and do not point the live Paystack webhook
   at the preview.

## 2. Order of deployment
1. Push `ux-fixes` and open the preview. Run the checklist in section 4 on the preview first.
2. Check the live Paystack webhook URL is `https://printhub.cchumedia.com/api/webhooks/paystack`.
3. Add `CRON_SECRET` to Production variables.
4. Promote the preview to Production in Vercel (or merge to `main`).
5. Run the post-deploy checklist (section 4) on production.
6. Run migrations A, B and C from section 3, then do the test-key orders (section 1a) so they are labelled automatically.
7. Run migration D last, only after a real live order has gone through the new server path.

## 3. Migration order (exact)
Run each in the Supabase SQL editor, one at a time, in this order. Save the result of query 1 in
`docs/db-introspection-queries.sql` (the current `orders` / `order_items` policies) **before** step D, because
that is what you need to roll back.

| Step | File | Run when | Why this position |
|---|---|---|---|
| A | `commission-uniqueness-migration.sql` | after the new code is live in production | Two unique indexes only. Safe and additive. Pre-checked: no duplicates exist |
| B | `lead-capture-migration.sql` | after the new code is live in production | Adds lead columns and makes `leads` admin-only. The OLD code wrote leads from the browser, which this would block, so the new `/api/leads` must be live first |
| C | `payment-fields-migration.sql` | after A and B | Adds `payment_method`, `payment_note`, `is_test`, `paid_amount`, `paystack_status`. Additive. The code works with or without it (it skips missing columns), but test orders cannot be labelled automatically until it is run |
| D | `payment-integrity-migration.sql` | **last**, only after a real order has gone through the new server path on production | Removes customers' ability to write orders. The OLD checkout inserts orders from the browser, so if this ran before the new code is live, **checkout would break for every customer** |

Do not run D until you have confirmed a real order (a small live order on the production site, not a test-key
order) created through `/api/orders/create`: it appears in Admin > Orders as pending, then becomes paid with
`paid_amount` filled in and a Paystack status of `success`.

## 4. Post-deploy checklist
Tick each one on preview, then again on production.

- [ ] **Card test order** (preview: test card; production: a small real order, ₦3,000 minimum products are fine): order appears, shows "Verifying your payment…", then paid. Check Admin > Orders shows `paid`.
- [ ] **Tampered cart refused:** not needed to repeat by hand; covered by `scripts/check-order-pricing.mts`.
- [ ] **Bank-transfer order:** choose bank transfer, upload a receipt; order shows `pending` with the "Awaiting receipt" badge; "Approve Receipt" marks it paid.
- [ ] **Manual paid:** on a pending bank-transfer order, choose Paid (or Approve Receipt): a dialog asks for a reason and will not confirm without one; afterwards the order shows the note (payment_note) and an entry exists in `admin_audit_logs`.
- [ ] **Test labelling:** the test-key order shows the blue Test badge and is not counted in the order count at the top of Admin > Orders.
- [ ] **Admin login:** log in as admin; Orders screen loads; filter buttons show Pending (n) and Payment review (n); "Check payments vs orders" button returns a result.
- [ ] **My orders page** (customer login): lists own orders only; order detail items display.
- [ ] **Affiliate dashboard:** log in as the BLESSING affiliate; commission list shows the ₦442.50 commission; referrals list shows 8 rows. Admin > Affiliates expands and shows commissions.
- [ ] **Pro-forma:** from the cart, request a pro-forma invoice; it opens with address "Suite 38 Mazfallah Shopping Complex" and prints cleanly.
- [ ] **Chatbot prices:** ask the chatbot the price of two products (one fixed-price such as the Instagram Frame Board, one calculated); the figures match the product pages.
- [ ] **WhatsApp lead:** use the WhatsApp lead button/form; one row appears in `leads` (Admin) and no error shows. Submit it twice quickly to confirm the duplicate/rate limit behaves.
- [ ] **Reconciliation:** call the cron once by hand: `curl -H "Authorization: Bearer $CRON_SECRET" https://printhub.cchumedia.com/api/cron/reconcile` (type the secret yourself; do not paste it anywhere shared). Expect `{"ok":true,...}`.
- [ ] **Minimums:** Banner Printing 1 sq ft shows ₦3,000; Backdrop Printing small size shows ₦30,000; Window Graphics ₦5,000.
- [ ] Browser console is clean on `/`, `/shop`, `/cart` and a product page.

## 5. Rollbacks
Code: Vercel > Deployments > previous deployment > "Promote to Production" (instant).
**If you roll the code back after D ran, roll back migration D first**, because the old code needs browser write
access to `orders`.

**D. payment-integrity-migration.sql**
```sql
-- 1. remove the new policies
drop policy if exists "Customers read own orders" on public.orders;
drop policy if exists "Admins manage orders" on public.orders;
drop policy if exists "Customers read own order items" on public.order_items;
drop policy if exists "Admins manage order items" on public.order_items;
-- 2. recreate the old policies from the saved result of query 1 (docs/db-introspection-queries.sql).
--    If you did not save it, the repo schema's original was:
create policy "orders_own" on public.orders for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- (this puts back customer write access: it is the hole the migration closed. Use only as an emergency.)
-- 3. optional
drop index if exists public.orders_paystack_reference_key;
```
Emergency only: if checkout is broken and you cannot wait, restore step 2 for `orders` and `order_items`
(also add `order_items` equivalent from the saved query result), then fix forward.

**C. payment-fields-migration.sql** (safe to roll back at any time; the code skips missing columns)
```sql
-- WARNING: dropping the columns deletes the stored paid amounts, notes and test labels.
alter table public.orders
  drop column if exists payment_method, drop column if exists payment_note,
  drop column if exists is_test, drop column if exists paid_amount, drop column if exists paystack_status;
```
If you only want test orders to stop being hidden, `update public.orders set is_test = false where is_test;` is
enough and keeps the columns. Note that rolling back `is_test` makes test orders count in totals again.

**B. lead-capture-migration.sql**
```sql
drop policy if exists "Admins can read leads" on public.leads;
drop policy if exists "Admins can update leads" on public.leads;
drop index if exists public.leads_status_created_idx;
alter table public.leads alter column status drop default;
-- Added columns are kept (dropping them would delete data). To remove: alter table public.leads drop column product_interest, drop column quantity, drop column email, drop column notes;
-- Only if leads had RLS OFF before (check your saved policy result): alter table public.leads disable row level security;
```

**A. commission-uniqueness-migration.sql**
```sql
drop index if exists public.commissions_order_id_key;
drop index if exists public.referrals_affiliate_user_key;
```

**Data changes already made (16 Nov and earlier, each approved)**
```sql
-- minimum order amounts (undo)
update public.products set min_order_amount = null where id in (
  '3a7787ed-e4e9-4a43-9c9c-b481e03cc920', 'f2803df4-0538-46c9-a19b-c9b37ad9e290',
  '022e434b-8d0f-4092-8ce3-ae41d47e0685', '30dbd5ed-dbe1-49ed-9607-260563156c50');
```
The 900gsm hide, the "Event & Display Items" category and product moves, and the referral and commission
backfill are described with their row ids in `docs/referral-bug-findings-and-plan.md`,
`docs/option-data-bug.md` and `docs/two-bad-prices-proposal.md`. The BLESSING commission row is
`03da7371-b412-48cc-ae6a-2625a72969a4`; undoing it also needs the affiliate totals reversed, so ask me to
prepare that statement rather than deleting the row by hand.

## 6. C-Chu Books (branch `books-store`)

**Nothing for books has been run against any database.** The migration is `books-migration.sql`.

### Environment variables
| Variable | Value | Note |
|---|---|---|
| `BOOKS_USD_ENABLED` | `false` at launch | Set to `true` only when you want USD ebook prices to show to visitors outside Nigeria. Your Paystack account must have USD enabled first, or those payments will fail at Paystack |
| `DOWNLOAD_LOG_SALT` | optional random string | Salts the one-way hash of the network address in the download log. If unset the service key is used as the salt |
| `BOOKS_USE_FIXTURES` | never set on Vercel | Local development fixtures only; ignored when `VERCEL_ENV` is `production` |

### Order
1. Deploy the code (it works with the books tables missing: `/books` shows "Books are coming soon", nothing else changes, the sitemap adds no book URLs).
2. Run `books-migration.sql` in the Supabase SQL editor. It is independent of the other four migrations and can run before or after them. (Run it before adding the first book.)
3. Check the two buckets exist in Storage: `book-files` must show **Private**, `book-public` **Public**. If the SQL could not create them, create them by hand with those settings.
4. Run the RLS checks below.
5. In Admin: add an author, add a book with an ebook format, upload the files, set the default royalty rule (no percentages are pre-filled), confirm rights, publish.
6. Do a first purchase with a TEST-mode order (section 1a) of a book you can delete, then check My books, one download, and the email.

### RLS and storage checks after the migration (repeat these by hand: the automated tests only read the SQL)
- Signed in as an ordinary customer, `select * from entitlements` returns only that customer's rows.
- As that customer, `insert into entitlements ...` and `update entitlements ...` are refused.
- As an anonymous visitor, `select ebook_pdf_path from book_formats` is refused (permission denied for the column).
- Opening a path in `book-files` without a signed link returns "Object not found" or "Unauthorized", never the file.
- A draft book cannot be read by an anonymous visitor; `update books set status='published' where rights_confirmed = false` fails with the `books_rights_before_publish` constraint.

### Post-deploy checklist for books
- [ ] `/books` and a book page return 200; the book page shows each format with one price and one Add to cart button; the sticky bar shows on a phone
- [ ] Add an ebook to the cart, check out: no delivery step, no design-file step; pay with the test card; the order is paid only after verification; **My books** lists the book; Download PDF works; the file shows your name on each page; a 6th download is refused
- [ ] Print book: delivery step appears, fee from the delivery table; the order appears in Admin > Orders like any other
- [ ] Set the order to refunded in Admin: the ebook access disappears and the royalty entries are reversed (Admin > Royalties)
- [ ] Admin > Royalties shows the sale; CSV export opens; a payout below the minimum is refused
- [ ] Open a book URL with `?aref=CODE` of the author, buy, and check the entry source says "referral"
- [ ] With `BOOKS_USD_ENABLED=false`, a visitor from outside Nigeria (test with a VPN) sees naira and "Ask us about international print"
- [ ] The sitemap lists the published book and its author and no drafts

### Rollback (books)
Code: Vercel "Promote to Production" on the previous deployment (no data is lost; entitlements and entries stay in the tables).
Database (only if you must remove books entirely; this deletes books data):
```sql
-- 1. stop selling and withdraw access first
update public.books set status = 'draft';
-- 2. remove the new tables (order matters because of references)
drop table if exists public.royalty_entries, public.royalty_payouts, public.royalty_rules,
  public.download_log, public.entitlements, public.book_formats, public.books, public.authors, public.books_settings cascade;
-- 3. optional: remove the added columns (existing orders keep working without them)
alter table public.order_items drop column if exists item_type, drop column if exists book_id, drop column if exists book_format_id;
alter table public.orders drop column if exists currency, drop column if exists payment_fee, drop column if exists author_ref_code;
-- 4. buckets: empty them in the dashboard, then
delete from storage.buckets where id in ('book-files', 'book-public');
drop function if exists public.is_admin();
```
Do not drop `order_items.item_type` or `orders.currency` while any book order exists that you still need to refund.
