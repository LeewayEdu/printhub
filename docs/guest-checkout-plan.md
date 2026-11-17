# Guest checkout: review and migration plan

Status: **plan only. Nothing here has been built or run.** It needs your approval, and every
database change below needs your approval before it is applied.

Goal: a customer can pay with a phone number or an email address, with no account.

## 1. What assumes a logged-in user today

| # | Where | What it assumes |
|---|---|---|
| 1 | `src/app/checkout/page.tsx` line 62-66 | No session means an immediate redirect to `/auth?tab=login`. The whole page is unreachable to guests. It also pre-fills the form from `profiles`. |
| 2 | `checkout/page.tsx` `saveOrder` (line ~129) | `orders.insert({ user_id: session.user.id, ... })` straight from the browser with the anon key plus the user's JWT. Row Level Security on `orders` (the repo schema's `orders_own` policy is `auth.uid() = customer_id`; the live column is `user_id`) lets a guest insert nothing. `order_items.insert` is the same. |
| 3 | `checkout/page.tsx` bank-transfer receipt | Uploads the receipt to the public `products` storage bucket from the browser. Whether storage policies allow anonymous uploads is **unknown** (policies are not in the repo). |
| 4 | `src/app/cart/page.tsx` design upload | Same bucket, same unknown policy. Guests uploading a design file may fail. |
| 5 | `src/app/checkout/success/page.tsx` | Reads the order by `id` from the browser; RLS would block a guest. Needs a token. |
| 6 | `src/app/dashboard/orders/page.tsx`, `dashboard/page.tsx` | List orders `where user_id = session.user.id`. Guests have no dashboard; they need a lookup page. |
| 7 | `src/app/api/webhooks/paystack/route.ts` | Order confirmation by `paystack_reference` is fine for guests (service key, no user needed). **Affiliate commission** (lines ~100-170) starts with `if (customerId)`, where `customerId = order.user_id`, then `profiles.referred_by`. A guest order earns the referrer nothing. It also keys prior-order counting and the `referrals` update on the customer id. |
| 8 | `src/app/api/auth/referral/route.ts` + `ReferralCapture` | Referral attribution is written to `profiles.referred_by` **at registration** from the `ref_code` cookie. A guest never registers, so the cookie is never turned into an attribution. |
| 9 | Loyalty points | `profiles.loyalty_points` is read in the dashboard, but **no code in this repo writes it**; points must be awarded by a database trigger or function that is not in the repo. I cannot confirm how a delivered order credits points, so I cannot say how a guest order would behave. This must be checked in Supabase before building. |
| 10 | `/api/notify` | Uses the email and name posted by the checkout. Works for guests as is. |
| 11 | Home page step "Register & Browse", how-it-works step 1 | Copy only; change after guest checkout ships. |

Two existing problems found while reading, independent of guests:
- The webhook and referral code query `referrals.profile_id`, but the live table has `referred_user_id`
  (columns seen: `id, affiliate_id, referred_user_id, total_orders, total_spent, total_commission, created_at`).
  Referral totals may be silently failing to update today. Worth a separate check.
- `supabase-schema.sql` in the repo is out of date against the live database (`customer_id` vs `user_id`,
  different column names), so it cannot be trusted as the source of truth.

## 2. Recommended approach

Keep one `orders` table. Make `user_id` optional, identify guest orders by contact details plus a secret
token, create guest orders **only through a server route** (service key), and let a guest "claim" their
orders when they later register with the same email or phone.

Why not create a hidden auth user for every guest: it needs a real or invented email per guest, creates
accounts people did not ask for, and mixes guest and customer data in `profiles` (loyalty, referral, admin
user lists).

## 3. Database changes (for your approval; not run)

```sql
-- 1. Guests have no user id; keep their contact details and a lookup token on the order
alter table public.orders alter column user_id drop not null;   -- harmless if already nullable
alter table public.orders
  add column if not exists is_guest boolean not null default false,
  add column if not exists guest_token uuid default gen_random_uuid(),
  add column if not exists referral_code text;                   -- ref cookie captured at checkout

create unique index if not exists orders_guest_token_idx on public.orders (guest_token);
create index if not exists orders_phone_idx on public.orders (phone);
create index if not exists orders_email_idx on public.orders (lower(email));

-- 2. The commission row must be able to point at a guest (no profile)
--    (commissions.referred_customer is currently a profile id; needs to allow null plus a guest key)
-- exact statement depends on the live commissions columns, which I could not read: it has no rows yet.
```

Existing rows are untouched (all 31 orders have a `user_id`). I would also confirm the live RLS and
storage policies before writing the final statements; they are not in the repo.

## 4. Step-by-step

1. **Confirm unknowns in Supabase (read-only):** `orders` RLS policies, `order_items` policies, storage
   policies on the `products` bucket, the trigger or function that awards loyalty points, and the live
   `commissions` columns. (0.5 day)
2. **Migration** from section 3 after your approval. (0.5 day)
3. **`POST /api/checkout/order`** (service key): validates cart items against the live pricing function
   (so a guest cannot send their own prices), creates `orders` and `order_items`, returns `guest_token`.
   Same route used for logged-in users, so there is one code path. Rate limited like `/api/leads`. (1 day)
4. **Checkout page:** remove the login redirect; ask for name, phone and email; keep the logged-in
   pre-fill; call the new route; add a "log in for faster checkout" link. (1 day)
5. **Uploads:** route design files and bank receipts through a small server upload route (or confirm the
   storage policy allows guests). Guests must not be able to overwrite other files. (0.5-1 day)
6. **Order lookup:** `/orders/track` taking order number plus phone or email, and the success page reading
   by `guest_token`. Send the token link in the confirmation email. (1 day)
7. **Referral and commission:** read `ref_code` from the cookie at order creation, store it on the order,
   and make the webhook pay commission for guest orders (guest key instead of profile id); fix the
   `referrals` column mismatch at the same time. (1 day)
8. **Loyalty:** decide the rule (see section 5), then implement it. (0.5 day, after step 1)
9. **Claim on register:** when someone registers or logs in, attach guest orders with the same verified
   email or phone to their account. (0.5 day)
10. **Copy and tests:** update the home and how-it-works steps; test guest card payment, guest bank transfer,
    referral guest order, and a returning customer. (1 day)

Estimated total: **7-8 working days**, most of the risk in steps 1, 3 and 7.

## 5. Decisions needed from you

1. Do guests earn **loyalty points**? Suggestion: only after they claim the order by registering.
2. Should a guest order **pay affiliate commission**? Suggestion: yes, using the referral cookie.
3. **Email required, phone required, or either?** Suggestion: phone required (you contact customers on
   WhatsApp), email optional but needed for the Paystack receipt.
4. May guests **upload design files** and bank receipts? That opens storage writes to the public, so
   file type and size limits are needed.
5. Approve the **database changes** in section 3, once step 1 has confirmed the live policies.
