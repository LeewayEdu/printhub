-- One commission per order, one referrals row per referred customer.
--
-- The app now awards commission in server code when an order is marked delivered, and checks for an
-- existing commission first. This index makes the DATABASE refuse a second commission for the same order
-- even if two requests race, so an order can never pay an affiliate twice.
--
-- Safe to run more than once. Verified read-only beforehand: commissions has 0 rows and referrals has 1
-- row, so neither index can fail on existing duplicates. Changes indexes only; no rows are modified.

create unique index if not exists commissions_order_id_key
  on public.commissions (order_id);

create unique index if not exists referrals_affiliate_user_key
  on public.referrals (affiliate_id, referred_user_id);
