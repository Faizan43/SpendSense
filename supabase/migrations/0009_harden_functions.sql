-- Hardening pass, prompted by the Supabase database linter.
--
-- Two problems it caught:
--
-- 1. seed_user_defaults(uuid) and seed_demo_data(uuid) are SECURITY DEFINER and
--    were reachable over /rest/v1/rpc by the anon role. Taking the user id as a
--    parameter meant anyone who knew a uuid could seed — or inject demo
--    transactions into — someone else's account. They now derive the caller
--    from auth.uid(), and the parameterised versions are for the signup trigger
--    only.
--
-- 2. Every function had a mutable search_path, which is the standard
--    privilege-escalation vector for SECURITY DEFINER functions.

alter function public.set_updated_at() set search_path = public;
alter function public.normalize_name(text) set search_path = public;
alter function public.fn_period_summary(date, date, uuid[], uuid[], bigint, bigint, text) set search_path = public;
alter function public.fn_spend_by_category(date, date, uuid[], uuid[], bigint, bigint, text) set search_path = public;
alter function public.fn_monthly_trend(integer, uuid[], uuid[], text) set search_path = public;
alter function public.fn_weekly_spend(integer, smallint, uuid[], uuid[], text) set search_path = public;
alter function public.fn_store_comparison(date, date, uuid[], text) set search_path = public;
alter function public.fn_top_products(date, date, text, integer, uuid[], uuid[]) set search_path = public;
alter function public.fn_price_history(text) set search_path = public;
alter function public.fn_budget_progress(date) set search_path = public;
alter function public.fn_category_movers(date) set search_path = public;
alter function public.fn_price_movers(integer, integer, integer) set search_path = public;
alter function public.fn_weekday_pattern(date, date) set search_path = public;
alter function public.fn_product_suggestions(integer) set search_path = public;

-- Trigger functions are never called directly; nothing outside Postgres needs
-- to reach them.
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.sync_transaction_total() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;

-- The parameterised seeders stay for the signup trigger, which runs as the
-- definer with no session, but are closed to API callers.
revoke all on function public.seed_user_defaults(uuid) from public, anon, authenticated;
revoke all on function public.seed_demo_data(uuid) from public, anon, authenticated;

-- What the app calls instead: no parameter to forge, and it fails closed for
-- anonymous requests.
create or replace function public.ensure_user_defaults()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  perform public.seed_user_defaults(v_user_id);
end;
$$;

create or replace function public.seed_demo_data()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  return public.seed_demo_data(v_user_id);
end;
$$;

revoke all on function public.ensure_user_defaults() from public, anon;
revoke all on function public.seed_demo_data() from public, anon;
grant execute on function public.ensure_user_defaults() to authenticated;
grant execute on function public.seed_demo_data() to authenticated;
