-- One commission per order, one referrals row per referred customer.
--
-- The app now awards commission in server code when an order is marked delivered, and checks for an
-- existing commission first. This index makes the DATABASE refuse a second commission for the same order
-- even if two requests race, so an order can never pay an affiliate twice.
--
-- Safe to run more than once. Re-checked read-only on 16 Nov 2026: commissions has 1 row (1 distinct order)
-- and referrals has 8 rows with no duplicate (affiliate, referred user) pair, so neither index can fail on
-- existing data. Changes indexes only; no rows are modified.

create unique index if not exists commissions_order_id_key
  on public.commissions (order_id);

create unique index if not exists referrals_affiliate_user_key
  on public.referrals (affiliate_id, referred_user_id);
