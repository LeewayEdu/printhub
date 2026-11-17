-- Payment fields on orders.
--
-- Adds five columns. Existing rows are not changed (new text/numeric columns start empty,
-- is_test starts false for every existing order).
--   payment_method   'paystack' or 'bank' (or another value you set by hand, e.g. 'cash')
--   payment_note     free text: who marked the order paid by hand and why
--   is_test          true for test orders; hidden from revenue, loyalty and commission
--   paid_amount      the amount Paystack confirmed (naira), stored by the server after verification
--   paystack_status  Paystack's status for the transaction (success, abandoned, failed, ...)
--
-- Safe to run more than once. The app works before AND after this runs: it detects the missing
-- columns and skips them, so you can deploy the code first.
alter table public.orders
  add column if not exists payment_method  text,
  add column if not exists payment_note    text,
  add column if not exists is_test         boolean not null default false,
  add column if not exists paid_amount     numeric,
  add column if not exists paystack_status text;
