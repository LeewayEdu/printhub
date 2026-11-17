-- Lead capture foundation.
-- The `leads` table already exists (used by the chatbot) with:
--   id, created_at, source, name, phone, status, conversation
-- This migration ADDS the missing columns, sets a default status, and makes
-- Row Level Security explicit: only admins can read or update leads. There is
-- deliberately NO insert policy: the website inserts through /api/leads, which
-- uses the service-role key (that bypasses RLS), so visitors can never read or
-- write the table directly.
-- Safe to run more than once. No existing rows are changed (the table is empty).

alter table public.leads
  add column if not exists product_interest text,
  add column if not exists quantity integer,
  add column if not exists email text,
  add column if not exists notes text;

alter table public.leads alter column status set default 'new';

alter table public.leads enable row level security;

drop policy if exists "Admins can read leads" on public.leads;
create policy "Admins can read leads" on public.leads
  for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'super_admin')));

drop policy if exists "Admins can update leads" on public.leads;
create policy "Admins can update leads" on public.leads
  for update to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'super_admin')))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'super_admin')));

create index if not exists leads_status_created_idx on public.leads (status, created_at desc);
