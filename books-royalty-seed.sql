-- C-Chu Books: royalty settings seed. NOT run (no database connection). Run AFTER books-1b-migration.sql.
-- Every percentage lives in this table and is editable in Admin > Books > Defaults and settings.
-- Re-running is safe: a rule that already exists is never overwritten (so admin edits are kept).
--
-- Share rules (how the numbers are used):
--   ebook author share     % of NET   (price minus the Paystack fee share)
--   print author share     % of (price minus print cost minus the Paystack fee share)
--   referral share         % of NET for EBOOKS, when the sale came through the author's own referral link or code
--   hold days              the sale becomes payable this many days after payment
--   minimum payout         an author is paid only when the payable total reaches this (naira)

-- 1. Default rule: distribution-only authors
insert into public.royalty_rules (book_id, option_key, option_name, ebook_author_share_pct, print_author_share_pct, referral_share_pct, hold_days, minimum_payout)
select null, 'distribution', 'Distribution-only author', 70, 30, 85, 30, 5000
where not exists (select 1 from public.royalty_rules where book_id is null and option_key = 'distribution');

-- 2. Package rule: books published through a C-Chu publishing package
insert into public.royalty_rules (book_id, option_key, option_name, ebook_author_share_pct, print_author_share_pct, referral_share_pct, hold_days, minimum_payout)
select null, 'package', 'C-Chu publishing package', 80, 40, 85, 30, 5000
where not exists (select 1 from public.royalty_rules where book_id is null and option_key = 'package');

-- 3. Which books use the package rule (everything else uses 'distribution'). Fill in the slugs, then run.
--    update public.books set royalty_option = 'package' where slug in ('<package-book-slug-1>', '<package-book-slug-2>');

-- 4. Print cost per copy (naira), per book. NOT filled in: no costs were supplied, and none is guessed.
--    Until a cost is set, print and bundle sales of that book are recorded with the flag "needs print cost" and an
--    author share of 0, and the admin screen shows "print cost missing".
--    update public.book_formats set print_cost_ngn = <amount> where type in ('print', 'bundle')
--      and book_id = (select id from public.books where slug = '<book-slug>');

-- 5. Optional: a per-book override, only for a book that must differ from its option
--    insert into public.royalty_rules (book_id, option_name, ebook_author_share_pct, print_author_share_pct, referral_share_pct, hold_days, minimum_payout)
--    select id, 'Override', <ebook %>, <print %>, <referral %>, 30, 5000 from public.books where slug = '<book-slug>';
