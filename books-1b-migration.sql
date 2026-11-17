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
