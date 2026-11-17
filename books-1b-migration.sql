-- C-Chu Books, follow-up changes (royalty options, ledger flags, settlement, background stamping, file size).
-- NOT run yet (no database connection). Run AFTER books-migration.sql. Safe to run more than once, additive only.
--
-- Part A (royalty options and flags)
alter table public.royalty_rules  add column if not exists option_key text;
alter table public.books          add column if not exists royalty_option text not null default 'distribution';
alter table public.royalty_entries add column if not exists flag text;       -- e.g. 'needs_print_cost', 'awaiting_settlement'

-- Named options (distribution, package) are rules with book_id null and an option_key. The old "one default rule"
-- index is replaced by "one rule per option". A default created earlier by the admin screen is adopted as 'distribution'.
update public.royalty_rules set option_key = 'distribution' where book_id is null and option_key is null;
drop index if exists public.royalty_rules_default_key;
create unique index if not exists royalty_rules_option_key on public.royalty_rules (option_key) where book_id is null;
create index if not exists royalty_entries_flag_idx on public.royalty_entries (flag) where flag is not null;

-- Part B (currency: pay authors in naira at the rate actually received)
alter table public.orders           add column if not exists settled_ngn numeric(14,2);          -- naira Paystack settled for the whole order (USD orders)
alter table public.royalty_entries  add column if not exists rate_to_ngn numeric(14,6);          -- 1 for naira orders; settled_ngn / order total for USD orders
alter table public.royalty_entries  add column if not exists author_share_ngn numeric(14,2);     -- the amount actually owed to the author, in naira
alter table public.royalty_entries  add column if not exists settled_note text;

-- Part C (stamping in the background, and the ebook size limit)
alter table public.entitlements add column if not exists stamp_status text not null default 'pending'
  check (stamp_status in ('pending', 'processing', 'ready', 'failed'));
alter table public.entitlements add column if not exists stamped_pdf_path  text;      -- PRIVATE bucket book-files
alter table public.entitlements add column if not exists stamped_epub_path text;
alter table public.entitlements add column if not exists stamp_attempts    integer not null default 0;
alter table public.entitlements add column if not exists stamp_error       text;
alter table public.entitlements add column if not exists stamp_started_at  timestamptz;
create index if not exists entitlements_stamp_idx on public.entitlements (stamp_status) where stamp_status <> 'ready';
alter table public.books_settings add column if not exists max_ebook_mb integer not null default 30 check (max_ebook_mb between 1 and 500);
