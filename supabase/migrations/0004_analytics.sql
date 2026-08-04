-- Analytics.
--
-- Every widget aggregates from transaction_items joined to transactions, and
-- every function takes the same filter arguments. That single rule is what makes
-- the dashboard coherent: apply a store filter and the pie, the trend line and
-- the overview cards all move together, and the parts always sum to the whole.
--
-- These are SECURITY INVOKER (the default) on purpose — RLS still applies, so a
-- function can only ever see the caller's own rows.

-- ---------------------------------------------------------------------------
-- Period summary — the overview cards
-- ---------------------------------------------------------------------------

create or replace function public.fn_period_summary(
  p_from date,
  p_to date,
  p_store_ids uuid[] default null,
  p_category_ids uuid[] default null,
  p_min_minor bigint default null,
  p_max_minor bigint default null,
  p_search text default null
)
returns table (
  total_minor bigint,
  trip_count bigint,
  item_count bigint,
  avg_trip_minor bigint
)
language sql
stable
as $$
  with filtered as (
    select i.transaction_id, i.total_price_minor
    from public.transaction_items i
    join public.transactions t on t.id = i.transaction_id
    where t.purchase_date between p_from and p_to
      and (p_store_ids is null or t.store_id = any (p_store_ids))
      and (p_category_ids is null or i.category_id = any (p_category_ids))
      and (p_min_minor is null or i.total_price_minor >= p_min_minor)
      and (p_max_minor is null or i.total_price_minor <= p_max_minor)
      and (
        p_search is null or p_search = ''
        or i.search_tsv @@ websearch_to_tsquery('simple', p_search)
        or i.name ilike '%' || p_search || '%'
      )
  )
  select
    coalesce(sum(total_price_minor), 0)::bigint as total_minor,
    count(distinct transaction_id)::bigint as trip_count,
    count(*)::bigint as item_count,
    case
      when count(distinct transaction_id) = 0 then 0
      else (coalesce(sum(total_price_minor), 0) / count(distinct transaction_id))::bigint
    end as avg_trip_minor
  from filtered;
$$;

-- ---------------------------------------------------------------------------
-- Spend by category — pie/donut, and the "most expensive category" card
-- ---------------------------------------------------------------------------

create or replace function public.fn_spend_by_category(
  p_from date,
  p_to date,
  p_store_ids uuid[] default null,
  p_category_ids uuid[] default null,
  p_min_minor bigint default null,
  p_max_minor bigint default null,
  p_search text default null
)
returns table (
  category_id uuid,
  category_name text,
  category_slug text,
  chart_slot smallint,
  total_minor bigint,
  item_count bigint
)
language sql
stable
as $$
  select
    c.id,
    coalesce(c.name, 'Uncategorised'),
    coalesce(c.slug, 'uncategorised'),
    coalesce(c.chart_slot, 0::smallint),
    coalesce(sum(i.total_price_minor), 0)::bigint,
    count(*)::bigint
  from public.transaction_items i
  join public.transactions t on t.id = i.transaction_id
  left join public.categories c on c.id = i.category_id
  where t.purchase_date between p_from and p_to
    and (p_store_ids is null or t.store_id = any (p_store_ids))
    and (p_category_ids is null or i.category_id = any (p_category_ids))
    and (p_min_minor is null or i.total_price_minor >= p_min_minor)
    and (p_max_minor is null or i.total_price_minor <= p_max_minor)
    and (
      p_search is null or p_search = ''
      or i.search_tsv @@ websearch_to_tsquery('simple', p_search)
      or i.name ilike '%' || p_search || '%'
    )
  group by c.id, c.name, c.slug, c.chart_slot
  order by 5 desc;
$$;

-- ---------------------------------------------------------------------------
-- Monthly trend — line chart, gap-filled so a quiet month reads as zero
-- rather than vanishing from the axis
-- ---------------------------------------------------------------------------

create or replace function public.fn_monthly_trend(
  p_months integer default 12,
  p_store_ids uuid[] default null,
  p_category_ids uuid[] default null,
  p_search text default null
)
returns table (month date, total_minor bigint, trip_count bigint)
language sql
stable
as $$
  with span as (
    select generate_series(
      date_trunc('month', now())::date - ((p_months - 1) || ' months')::interval,
      date_trunc('month', now())::date,
      '1 month'::interval
    )::date as month
  ),
  totals as (
    select
      date_trunc('month', t.purchase_date)::date as month,
      sum(i.total_price_minor) as total_minor,
      count(distinct t.id) as trip_count
    from public.transaction_items i
    join public.transactions t on t.id = i.transaction_id
    where t.purchase_date >= (
        date_trunc('month', now())::date - ((p_months - 1) || ' months')::interval
      )::date
      and (p_store_ids is null or t.store_id = any (p_store_ids))
      and (p_category_ids is null or i.category_id = any (p_category_ids))
      and (
        p_search is null or p_search = ''
        or i.search_tsv @@ websearch_to_tsquery('simple', p_search)
        or i.name ilike '%' || p_search || '%'
      )
    group by 1
  )
  select
    span.month,
    coalesce(totals.total_minor, 0)::bigint,
    coalesce(totals.trip_count, 0)::bigint
  from span
  left join totals on totals.month = span.month
  order by span.month;
$$;

-- ---------------------------------------------------------------------------
-- Weekly spend — bar chart, also gap-filled
-- ---------------------------------------------------------------------------

create or replace function public.fn_weekly_spend(
  p_weeks integer default 12,
  p_week_starts_on smallint default 1,
  p_store_ids uuid[] default null,
  p_category_ids uuid[] default null,
  p_search text default null
)
returns table (week_start date, total_minor bigint, trip_count bigint)
language sql
stable
as $$
  with offset_days as (
    -- date_trunc('week') is Monday-based; shift by a day for Sunday starts.
    select case when p_week_starts_on = 0 then 1 else 0 end as d
  ),
  span as (
    select (
      date_trunc('week', now()::date + (select d from offset_days))::date
        - (select d from offset_days)
        - (g || ' weeks')::interval
    )::date as week_start
    from generate_series(p_weeks - 1, 0, -1) as g
  ),
  totals as (
    select
      (
        date_trunc('week', t.purchase_date + (select d from offset_days))::date
          - (select d from offset_days)
      )::date as week_start,
      sum(i.total_price_minor) as total_minor,
      count(distinct t.id) as trip_count
    from public.transaction_items i
    join public.transactions t on t.id = i.transaction_id
    where t.purchase_date >= (now()::date - (p_weeks * 7))
      and (p_store_ids is null or t.store_id = any (p_store_ids))
      and (p_category_ids is null or i.category_id = any (p_category_ids))
      and (
        p_search is null or p_search = ''
        or i.search_tsv @@ websearch_to_tsquery('simple', p_search)
        or i.name ilike '%' || p_search || '%'
      )
    group by 1
  )
  select
    span.week_start,
    coalesce(totals.total_minor, 0)::bigint,
    coalesce(totals.trip_count, 0)::bigint
  from span
  left join totals on totals.week_start = span.week_start
  order by span.week_start;
$$;

-- ---------------------------------------------------------------------------
-- Store comparison
-- ---------------------------------------------------------------------------

create or replace function public.fn_store_comparison(
  p_from date,
  p_to date,
  p_category_ids uuid[] default null,
  p_search text default null
)
returns table (
  store_id uuid,
  store_name text,
  total_minor bigint,
  trip_count bigint,
  avg_trip_minor bigint,
  item_count bigint
)
language sql
stable
as $$
  select
    s.id,
    coalesce(s.name, 'Unknown store'),
    coalesce(sum(i.total_price_minor), 0)::bigint,
    count(distinct t.id)::bigint,
    case
      when count(distinct t.id) = 0 then 0
      else (coalesce(sum(i.total_price_minor), 0) / count(distinct t.id))::bigint
    end,
    count(*)::bigint
  from public.transaction_items i
  join public.transactions t on t.id = i.transaction_id
  left join public.stores s on s.id = t.store_id
  where t.purchase_date between p_from and p_to
    and (p_category_ids is null or i.category_id = any (p_category_ids))
    and (
      p_search is null or p_search = ''
      or i.search_tsv @@ websearch_to_tsquery('simple', p_search)
      or i.name ilike '%' || p_search || '%'
    )
  group by s.id, s.name
  order by 3 desc;
$$;

-- ---------------------------------------------------------------------------
-- Top products — by quantity bought, or by money spent
-- ---------------------------------------------------------------------------

create or replace function public.fn_top_products(
  p_from date,
  p_to date,
  p_metric text default 'spend',
  p_limit integer default 10,
  p_store_ids uuid[] default null,
  p_category_ids uuid[] default null
)
returns table (
  product_key text,
  product_name text,
  category_name text,
  chart_slot smallint,
  total_minor bigint,
  total_quantity numeric,
  times_bought bigint
)
language sql
stable
as $$
  select
    coalesce(p.normalized_name, public.normalize_name(i.name), lower(i.name)),
    coalesce(p.canonical_name, i.name),
    coalesce(c.name, 'Uncategorised'),
    coalesce(c.chart_slot, 0::smallint),
    coalesce(sum(i.total_price_minor), 0)::bigint,
    coalesce(sum(i.quantity), 0)::numeric,
    count(*)::bigint
  from public.transaction_items i
  join public.transactions t on t.id = i.transaction_id
  left join public.products p on p.id = i.product_id
  left join public.categories c on c.id = i.category_id
  where t.purchase_date between p_from and p_to
    and (p_store_ids is null or t.store_id = any (p_store_ids))
    and (p_category_ids is null or i.category_id = any (p_category_ids))
  group by 1, 2, 3, 4
  order by
    case when p_metric = 'quantity' then coalesce(sum(i.quantity), 0) end desc nulls last,
    case when p_metric = 'frequency' then count(*) end desc nulls last,
    case when p_metric not in ('quantity', 'frequency')
      then coalesce(sum(i.total_price_minor), 0) end desc nulls last
  limit greatest(p_limit, 1);
$$;

-- ---------------------------------------------------------------------------
-- Price history for one product — "is bread getting more expensive?"
-- ---------------------------------------------------------------------------

create or replace function public.fn_price_history(p_normalized_name text)
returns table (
  purchase_date date,
  store_name text,
  unit_price_minor bigint,
  quantity numeric,
  total_price_minor bigint
)
language sql
stable
as $$
  select
    t.purchase_date,
    coalesce(s.name, 'Unknown store'),
    coalesce(
      i.unit_price_minor,
      case when i.quantity > 0
        then round(i.total_price_minor / i.quantity)::bigint
      end
    ),
    i.quantity,
    i.total_price_minor
  from public.transaction_items i
  join public.transactions t on t.id = i.transaction_id
  left join public.products p on p.id = i.product_id
  left join public.stores s on s.id = t.store_id
  where coalesce(p.normalized_name, public.normalize_name(i.name)) = p_normalized_name
  order by t.purchase_date;
$$;

-- ---------------------------------------------------------------------------
-- Budget progress for a month, including categories with no budget set
-- ---------------------------------------------------------------------------

create or replace function public.fn_budget_progress(p_month date)
returns table (
  budget_id uuid,
  category_id uuid,
  category_name text,
  category_slug text,
  chart_slot smallint,
  amount_minor bigint,
  spent_minor bigint,
  alert_threshold_pct smallint
)
language sql
stable
as $$
  with bounds as (
    select
      date_trunc('month', p_month)::date as month_start,
      (date_trunc('month', p_month) + interval '1 month - 1 day')::date as month_end
  ),
  spend_by_category as (
    select i.category_id, sum(i.total_price_minor) as spent
    from public.transaction_items i
    join public.transactions t on t.id = i.transaction_id
    cross join bounds b
    where t.purchase_date between b.month_start and b.month_end
    group by i.category_id
  ),
  spend_total as (
    select coalesce(sum(i.total_price_minor), 0) as spent
    from public.transaction_items i
    join public.transactions t on t.id = i.transaction_id
    cross join bounds b
    where t.purchase_date between b.month_start and b.month_end
  )
  select
    bg.id,
    bg.category_id,
    coalesce(c.name, 'Overall'),
    coalesce(c.slug, '__overall__'),
    coalesce(c.chart_slot, 0::smallint),
    bg.amount_minor,
    case
      when bg.category_id is null then (select spent from spend_total)::bigint
      else coalesce((select s.spent from spend_by_category s
                      where s.category_id = bg.category_id), 0)::bigint
    end,
    bg.alert_threshold_pct
  from public.budgets bg
  cross join bounds b
  left join public.categories c on c.id = bg.category_id
  where bg.period_month = b.month_start
  order by (bg.category_id is not null), coalesce(c.sort_order, -1);
$$;

-- ---------------------------------------------------------------------------
-- Month-over-month category movers, for the insights engine
-- ---------------------------------------------------------------------------

create or replace function public.fn_category_movers(p_month date)
returns table (
  category_id uuid,
  category_name text,
  current_minor bigint,
  previous_minor bigint,
  delta_minor bigint
)
language sql
stable
as $$
  with bounds as (
    select
      date_trunc('month', p_month)::date as cur_start,
      (date_trunc('month', p_month) + interval '1 month - 1 day')::date as cur_end,
      (date_trunc('month', p_month) - interval '1 month')::date as prev_start,
      (date_trunc('month', p_month) - interval '1 day')::date as prev_end
  ),
  cur as (
    select i.category_id, sum(i.total_price_minor) as amt
    from public.transaction_items i
    join public.transactions t on t.id = i.transaction_id
    cross join bounds b
    where t.purchase_date between b.cur_start and b.cur_end
    group by 1
  ),
  prev as (
    select i.category_id, sum(i.total_price_minor) as amt
    from public.transaction_items i
    join public.transactions t on t.id = i.transaction_id
    cross join bounds b
    where t.purchase_date between b.prev_start and b.prev_end
    group by 1
  )
  select
    c.id,
    coalesce(c.name, 'Uncategorised'),
    coalesce(cur.amt, 0)::bigint,
    coalesce(prev.amt, 0)::bigint,
    (coalesce(cur.amt, 0) - coalesce(prev.amt, 0))::bigint
  from cur
  full outer join prev on prev.category_id = cur.category_id
  left join public.categories c on c.id = coalesce(cur.category_id, prev.category_id)
  order by abs(coalesce(cur.amt, 0) - coalesce(prev.amt, 0)) desc;
$$;

-- ---------------------------------------------------------------------------
-- Repeat purchases whose unit price has moved — "bread is up 18%"
-- ---------------------------------------------------------------------------

create or replace function public.fn_price_movers(
  p_lookback_days integer default 120,
  p_min_purchases integer default 3,
  p_limit integer default 10
)
returns table (
  product_key text,
  product_name text,
  first_unit_price_minor bigint,
  last_unit_price_minor bigint,
  change_pct numeric,
  purchases bigint
)
language sql
stable
as $$
  with priced as (
    select
      coalesce(p.normalized_name, public.normalize_name(i.name)) as key,
      coalesce(p.canonical_name, i.name) as name,
      t.purchase_date,
      coalesce(
        i.unit_price_minor,
        case when i.quantity > 0 then round(i.total_price_minor / i.quantity)::bigint end
      ) as unit_price
    from public.transaction_items i
    join public.transactions t on t.id = i.transaction_id
    left join public.products p on p.id = i.product_id
    where t.purchase_date >= now()::date - p_lookback_days
  ),
  valid as (
    select * from priced where key is not null and unit_price is not null and unit_price > 0
  ),
  agg as (
    select
      key,
      min(name) as name,
      count(*) as purchases,
      (array_agg(unit_price order by purchase_date asc))[1] as first_price,
      (array_agg(unit_price order by purchase_date desc))[1] as last_price
    from valid
    group by key
    having count(*) >= p_min_purchases
  )
  select
    key,
    name,
    first_price::bigint,
    last_price::bigint,
    round(((last_price - first_price)::numeric / first_price) * 100, 1),
    purchases::bigint
  from agg
  where first_price <> last_price
  order by abs((last_price - first_price)::numeric / first_price) desc
  limit greatest(p_limit, 1);
$$;

-- ---------------------------------------------------------------------------
-- Spend by weekday, for the "you shop most on Saturdays" insight
-- ---------------------------------------------------------------------------

create or replace function public.fn_weekday_pattern(p_from date, p_to date)
returns table (weekday integer, total_minor bigint, trip_count bigint)
language sql
stable
as $$
  select
    extract(isodow from t.purchase_date)::integer,
    coalesce(sum(i.total_price_minor), 0)::bigint,
    count(distinct t.id)::bigint
  from public.transaction_items i
  join public.transactions t on t.id = i.transaction_id
  where t.purchase_date between p_from and p_to
  group by 1
  order by 1;
$$;
