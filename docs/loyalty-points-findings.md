# Loyalty points: how they are awarded (read-only findings)

Status: **nothing was changed.** Function bodies and triggers live only in the database and cannot be read
without a connection string, so what follows is what the code, the REST schema and the data prove, with the
unconfirmed parts marked.

## What triggers an award

- **Order status `delivered`, set from the admin Orders screen.** `src/store/adminOrdersStore.ts` runs
  `supabase.rpc('award_loyalty_on_delivery', { p_order_id, p_admin_id })` right after saving the status
  (and then `award_affiliate_commission`). Errors are only written to the browser console.
- **Not** on payment, and not on creation. Only the delivered status.
- The function `award_loyalty_on_delivery(p_admin_id uuid, p_order_id uuid)` exists in the live database
  (confirmed from the REST schema). Its body is **not in the repo and not readable**.
- If an order is marked delivered any other way (directly in Supabase, another tool), the award does not run.

## Rate

- Each delivery is logged at **2%** of the order total, matching the site's "earn 2%" claim
  (`LOYALTY.earnRate = 0.02`): for example ₦4,425 -> 88 points, ₦13,975 -> 279.
- **But customer balances are exactly double the logs.** Every delivery is written to **two** log tables,
  `loyalty_log` ("Earned on order #...") and `loyalty_transactions` ("Points earned from order #..."),
  and `profiles.loyalty_points` equals the sum of both:

| Customer | Sum in loyalty_transactions | Sum in loyalty_log | profiles.loyalty_points |
|---|---|---|---|
| 398b32c1 | 4,866 | 4,867 | 9,733 |
| d675c826 | 1,682 | 1,685 | 3,367 |
| 0006cfd4 | 352 | 353 | 705 |
| 2135d736 | 100 | 100 | 200 |
| f07e853a | 88 | 89 | 177 |

  So the effective rate is **4%**, double what the site promises. Total balances are 14,182 points while
  the logs support about 7,090: roughly **7,090 extra points (₦7,090 at 1 point = ₦1)** are outstanding.
  A likely explanation is two writers (a function and a trigger, or a function that credits twice), but I
  cannot see which; that needs the function and trigger definitions.
- **Duplicate award:** order `09D00127` is recorded twice in `loyalty_transactions` (30 Jun and 9 Jul 2026,
  231 points each), so the award is not protected against running twice for the same order.

## Would guest orders earn points?

Unconfirmed. The function receives only an order id and presumably credits `orders.user_id`. A guest order
has no user, so either nothing is credited or the function raises an error that the admin screen only logs.
Points live on `profiles`, so a guest cannot hold a balance without an account. See
`docs/guest-checkout-plan.md` (decision 1) for the suggested rule: credit points when the guest claims the
order by registering.

## What I need to be sure

```sql
select pg_get_functiondef('public.award_loyalty_on_delivery(uuid, uuid)'::regprocedure);
select pg_get_functiondef('public.award_affiliate_commission(uuid)'::regprocedure);
select tgname, tgrelid::regclass, pg_get_triggerdef(oid) from pg_trigger where not tgisinternal;
```

These are reads only; run them in the Supabase SQL editor or give me `SUPABASE_DB_URL`.

## Decisions

1. Is 2% the intended rate (as advertised)? If so the double crediting should be fixed and the over-credited
   points reviewed (adjust balances or honour them).
2. Make the award idempotent per order (one award per order id).
