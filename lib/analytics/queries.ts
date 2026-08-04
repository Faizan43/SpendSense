import "server-only";

import { currentMonthRange, currentYearRange, monthKey, previousRange } from "@/lib/date";
import { rpcFilterArgs, type SpendFilters } from "@/lib/filters";
import { createClient } from "@/lib/supabase/server";
import type {
  BudgetProgress,
  CategorySpend,
  MonthlyPoint,
  PeriodSummary,
  StoreSpend,
  TopProduct,
  WeeklyPoint,
} from "@/lib/types/database";

const EMPTY_SUMMARY: PeriodSummary = {
  total_minor: 0,
  trip_count: 0,
  item_count: 0,
  avg_trip_minor: 0,
};

export async function getPeriodSummary(
  filters: SpendFilters,
): Promise<PeriodSummary> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("fn_period_summary", rpcFilterArgs(filters));
  return data?.[0] ?? EMPTY_SUMMARY;
}

/** The same window, shifted back by its own length, for a like-for-like delta. */
export async function getPreviousPeriodSummary(
  filters: SpendFilters,
): Promise<PeriodSummary> {
  return getPeriodSummary({ ...filters, range: previousRange(filters.range) });
}

export async function getMonthAndYearTotals() {
  const supabase = await createClient();
  const month = currentMonthRange();
  const year = currentYearRange();

  const [monthResult, yearResult] = await Promise.all([
    supabase.rpc("fn_period_summary", { p_from: month.from, p_to: month.to }),
    supabase.rpc("fn_period_summary", { p_from: year.from, p_to: year.to }),
  ]);

  return {
    month: monthResult.data?.[0] ?? EMPTY_SUMMARY,
    year: yearResult.data?.[0] ?? EMPTY_SUMMARY,
  };
}

export async function getSpendByCategory(
  filters: SpendFilters,
): Promise<CategorySpend[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc(
    "fn_spend_by_category",
    rpcFilterArgs(filters),
  );
  return data ?? [];
}

export async function getMonthlyTrend(
  filters: SpendFilters,
  months = 12,
): Promise<MonthlyPoint[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("fn_monthly_trend", {
    p_months: months,
    p_store_ids: filters.storeIds.length ? filters.storeIds : null,
    p_category_ids: filters.categoryIds.length ? filters.categoryIds : null,
    p_search: filters.search || null,
  });
  return data ?? [];
}

export async function getWeeklySpend(
  filters: SpendFilters,
  weeks = 12,
  weekStartsOn = 1,
): Promise<WeeklyPoint[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("fn_weekly_spend", {
    p_weeks: weeks,
    p_week_starts_on: weekStartsOn,
    p_store_ids: filters.storeIds.length ? filters.storeIds : null,
    p_category_ids: filters.categoryIds.length ? filters.categoryIds : null,
    p_search: filters.search || null,
  });
  return data ?? [];
}

export async function getStoreComparison(
  filters: SpendFilters,
): Promise<StoreSpend[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("fn_store_comparison", {
    p_from: filters.range.from,
    p_to: filters.range.to,
    p_category_ids: filters.categoryIds.length ? filters.categoryIds : null,
    p_search: filters.search || null,
  });
  return data ?? [];
}

export async function getTopProducts(
  filters: SpendFilters,
  metric: "spend" | "quantity" | "frequency" = "spend",
  limit = 10,
): Promise<TopProduct[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("fn_top_products", {
    p_from: filters.range.from,
    p_to: filters.range.to,
    p_metric: metric,
    p_limit: limit,
    p_store_ids: filters.storeIds.length ? filters.storeIds : null,
    p_category_ids: filters.categoryIds.length ? filters.categoryIds : null,
  });
  return data ?? [];
}

export async function getBudgetProgress(
  month: string = monthKey(),
): Promise<BudgetProgress[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("fn_budget_progress", { p_month: month });
  return data ?? [];
}

export async function getRecentTrips(limit = 6) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("transactions")
    .select("id, purchase_date, total_minor, source, stores(name)")
    .order("purchase_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row) => {
    const storeRaw = row.stores;
    const store = Array.isArray(storeRaw) ? storeRaw[0] : storeRaw;
    return {
      id: row.id,
      purchaseDate: row.purchase_date,
      totalMinor: row.total_minor,
      storeName: store?.name ?? null,
      source: row.source,
    };
  });
}
