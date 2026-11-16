# Deploy runbook: ux-fixes branch

Written for the owner. Nothing here has been run; there is no production access from this machine.
Do the steps in order. Do not skip step 3 (the migration order matters).

## 0. What is going live
The `ux-fixes` branch (not pushed yet). The parts that touch money or data:
- orders are created and paid-confirmed on the server (`/api/orders/create`, `/api/payments/verify`, webhook)
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

**Warning: the database.** A preview that uses the production Supabase keys writes its test orders into the
**real** database (they appear in the admin Orders screen, can trigger commissions and loyalty points).
Safer: create a second Supabase project for previews, run `supabase-schema.sql` plus the migration files, and
use its keys on Preview. If you accept the risk, name test customers "TEST" and cancel the orders afterwards.

**Paystack test webhook:** in the Paystack dashboard (Test mode) > Settings > API Keys & Webhooks, set the
test webhook URL to `https://<preview-url>/api/webhooks/paystack`. Use Paystack's documented test cards
(their docs list the card number, expiry, CVV and PIN) so no real money moves.

**Production variables to add (Production only):**
- `CRON_SECRET`: any long random string. Without it the reconciliation route refuses every call (it is
  closed by default) and the daily job reports nothing.
- Keep the live `pk_live_` / `sk_live_` keys as they are. Do not change them as part of this deploy.

## 2. Order of deployment
1. Push `ux-fixes` and open the preview. Run the checklist in section 4 on the preview first.
2. Check the live Paystack webhook URL is `https://printhub.cchumedia.com/api/webhooks/paystack`.
3. Add `CRON_SECRET` to Production variables.
4. Promote the preview to Production in Vercel (or merge to `main`).
5. Run the post-deploy checklist (section 4) on production.
6. Only then run the migrations, in the order in section 3.

## 3. Migration order (exact)
Run each in the Supabase SQL editor, one at a time. Save the result of query 1 in
`docs/db-introspection-queries.sql` (the current `orders` / `order_items` policies) **before** step C, because
that is what you need to roll back.

| Step | File | Run when | Why this position |
|---|---|---|---|
| A | `commission-uniqueness-migration.sql` | after the new code is live | Adds two unique indexes only. Safe and additive. Pre-checked 16 Nov: no duplicates exist |
| B | `lead-capture-migration.sql` | after the new code is live | Adds lead columns and makes `leads` admin-only. The old code wrote leads straight from the browser, which this would block, so the new `/api/leads` must be live first |
| C | `payment-integrity-migration.sql` | **last**, only after a real test order has gone through the new server path on production | It removes customers' ability to write orders. The OLD checkout inserts orders from the browser, so if it ran before the new code is live, **checkout would break for every customer** |

Do not run C until you have confirmed a test order created through `/api/orders/create` on production
(it appears in Admin > Orders as pending, then paid after payment).

## 4. Post-deploy checklist
Tick each one on preview, then again on production.

- [ ] **Card test order** (preview: test card; production: a small real order, ₦3,000 minimum products are fine): order appears, shows "Verifying your payment…", then paid. Check Admin > Orders shows `paid`.
- [ ] **Tampered cart refused:** not needed to repeat by hand; covered by `scripts/check-order-pricing.mts`.
- [ ] **Bank-transfer order:** choose bank transfer, upload a receipt; order shows `pending` with the "Awaiting receipt" badge; "Approve Receipt" marks it paid.
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
**Roll back migration C first** if you roll the code back after C ran, because the old code needs browser write
access to `orders`.

**C. payment-integrity-migration.sql**
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
