-- Demo data, for looking at the dashboard before you've done a real shop.
--
-- Sign up first, then from the SQL editor:
--
--   select public.seed_demo_data('<your-user-uuid>');
--
-- From the app (or any signed-in client) call the no-argument overload
-- instead — it takes the user from the session, so there is no id to forge:
--
--   select public.seed_demo_data();
--
-- The uuid version is revoked from anon and authenticated by migration 0009;
-- only the SQL editor (service role) can call it.
--
-- It is safe to run twice: everything it creates is tagged, and a second run
-- clears the previous demo rows first. It never touches data you entered
-- yourself.

create or replace function public.seed_demo_data(p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store_ids uuid[];
  v_store_id uuid;
  v_transaction_id uuid;
  v_category_id uuid;
  v_date date;
  v_week integer;
  v_line integer;
  v_item record;
  v_items_created integer := 0;
  v_trips_created integer := 0;
  v_qty numeric;
  v_unit_price bigint;
begin
  perform public.seed_user_defaults(p_user_id);

  -- Clear any previous demo run. Real entries are left alone: only trips
  -- tagged as demo are removed.
  delete from public.transactions
   where user_id = p_user_id and notes = 'demo-data';

  -- Stores
  insert into public.stores (user_id, name, normalized_name)
  values
    (p_user_id, 'Tesco',        public.normalize_name('Tesco')),
    (p_user_id, 'Aldi',         public.normalize_name('Aldi')),
    (p_user_id, 'Sainsburys',   public.normalize_name('Sainsburys')),
    (p_user_id, 'Local Market', public.normalize_name('Local Market'))
  on conflict (user_id, normalized_name) do nothing;

  select array_agg(id order by name) into v_store_ids
    from public.stores where user_id = p_user_id;

  -- Roughly weekly shops over the last six months.
  for v_week in 0..25 loop
    v_date := (now()::date - (v_week * 7)) - (random() * 2)::integer;
    v_store_id := v_store_ids[1 + (random() * (array_length(v_store_ids, 1) - 1))::integer];

    insert into public.transactions
      (user_id, store_id, purchase_date, source, notes, currency)
    values
      (p_user_id, v_store_id, v_date, 'manual', 'demo-data', 'GBP')
    returning id into v_transaction_id;

    v_trips_created := v_trips_created + 1;

    -- Between 8 and 16 items per shop, drawn from a realistic basket.
    for v_line in 1..(8 + (random() * 8)::integer) loop
      select * into v_item from (
        values
          ('Semi-skimmed milk 2L',   'dairy',            120, 190),
          ('Cheddar cheese 400g',    'dairy',            280, 420),
          ('Greek yoghurt 500g',     'dairy',            150, 240),
          ('Free range eggs 6',      'dairy',            180, 290),
          ('Bananas',                'fruit-vegetables',  90, 150),
          ('Carrots 1kg',            'fruit-vegetables',  60, 110),
          ('Tomatoes',               'fruit-vegetables', 120, 200),
          ('Spinach 200g',           'fruit-vegetables', 110, 180),
          ('Chicken breast 600g',    'meat-seafood',     420, 650),
          ('Beef mince 500g',        'meat-seafood',     380, 560),
          ('Salmon fillet',          'meat-seafood',     450, 720),
          ('Wholemeal bread',        'bakery',           110, 180),
          ('Croissants 4',           'bakery',           150, 230),
          ('Salted crisps 6 pack',   'snacks',           180, 280),
          ('Dark chocolate bar',     'snacks',           110, 190),
          ('Orange juice 1L',        'beverages',        130, 210),
          ('Ground coffee 227g',     'beverages',        380, 560),
          ('Frozen peas 1kg',        'frozen',           110, 170),
          ('Fish fingers 12',        'frozen',           200, 320),
          ('Kitchen roll 2',         'household',        180, 280),
          ('Washing up liquid',      'cleaning',         120, 200),
          ('Shampoo 400ml',          'personal-care',    250, 400)
      ) as t(name, slug, min_price, max_price)
      order by random() limit 1;

      select id into v_category_id
        from public.categories
       where user_id = p_user_id and slug = v_item.slug;

      v_qty := case when random() < 0.75 then 1 else 2 end;
      v_unit_price := v_item.min_price
        + (random() * (v_item.max_price - v_item.min_price))::bigint;

      -- Nudge prices up over time so the price-history charts have a story.
      v_unit_price := (v_unit_price * (1 + (25 - v_week) * 0.004))::bigint;

      insert into public.transaction_items
        (user_id, transaction_id, category_id, name, quantity,
         unit_price_minor, total_price_minor, category_source, position)
      values
        (p_user_id, v_transaction_id, v_category_id, v_item.name, v_qty,
         v_unit_price, (v_unit_price * v_qty)::bigint, 'rule', v_line);

      v_items_created := v_items_created + 1;
    end loop;
  end loop;

  -- A monthly budget so the dashboard's budget strip has something to show.
  if not exists (
    select 1 from public.budgets
     where user_id = p_user_id
       and period_month = date_trunc('month', now())::date
       and category_id is null
  ) then
    insert into public.budgets (user_id, period_month, category_id, amount_minor)
    values (p_user_id, date_trunc('month', now())::date, null, 40000);
  end if;

  return format(
    'Created %s shopping trips and %s items. Delete them any time with: '
    || 'delete from transactions where notes = ''demo-data'';',
    v_trips_created, v_items_created
  );
end;
$$;
