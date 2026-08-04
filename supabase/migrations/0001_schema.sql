-- Smart Grocery Expense Tracker — core schema
--
-- Money is stored as bigint minor units (pence). Never numeric, never float:
-- a category breakdown that doesn't add up to the total is worse than useless.
-- Dates of purchase are `date`, not timestamptz, because a receipt belongs to a
-- calendar day rather than an instant.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Collapses "TESCO EXTRA #4471" and "Tesco Extra" to the same key so the same
-- shop doesn't appear four times in the store comparison chart. Mirrored in
-- lib/normalize.ts — keep the two in step.
create or replace function public.normalize_name(input text)
returns text
language sql
immutable
as $$
  select nullif(
    btrim(
      regexp_replace(
        regexp_replace(lower(coalesce(input, '')), '[^a-z0-9]+', ' ', 'g'),
        '\s+', ' ', 'g'
      )
    ),
    ''
  );
$$;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.receipt_status as enum (
  'uploaded', 'processing', 'needs_review', 'confirmed', 'failed'
);

create type public.transaction_source as enum ('receipt', 'manual', 'import');

-- How an item ended up in its category, so the UI can show why and the
-- categoriser can tell a user's decision from its own guess.
create type public.category_source as enum (
  'user', 'product', 'rule', 'ai', 'fallback'
);

create type public.rule_source as enum ('system', 'learned', 'user');

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  currency text not null default 'GBP',
  locale text not null default 'en-GB',
  week_starts_on smallint not null default 1
    check (week_starts_on in (0, 1)),
  default_alert_threshold_pct smallint not null default 80
    check (default_alert_threshold_pct between 1 and 100),
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Categories and the rules that drive auto-categorisation
-- ---------------------------------------------------------------------------

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  slug text not null,
  name text not null,
  icon text not null default 'package',
  -- 1-8 index into the validated categorical chart palette; 0 = neutral.
  chart_slot smallint not null default 0 check (chart_slot between 0 and 8),
  is_system boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, slug)
);

create index categories_user_sort_idx
  on public.categories (user_id, sort_order);

create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

create table public.category_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  pattern text not null,
  match_type text not null default 'contains'
    check (match_type in ('contains', 'exact', 'prefix')),
  -- Lower runs first. User rules sit at 10, learned at 50, seeded at 100.
  priority integer not null default 100,
  source public.rule_source not null default 'system',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, pattern, match_type)
);

create index category_rules_lookup_idx
  on public.category_rules (user_id, priority, pattern);

create trigger category_rules_set_updated_at
  before update on public.category_rules
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Stores and products
-- ---------------------------------------------------------------------------

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  normalized_name text not null,
  chain text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, normalized_name)
);

create trigger stores_set_updated_at
  before update on public.stores
  for each row execute function public.set_updated_at();

create table public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  canonical_name text not null,
  normalized_name text not null,
  default_category_id uuid references public.categories (id) on delete set null,
  unit text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, normalized_name)
);

create index products_user_name_idx
  on public.products (user_id, normalized_name);

create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Receipts
-- ---------------------------------------------------------------------------

create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  store_id uuid references public.stores (id) on delete set null,
  purchase_date date,
  subtotal_minor bigint,
  tax_minor bigint,
  total_minor bigint,
  currency text not null default 'GBP',
  storage_path text not null,
  original_filename text,
  mime_type text not null,
  file_size_bytes bigint,
  page_count smallint,
  status public.receipt_status not null default 'uploaded',
  ocr_model text,
  ocr_raw jsonb,
  ocr_confidence numeric(4, 3),
  processed_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index receipts_user_created_idx
  on public.receipts (user_id, created_at desc);
create index receipts_user_status_idx
  on public.receipts (user_id, status);

create trigger receipts_set_updated_at
  before update on public.receipts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Transactions (one shopping trip) and their line items
-- ---------------------------------------------------------------------------

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  store_id uuid references public.stores (id) on delete set null,
  receipt_id uuid references public.receipts (id) on delete set null,
  purchase_date date not null,
  -- Always equals the sum of its items; maintained by trigger. Receipt-level
  -- discounts and bag charges become their own line items during review so
  -- the category breakdown always reconciles with the headline total.
  total_minor bigint not null default 0,
  currency text not null default 'GBP',
  notes text,
  source public.transaction_source not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index transactions_user_date_idx
  on public.transactions (user_id, purchase_date desc);
create index transactions_user_store_idx
  on public.transactions (user_id, store_id);
create unique index transactions_receipt_uniq
  on public.transactions (receipt_id) where receipt_id is not null;

create trigger transactions_set_updated_at
  before update on public.transactions
  for each row execute function public.set_updated_at();

create table public.transaction_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  transaction_id uuid not null
    references public.transactions (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  category_id uuid references public.categories (id) on delete set null,
  name text not null,
  raw_text text,
  quantity numeric(12, 3) not null default 1 check (quantity > 0),
  unit text,
  unit_price_minor bigint,
  total_price_minor bigint not null default 0,
  notes text,
  category_source public.category_source not null default 'fallback',
  category_confidence numeric(4, 3),
  position integer not null default 0,
  search_tsv tsvector generated always as (
    to_tsvector(
      'simple',
      coalesce(name, '') || ' ' || coalesce(raw_text, '') || ' ' || coalesce(notes, '')
    )
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index transaction_items_transaction_idx
  on public.transaction_items (transaction_id, position);
create index transaction_items_user_category_idx
  on public.transaction_items (user_id, category_id);
create index transaction_items_user_product_idx
  on public.transaction_items (user_id, product_id);
create index transaction_items_search_idx
  on public.transaction_items using gin (search_tsv);

create trigger transaction_items_set_updated_at
  before update on public.transaction_items
  for each row execute function public.set_updated_at();

-- Keep transactions.total_minor equal to the sum of its items.
create or replace function public.sync_transaction_total()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid := coalesce(new.transaction_id, old.transaction_id);
begin
  update public.transactions t
     set total_minor = coalesce(
           (select sum(i.total_price_minor)
              from public.transaction_items i
             where i.transaction_id = target), 0
         )
   where t.id = target;
  return null;
end;
$$;

create trigger transaction_items_sync_total
  after insert or update of total_price_minor, transaction_id or delete
  on public.transaction_items
  for each row execute function public.sync_transaction_total();

-- ---------------------------------------------------------------------------
-- Budgets
-- ---------------------------------------------------------------------------

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- Always the first of the month.
  period_month date not null,
  -- null = the overall monthly budget.
  category_id uuid references public.categories (id) on delete cascade,
  amount_minor bigint not null check (amount_minor > 0),
  alert_threshold_pct smallint not null default 80
    check (alert_threshold_pct between 1 and 100),
  rolls_over boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (period_month = date_trunc('month', period_month)::date)
);

create unique index budgets_overall_uniq
  on public.budgets (user_id, period_month) where category_id is null;
create unique index budgets_category_uniq
  on public.budgets (user_id, period_month, category_id)
  where category_id is not null;
create index budgets_user_month_idx on public.budgets (user_id, period_month);

create trigger budgets_set_updated_at
  before update on public.budgets
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  payload jsonb not null default '{}'::jsonb,
  -- Makes alert generation idempotent: re-editing a receipt can't re-fire the
  -- same "80% of your grocery budget" alert.
  dedupe_key text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index notifications_dedupe_uniq
  on public.notifications (user_id, dedupe_key) where dedupe_key is not null;
create index notifications_user_created_idx
  on public.notifications (user_id, created_at desc);
