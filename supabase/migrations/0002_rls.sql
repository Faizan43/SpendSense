-- Row level security.
--
-- This is the security boundary, not the application code. Every query the app
-- makes runs as the signed-in user, so a forgotten `.eq('user_id', ...)` filter
-- leaks nothing — Postgres refuses the rows. The service-role key bypasses all
-- of this and is used in exactly one place (reading an uploaded receipt file
-- inside the extraction route); it must never reach the browser.

-- Defaulting user_id to auth.uid() keeps inserts honest: the column is not
-- something the client has to supply, and the WITH CHECK clause rejects it if a
-- client tries to supply someone else's.
alter table public.categories       alter column user_id set default auth.uid();
alter table public.category_rules   alter column user_id set default auth.uid();
alter table public.stores           alter column user_id set default auth.uid();
alter table public.products         alter column user_id set default auth.uid();
alter table public.receipts         alter column user_id set default auth.uid();
alter table public.transactions     alter column user_id set default auth.uid();
alter table public.transaction_items alter column user_id set default auth.uid();
alter table public.budgets          alter column user_id set default auth.uid();
alter table public.notifications    alter column user_id set default auth.uid();

alter table public.profiles           enable row level security;
alter table public.categories         enable row level security;
alter table public.category_rules     enable row level security;
alter table public.stores             enable row level security;
alter table public.products           enable row level security;
alter table public.receipts           enable row level security;
alter table public.transactions       enable row level security;
alter table public.transaction_items  enable row level security;
alter table public.budgets            enable row level security;
alter table public.notifications      enable row level security;

-- profiles keys on `id` rather than `user_id`.
create policy profiles_select_own on public.profiles
  for select using (auth.uid() = id);
create policy profiles_insert_own on public.profiles
  for insert with check (auth.uid() = id);
create policy profiles_update_own on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Everything else follows the identical owner-only shape.
do $$
declare
  t text;
begin
  foreach t in array array[
    'categories', 'category_rules', 'stores', 'products', 'receipts',
    'transactions', 'transaction_items', 'budgets', 'notifications'
  ]
  loop
    execute format(
      'create policy %1$s_select_own on public.%1$s
         for select using (auth.uid() = user_id)', t);
    execute format(
      'create policy %1$s_insert_own on public.%1$s
         for insert with check (auth.uid() = user_id)', t);
    execute format(
      'create policy %1$s_update_own on public.%1$s
         for update using (auth.uid() = user_id)
         with check (auth.uid() = user_id)', t);
    execute format(
      'create policy %1$s_delete_own on public.%1$s
         for delete using (auth.uid() = user_id)', t);
  end loop;
end;
$$;
