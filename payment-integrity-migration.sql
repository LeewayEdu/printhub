-- Payment integrity: stop browsers from creating or changing orders directly.
--
-- Why: until now the checkout page inserted the order straight from the browser with
-- status 'paid', and the database let customers write their own orders. Anyone could
-- therefore create or edit an order as 'paid' without paying. The app now creates orders
-- on the server (/api/orders/create, service key) and only the server confirms Paystack
-- payments (/api/payments/verify and the signed webhook), so customers no longer need any
-- write access to these tables.
--
-- After this migration:
--   customers  -> can READ their own orders and items only
--   admins     -> (role admin or super_admin) can read and change everything, as the admin
--                 screens do today
--   server     -> the service key bypasses RLS, so order creation and payment confirmation work
--
-- BEFORE RUNNING: run docs/db-introspection-queries.sql (query 1) and check the current
-- policies on orders and order_items. This script DROPS ALL existing policies on those two
-- tables and recreates the ones above, so if you have another legitimate policy (for example
-- one that lets affiliates see referred orders) tell me and I will add it here first.
-- Changes policies and one index only. No order rows are modified.

-- 1. One order per Paystack reference (re-checked 16 Nov 2026: 13 orders carry a reference, 13 distinct)
create unique index if not exists orders_paystack_reference_key
  on public.orders (paystack_reference) where paystack_reference is not null;

-- 2. orders
alter table public.orders enable row level security;

do $$
declare r record;
begin
  for r in select policyname from pg_policies where schemaname = 'public' and tablename = 'orders' loop
    execute format('drop policy %I on public.orders', r.policyname);
  end loop;
end $$;

create policy "Customers read own orders" on public.orders
  for select to authenticated using (user_id = auth.uid());

create policy "Admins manage orders" on public.orders
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'super_admin')))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'super_admin')));

-- 3. order_items
alter table public.order_items enable row level security;

do $$
declare r record;
begin
  for r in select policyname from pg_policies where schemaname = 'public' and tablename = 'order_items' loop
    execute format('drop policy %I on public.order_items', r.policyname);
  end loop;
end $$;

create policy "Customers read own order items" on public.order_items
  for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_items.order_id and o.user_id = auth.uid()));

create policy "Admins manage order items" on public.order_items
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'super_admin')))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'super_admin')));
