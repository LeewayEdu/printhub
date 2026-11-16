-- READ-ONLY queries. Paste them into the Supabase SQL editor, then paste the results into
-- docs/db-introspection-results.txt (any format, a screenshot-to-text is fine) so I can read them.
-- None of these change anything.

-- 1. Row Level Security policies on the order tables and related tables
--    (tells me whether customers can currently insert or update their own orders, i.e. set status = 'paid')
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('orders', 'order_items', 'leads', 'commissions', 'referrals', 'affiliates', 'loyalty_log', 'loyalty_transactions', 'profiles')
order by tablename, policyname;

-- 2. Is RLS switched on for those tables?
select relname as table_name, relrowsecurity as rls_enabled, relforcerowsecurity as rls_forced
from pg_class
where relnamespace = 'public'::regnamespace
  and relname in ('orders', 'order_items', 'leads', 'commissions', 'referrals', 'affiliates', 'loyalty_log', 'loyalty_transactions', 'profiles');

-- 3. Function bodies (loyalty and commission awards, and the admin-role helper)
select p.proname, pg_get_functiondef(p.oid) as definition
from pg_proc p
where p.pronamespace = 'public'::regnamespace
  and p.proname in ('award_loyalty_on_delivery', 'award_affiliate_commission', 'get_my_role', 'ensure_affiliate_row');

-- 4. All triggers in the public schema (who else writes loyalty points or commissions?)
select tgrelid::regclass as table_name, tgname, pg_get_triggerdef(oid) as definition
from pg_trigger
where not tgisinternal and tgrelid::regclass::text like 'public.%'
order by 1, 2;

-- 5. Constraints and indexes on the tables I want to protect (unique keys, foreign keys, nullability)
select conrelid::regclass as table_name, conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid::regclass::text in ('public.orders', 'public.commissions', 'public.referrals', 'public.loyalty_log', 'public.loyalty_transactions', 'public.leads')
order by 1, 2;

select tablename, indexname, indexdef
from pg_indexes
where schemaname = 'public' and tablename in ('orders', 'commissions', 'referrals', 'loyalty_log', 'loyalty_transactions', 'leads')
order by 1, 2;

-- 6. Column types of the tables above (so my statements use the right types)
select table_name, column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in ('orders', 'order_items', 'commissions', 'referrals', 'loyalty_log', 'loyalty_transactions', 'leads', 'affiliates')
order by table_name, ordinal_position;

-- 7. Storage policies on the bucket that holds designs and receipts
select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
order by policyname;
