# Policies on orders and order_items: what the migration drops and what relies on them

Status: **read from the code, not from the database.** There is no `SUPABASE_DB_URL`, and the policy list
(`pg_policies`) is not readable through the REST API. Run query 1 of `docs/db-introspection-queries.sql`
in the Supabase SQL editor and paste the result into `docs/db-introspection-results.txt`; I will then
compare it with the table below. Until then the "currently dropped" column is unknown.

## What `payment-integrity-migration.sql` does
Drops **every** existing policy on `orders` and `order_items`, then creates:
- customers: SELECT their own rows only (`user_id = auth.uid()`; items via their order)
- admins (`profiles.role` in `admin`, `super_admin`): everything
- the service key (server routes) bypasses RLS, so order creation and payment confirmation still work

## What in the app reads or writes these tables from the browser
| Screen / code | Access | Covered after migration? |
|---|---|---|
| Customer dashboard `dashboard/page.tsx`, `dashboard/orders/page.tsx`, `ordersStore.ts` | SELECT own orders and items | Yes (customer read policy) |
| Checkout success page | SELECT own order by id | Yes (owner). A guest could not, but guest checkout does not exist yet |
| Admin orders screen `adminOrdersStore.ts` | SELECT all, UPDATE status, notes, receipt flags | Yes (admin policy) |
| Dashboard layout badge `dashboard/layout.tsx` | COUNT of orders awaiting receipt (admin) | Yes for admins. A non-admin gets count 0, which is fine |
| Admin affiliates page | SELECT commissions joined to orders | Yes (admin) |
| Affiliate dashboard `dashboard/affiliate/page.tsx` | Reads commissions and referrals only, **not** orders | Not affected |
| Mobile app (Capacitor) | Loads the live website, so it runs this same code. No separate database client | Not affected |
| Checkout / order creation | Used to INSERT from the browser | **No longer allowed, by design.** Replaced by `/api/orders/create` (service key) |

Only roles seen in the code are `user`, `admin`, `super_admin`. If you have any other role (staff, printer)
that uses the admin orders screen, tell me: it would lose access.

## Things that only the database can answer
1. Is there an existing policy that lets affiliates see referred customers' orders? The code does not need
   it, but the migration would remove it.
2. Does the database function `award_loyalty_on_delivery` run as the caller (SECURITY INVOKER)? It is called
   from the admin browser session, so it will keep working as an admin. If it is also called from a
   customer session anywhere, it would be blocked.
3. Does an `orders.status` check constraint allow `payment_review`? The code already writes it.

## Found while checking (fixed in this branch)
The admin affiliates page asked for `orders(job_number, total, ...)`; the column is `total_amount`, so the
query returned a 400 error and the commission list under each affiliate was always empty. Fixed. With
the commission now recorded for BLESSING it will show.

## Pre-checks run (read-only, 16 Nov 2026)
- 13 orders have a Paystack reference, all distinct (the unique index will succeed)
- commissions: 1 row, 1 distinct order; referrals: 8 rows, no duplicate pair (both unique indexes will succeed)
- orders in pending or payment_review right now: 1
