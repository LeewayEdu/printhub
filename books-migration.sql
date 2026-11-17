-- C-Chu Books, Phase 1. Run in the Supabase SQL editor. NOT run yet (no database connection).
--
-- Safe to run more than once. Additive only: new tables, new columns with defaults, two storage buckets.
-- Nothing existing is dropped or rewritten, and no existing row changes.
--
-- Access model
--   * Only the server (service key, which bypasses RLS) writes to any books table.
--   * Customers can read ONLY their own entitlements, plus the public catalogue (published books,
--     authors and the price columns of active formats).
--   * Private file paths (ebook PDF / EPUB, print cost) are NOT readable by customers or visitors:
--     book_formats only grants the public columns to the anon and authenticated roles.
--   * Admins (profiles.role admin or super_admin) can read everything.
--
-- Run order: this file is independent of the earlier migrations. See docs/deploy-runbook.md.

create extension if not exists pgcrypto;

-- helper used by every admin policy
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'super_admin'))
$$;

-- ── authors ───────────────────────────────────────────────────────────────────
create table if not exists public.authors (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  slug              text not null unique,
  bio               text,
  photo_url         text,
  social_links      jsonb not null default '{}'::jsonb,
  payout_details_ref text,                      -- a reference only (never bank details in this table)
  referral_code     text unique,                -- used for author referral links (?aref=CODE)
  status            text not null default 'draft' check (status in ('draft', 'published')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ── books ─────────────────────────────────────────────────────────────────────
create table if not exists public.books (
  id                   uuid primary key default gen_random_uuid(),
  title                text not null,
  slug                 text not null unique,
  subtitle             text,
  description          text,
  cover_url            text,
  author_id            uuid not null references public.authors(id),
  language             text not null default 'English',
  categories           text[] not null default '{}',
  isbn                 text,
  page_count           integer check (page_count is null or page_count > 0),
  published_date       date,
  preview_url          text,                    -- public sample PDF (bucket book-public)
  status               text not null default 'draft' check (status in ('draft', 'published')),
  rights_confirmed     boolean not null default false,
  rights_document_ref  text,
  rights_note          text,
  rights_confirmed_by  uuid references public.profiles(id),
  rights_confirmed_at  timestamptz,
  seo_title            text,
  seo_description      text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  -- A book can never be published unless the rights have been confirmed (enforced by the database)
  constraint books_rights_before_publish check (status <> 'published' or rights_confirmed = true),
  -- and a confirmation must say who confirmed it
  constraint books_rights_needs_confirmer check (rights_confirmed = false or (rights_confirmed_by is not null and rights_confirmed_at is not null))
);
create index if not exists books_status_idx on public.books (status);
create index if not exists books_author_idx on public.books (author_id);

-- ── book_formats ──────────────────────────────────────────────────────────────
create table if not exists public.book_formats (
  id               uuid primary key default gen_random_uuid(),
  book_id          uuid not null references public.books(id) on delete cascade,
  type             text not null check (type in ('print', 'ebook', 'bundle')),
  price_ngn        numeric(12,2) not null check (price_ngn >= 0),
  price_usd        numeric(12,2) check (price_usd is null or price_usd >= 0),
  stock            integer check (stock is null or stock >= 0),     -- print and bundle only
  print_cost_ngn   numeric(12,2) check (print_cost_ngn is null or print_cost_ngn >= 0),   -- per copy, for royalties
  ebook_pdf_path   text,                                           -- PRIVATE bucket book-files
  ebook_epub_path  text,                                           -- PRIVATE bucket book-files
  active           boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (book_id, type)
);

-- ── entitlements (who may download what) ──────────────────────────────────────
create table if not exists public.entitlements (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id),
  order_id         uuid not null references public.orders(id),
  order_item_id    uuid not null references public.order_items(id),
  book_id          uuid not null references public.books(id),
  book_format_id   uuid not null references public.book_formats(id),
  granted_at       timestamptz not null default now(),
  download_count   integer not null default 0,
  max_downloads    integer not null default 5,
  revoked_at       timestamptz,
  unique (order_item_id)                      -- one entitlement per paid item, so repeated confirmation cannot grant twice
);
create index if not exists entitlements_user_idx on public.entitlements (user_id);

create table if not exists public.download_log (
  id              uuid primary key default gen_random_uuid(),
  entitlement_id  uuid not null references public.entitlements(id),
  downloaded_at   timestamptz not null default now(),
  file_type       text,
  ip_hash         text,                       -- salted hash, never the raw address
  user_agent      text
);
create index if not exists download_log_ent_idx on public.download_log (entitlement_id);

-- ── royalties ─────────────────────────────────────────────────────────────────
create table if not exists public.royalty_rules (
  id                       uuid primary key default gen_random_uuid(),
  book_id                  uuid references public.books(id) on delete cascade,   -- null = the default rule
  option_name              text,
  ebook_author_share_pct   numeric(5,2) check (ebook_author_share_pct is null or ebook_author_share_pct between 0 and 100),
  print_author_share_pct   numeric(5,2) check (print_author_share_pct is null or print_author_share_pct between 0 and 100),
  print_share_basis        text not null default 'net_after_print_cost',
  referral_share_pct       numeric(5,2) check (referral_share_pct is null or referral_share_pct between 0 and 100),
  hold_days                integer not null default 30 check (hold_days >= 0),
  minimum_payout           numeric(12,2) not null default 5000 check (minimum_payout >= 0),
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
-- exactly one rule per book, and one default rule
create unique index if not exists royalty_rules_book_key on public.royalty_rules (book_id) where book_id is not null;
create unique index if not exists royalty_rules_default_key on public.royalty_rules ((true)) where book_id is null;

create table if not exists public.royalty_payouts (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid not null references public.authors(id),
  period      text not null,                                  -- 'YYYY-MM'
  currency    text not null default 'NGN',
  total       numeric(12,2) not null,
  status      text not null default 'pending' check (status in ('pending', 'paid')),
  paid_at     timestamptz,
  reference   text,
  notes       text,
  created_at  timestamptz not null default now()
);

create table if not exists public.royalty_entries (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references public.orders(id),
  order_item_id   uuid not null references public.order_items(id),
  book_id         uuid not null references public.books(id),
  author_id       uuid not null references public.authors(id),
  book_format_id  uuid references public.book_formats(id),
  part            text not null check (part in ('ebook', 'print')),          -- a bundle writes one of each
  currency        text not null default 'NGN',
  gross           numeric(12,2) not null,
  payment_fee     numeric(12,2) not null default 0,
  net             numeric(12,2) not null,
  author_share    numeric(12,2) not null,
  company_share   numeric(12,2) not null,
  source          text not null default 'store' check (source in ('store', 'referral')),
  status          text not null default 'pending' check (status in ('pending', 'payable', 'paid', 'reversed')),
  payable_at      timestamptz,
  refund_of       uuid references public.royalty_entries(id),                -- set on the negative entry made by a refund
  payout_id       uuid references public.royalty_payouts(id),
  note            text,
  created_at      timestamptz not null default now()
);
-- an order item writes each part once; refund entries (refund_of set) are exempt
create unique index if not exists royalty_entries_item_part_key on public.royalty_entries (order_item_id, part) where refund_of is null;
create unique index if not exists royalty_entries_refund_key on public.royalty_entries (refund_of) where refund_of is not null;
create index if not exists royalty_entries_author_idx on public.royalty_entries (author_id, created_at);

-- ── settings: the book affiliate rate is separate from the 10/5/3 product tiers ──
create table if not exists public.books_settings (
  id                   boolean primary key default true check (id),         -- single row
  book_affiliate_rate  numeric(5,2) not null default 0 check (book_affiliate_rate between 0 and 100),
  updated_at           timestamptz not null default now()
);
insert into public.books_settings (id) values (true) on conflict (id) do nothing;

-- ── existing tables: additive columns ─────────────────────────────────────────
alter table public.orders
  add column if not exists currency        text not null default 'NGN' check (currency in ('NGN', 'USD')),
  add column if not exists payment_fee     numeric(12,2),
  add column if not exists author_ref_code text;

alter table public.order_items
  add column if not exists item_type       text not null default 'product' check (item_type in ('product', 'book')),
  add column if not exists book_id         uuid references public.books(id),
  add column if not exists book_format_id  uuid references public.book_formats(id);

-- ── row level security ────────────────────────────────────────────────────────
alter table public.authors         enable row level security;
alter table public.books           enable row level security;
alter table public.book_formats    enable row level security;
alter table public.entitlements    enable row level security;
alter table public.download_log    enable row level security;
alter table public.royalty_rules   enable row level security;
alter table public.royalty_entries enable row level security;
alter table public.royalty_payouts enable row level security;
alter table public.books_settings  enable row level security;

drop policy if exists "Public reads published authors" on public.authors;
create policy "Public reads published authors" on public.authors for select to anon, authenticated using (status = 'published');
drop policy if exists "Admins manage authors" on public.authors;
create policy "Admins manage authors" on public.authors for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Public reads published books" on public.books;
create policy "Public reads published books" on public.books for select to anon, authenticated using (status = 'published');
drop policy if exists "Admins manage books" on public.books;
create policy "Admins manage books" on public.books for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Public reads active formats of published books" on public.book_formats;
create policy "Public reads active formats of published books" on public.book_formats for select to anon, authenticated
  using (active and exists (select 1 from public.books b where b.id = book_formats.book_id and b.status = 'published'));
drop policy if exists "Admins manage formats" on public.book_formats;
create policy "Admins manage formats" on public.book_formats for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Private columns (file paths, print cost) are never granted to visitors or customers
revoke all on public.book_formats from anon, authenticated;
grant select (id, book_id, type, price_ngn, price_usd, stock, active, created_at, updated_at) on public.book_formats to anon, authenticated;
grant insert, update, delete on public.book_formats to authenticated;   -- still limited to admins by the policy above
-- ebook_pdf_path, ebook_epub_path and print_cost_ngn have no select grant for anyone but the service key;
-- the admin screens read them through server routes.

drop policy if exists "Customers read own entitlements" on public.entitlements;
create policy "Customers read own entitlements" on public.entitlements for select to authenticated using (user_id = auth.uid());
drop policy if exists "Admins read entitlements" on public.entitlements;
create policy "Admins read entitlements" on public.entitlements for select to authenticated using (public.is_admin());
-- no insert / update / delete policy: customers cannot grant, edit or remove entitlements

drop policy if exists "Admins read download log" on public.download_log;
create policy "Admins read download log" on public.download_log for select to authenticated using (public.is_admin());

drop policy if exists "Admins read royalty rules" on public.royalty_rules;
create policy "Admins read royalty rules" on public.royalty_rules for select to authenticated using (public.is_admin());
drop policy if exists "Admins read royalty entries" on public.royalty_entries;
create policy "Admins read royalty entries" on public.royalty_entries for select to authenticated using (public.is_admin());
drop policy if exists "Admins read royalty payouts" on public.royalty_payouts;
create policy "Admins read royalty payouts" on public.royalty_payouts for select to authenticated using (public.is_admin());
drop policy if exists "Admins read books settings" on public.books_settings;
create policy "Admins read books settings" on public.books_settings for select to authenticated using (public.is_admin());
-- royalty and settings writes happen only through server routes (service key)

-- ── storage buckets ───────────────────────────────────────────────────────────
-- book-files is PRIVATE: no storage policy is created, so only the service key can read or write it
-- (downloads are served as short-lived signed URLs). book-public holds covers and the free preview.
insert into storage.buckets (id, name, public) values ('book-files', 'book-files', false) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('book-public', 'book-public', true) on conflict (id) do nothing;
update storage.buckets set public = false where id = 'book-files';
