# Loyalty points: fix plan (waiting on the database definitions)

Status: **nothing changed.** This is blocked on one thing: the double crediting is done by a database
function and/or trigger whose definitions I cannot read without a connection. Shipping app code that takes
over crediting before the old writer is removed could make it **triple** instead of fixing it.

## What I need (read-only, no changes)
Run **queries 3, 4 and 5** in `docs/db-introspection-queries.sql` in the Supabase SQL editor and paste the
results into `docs/db-introspection-results.txt`. They show:
- the body of `award_loyalty_on_delivery` (is it the one writing to both log tables, and does it add points twice?);
- every trigger on `orders`, `loyalty_log`, `loyalty_transactions`, `profiles` (is a trigger the second writer?);
- the constraints on both log tables (allowed `type` values, whether `order_id` can be null).

## Numbers for the reconciliation (read from the live data)
Balance = `profiles.loyalty_points`. Both log tables record every delivery at 2%; balances equal the two logs added together.

| Customer | Balance | Sum, loyalty_transactions | Sum, loyalty_log | Balance minus loyalty_transactions |
|---|---|---|---|---|
| 398b32c1 | 9,733 | 4,866 | 4,867 | 4,867 |
| d675c826 | 3,367 | 1,682 | 1,685 | 1,685 |
| 0006cfd4 | 705 | 352 | 353 | 353 |
| 2135d736 | 200 | 100 | 100 | 100 |
| f07e853a | 177 | 88 | 89 | 89 |
| **Total** | **14,182** | **7,088** | **7,094** | **7,094** |

Extra points you are honouring: **7,094 points (₦7,094 at 1 point = ₦1).**

Order `09D00127` (customer d675c826, 231 points) is recorded **twice in each log table** (30 Jun and 9 Jul 2026).

## Proposed steps (each write needs your approval; statements to be finalised once the definitions are visible)

1. **Remove the second writer.** Either fix `award_loyalty_on_delivery` so it writes one log row and adds the 2% once, or drop the
   trigger that adds it again. Exact statement depends on query 3 and 4.
2. **Take the duplicate rows out of the way** so a unique index can exist (2 rows: the later `09D00127` row in each log table).
   The 231 points stay in the balance and are folded into the adjustment below. Row ids come from the live tables when I run it.
3. **Unique index, one award per order** (fails today only because of the duplicates in step 2):
   ```sql
   create unique index if not exists loyalty_transactions_earn_order_key on public.loyalty_transactions (order_id) where type = 'earn';
   create unique index if not exists loyalty_log_earn_order_key on public.loyalty_log (order_id) where type = 'earn';
   ```
4. **Adjustment entries so balances and logs reconcile.** Assumes `loyalty_transactions` is the log to reconcile (it has the fuller note
   text; nothing in the app reads either table). After step 2 the amounts are: 398b32c1 +4,867; d675c826 +1,916 (1,685 + the 231 duplicate);
   0006cfd4 +353; 2135d736 +100; f07e853a +89 = **7,325 points** across 5 rows, for example:
   ```sql
   insert into public.loyalty_transactions (profile_id, order_id, type, points, balance, note)
   values ('d675c826-0aa9-47f4-a625-85a65959af83', null, 'adjustment', 1916, 3367,
           'Reconciliation: points were credited twice per delivery before 16 Nov 2026; extra points honoured by the owner');
   ```
   (`type = 'adjustment'` and `order_id = null` may be refused by a constraint; query 5 will tell.) `profiles.loyalty_points` is **not** touched.
5. **App change** (after step 1): one server routine credits 2% of the order total once, idempotent through the unique index, called from the
   same admin "delivered" action that already awards commission (`/api/admin/orders/award`).

## Would guest orders earn points?
Not confirmable until query 3 is read. The function receives only an order id and credits points to a profile; a guest order has no profile,
so the likely result is that nothing is credited (or the function errors, which the admin screen only logs). Suggested rule:
credit the points when the guest claims the order by registering (see `docs/guest-checkout-plan.md`, decision 1).

## Decisions
1. Confirm `loyalty_transactions` is the log to reconcile (or tell me to use `loyalty_log`).
2. Run queries 3, 4, 5 so I can write the exact statements.
