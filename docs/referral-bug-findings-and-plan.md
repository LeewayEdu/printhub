# Referral and commission bug: findings and proposed fix

Status: **investigation only.** No code or data has been changed. Everything under "Proposed" waits for your approval.

## Findings (all from read-only queries on the live database)

| Question | Answer |
|---|---|
| Have affiliate commissions been failing silently? | **Yes. The `commissions` table has 0 rows, ever.** |
| Why? | **Two separate paths exist and both produced nothing.** (1) The Paystack webhook: checkout saves the order as `paid` itself when Paystack's popup returns, so the webhook stops at its "already confirmed" check before the commission step. (2) The admin Orders screen calls the database function `award_affiliate_commission(p_order_id)` when an order is marked delivered. That function exists (confirmed in the REST schema) and was presumably run for order `abd8a141` when it was delivered, yet no commission row exists. **I cannot read the function body without a database connection**, so why it inserted nothing is unconfirmed. The likely cause is the same column mismatch (an error inside the function rolls back its insert), but that is a guess until the body can be read. |
| Was the `referrals.profile_id` query also wrong? | Yes. The live `referrals` table has `referred_user_id` (the repo's migration file says `profile_id`; the live database differs). The webhook's update by `profile_id` would fail silently, and so does the sign-up code in `/api/auth/referral` that inserts a `referrals` row. |
| Is affiliate lookup affected? | No. The webhook tries `affiliates.user_id` (does not exist, error ignored) then falls back to `profile_id` (correct). |
| Are referral totals wrong? | `affiliates.total_referrals` is correct (BLESSING 4, 2135D736 2, CCHU 1). But **7 of the 8 customers who signed up through a referral have no `referrals` row**, so per-referral order and spend totals are empty. |
| Paid orders from referred customers with no commission | **1** of 31 orders: `abd8a141-ef44-401e-84bc-9a481e247880`, ₦4,425, Paystack ref PRINTHUB-1789321560050, 13 Sep 2026, now delivered. Customer `f07e853a-...` was referred by affiliate **BLESSING**. |
| Total commission affected | **₦442.50** (10% of ₦4,425, the rate for a referrer's first 5 orders), owed to BLESSING as `pending`. |
| Orders table has a referral code? | No `referral_code` column exists on `orders`. Attribution is only `profiles.referred_by`. |

Related gap (not a bug in the code, a missing path): **17 of 31 orders were paid by bank transfer**. They never go through the Paystack webhook, so they can never earn a commission as the code stands. Only 1 order has come from a referred customer so far, so no money has been missed there yet.

Also noted: because the browser marks the order `paid` itself, the order status trusts the customer's browser. That is a separate payment-integrity risk worth fixing alongside this.

## Proposed code fix (not applied)

0. **Before any fix:** read the body of `award_affiliate_commission` (needs a database connection: `select pg_get_functiondef('public.award_affiliate_commission(uuid)'::regprocedure);`). Ideally keep ONE commission routine (that function, fixed) and have both the webhook and the admin delivery action call it, so a commission is paid exactly once whichever path runs first.

1. **Webhook** (`src/app/api/webhooks/paystack/route.ts`): move the affiliate commission block into a function that runs even when the order is already `paid`, protected against double payment by checking for an existing row in `commissions` with the same `order_id`. Use `affiliates.profile_id` directly (drop the `user_id` probing) and `referrals.referred_user_id`.
2. **Sign-up** (`src/app/api/auth/referral/route.ts`): insert into `referrals` using `referred_user_id`, checking first whether the row exists (the live table may not have the `(affiliate_id, profile_id)` unique key the old migration created).
3. **Checkout page:** stop setting `status = 'paid'` from the browser; save as `pending` and let the webhook mark it paid. (Needs a decision, see below.)
4. **Bank transfers:** award the commission when an admin confirms the transfer (decision below).

## Proposed data backfill (not run; each statement needs your approval)

**A. The one missing commission** (1 row inserted, 2 rows updated):

```sql
insert into public.commissions (affiliate_id, order_id, referred_customer, order_total, rate, amount, status)
values ('2228153d-dee0-4859-9ed6-68221d7b29d9', 'abd8a141-ef44-401e-84bc-9a481e247880',
        'f07e853a-639f-43dd-a929-b27089a7e522', 4425, 0.10, 442.50, 'pending');

update public.affiliates
   set total_earnings = coalesce(total_earnings, 0) + 442.50,
       pending_payout = coalesce(pending_payout, 0) + 442.50
 where id = '2228153d-dee0-4859-9ed6-68221d7b29d9';          -- BLESSING, currently 0 / 0
```

**B. The 7 missing `referrals` rows** (6 with zero totals, plus the one that carries the order above):

```sql
insert into public.referrals (affiliate_id, referred_user_id, total_orders, total_spent, total_commission)
values
  ('7b4b521f-243e-4886-b15e-4acc9ab0c634', '810ab8a3-bf2d-46aa-bae0-2d7b9cb67cd5', 0, 0, 0),
  ('2228153d-dee0-4859-9ed6-68221d7b29d9', 'fb66f982-be32-4e5b-a0b6-c37ef559888e', 0, 0, 0),
  ('a1dcd618-cd70-4f2a-b8fe-f063c83273db', 'fc15f335-2767-4642-bce6-06687b349495', 0, 0, 0),
  ('2228153d-dee0-4859-9ed6-68221d7b29d9', 'b64712bb-5fa3-4321-b0db-f2d1e915c265', 0, 0, 0),
  ('a1dcd618-cd70-4f2a-b8fe-f063c83273db', 'f66559e1-0be8-4f54-8807-c0e6f7b57407', 0, 0, 0),
  ('2228153d-dee0-4859-9ed6-68221d7b29d9', '6905a80c-aead-4ed0-80fa-97bbeea894f2', 0, 0, 0),
  ('2228153d-dee0-4859-9ed6-68221d7b29d9', 'f07e853a-639f-43dd-a929-b27089a7e522', 1, 4425, 442.50);
```

(Run only after confirming no row exists for those pairs; the generated list above was built from rows that do not exist today.)

## Decisions needed

1. Approve backfill A (pay BLESSING the ₦442.50) and B.
2. Approve the code fix, including stopping the browser from marking orders `paid`.
3. Should **bank-transfer orders** earn commission when an admin confirms them?
4. One existing `referrals` row points a referred user whose `referred_by` owner has no affiliate record (`fca2dd55-...`, under affiliate BAROONESS). Leave it, or investigate?
