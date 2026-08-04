-- Autocomplete for the item entry grid: what you buy, what you filed it under,
-- and what you last paid. Typing "mil" and getting the category and price
-- filled in is most of what makes manual entry bearable.

create or replace function public.fn_product_suggestions(p_limit integer default 500)
returns table (
  name text,
  category_id uuid,
  unit text,
  last_unit_price_minor bigint,
  times_bought bigint,
  last_bought date
)
language sql
stable
as $$
  with latest as (
    select distinct on (coalesce(p.normalized_name, public.normalize_name(i.name)))
      coalesce(p.canonical_name, i.name) as name,
      i.category_id,
      i.unit,
      coalesce(
        i.unit_price_minor,
        case when i.quantity > 0 then round(i.total_price_minor / i.quantity)::bigint end
      ) as last_unit_price_minor,
      t.purchase_date,
      coalesce(p.normalized_name, public.normalize_name(i.name)) as key
    from public.transaction_items i
    join public.transactions t on t.id = i.transaction_id
    left join public.products p on p.id = i.product_id
    order by
      coalesce(p.normalized_name, public.normalize_name(i.name)),
      t.purchase_date desc,
      i.created_at desc
  ),
  counts as (
    select
      coalesce(p.normalized_name, public.normalize_name(i.name)) as key,
      count(*) as times_bought
    from public.transaction_items i
    left join public.products p on p.id = i.product_id
    group by 1
  )
  select
    latest.name,
    latest.category_id,
    latest.unit,
    latest.last_unit_price_minor,
    coalesce(counts.times_bought, 0)::bigint,
    latest.purchase_date
  from latest
  left join counts on counts.key = latest.key
  order by coalesce(counts.times_bought, 0) desc, latest.purchase_date desc
  limit greatest(p_limit, 1);
$$;
