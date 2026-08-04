import type { Metadata } from "next";

import { CategoryBars } from "@/components/charts/category-bars";
import { CategoryDonut } from "@/components/charts/category-donut";
import { MonthlyTrend } from "@/components/charts/monthly-trend";
import { StoreBars } from "@/components/charts/store-bars";
import { WeeklyBars } from "@/components/charts/weekly-bars";
import { TopProducts } from "@/components/dashboard/top-products";
import { EmptyState } from "@/components/empty-state";
import { ExportMenu } from "@/components/export-menu";
import { FilterBar } from "@/components/filters/filter-bar";
import { PageHeader } from "@/components/layout/page-header";
import { PeriodComparison } from "@/components/analytics/period-comparison";
import {
  getMonthlyTrend,
  getPeriodSummary,
  getPreviousPeriodSummary,
  getSpendByCategory,
  getStoreComparison,
  getTopProducts,
  getWeeklySpend,
} from "@/lib/analytics/queries";
import { parseFilters, type SearchParams } from "@/lib/filters";
import { getCategories, getProfile, getStores } from "@/lib/profile";

export const metadata: Metadata = { title: "Analytics" };

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const filters = parseFilters(params, "last-3-months");
  const profile = await getProfile();

  const [
    summary,
    previous,
    byCategory,
    trend,
    weekly,
    stores,
    topBySpend,
    topByQuantity,
    categoryOptions,
    storeOptions,
  ] = await Promise.all([
    getPeriodSummary(filters),
    getPreviousPeriodSummary(filters),
    getSpendByCategory(filters),
    getMonthlyTrend(filters, 12),
    getWeeklySpend(filters, 16, profile?.week_starts_on ?? 1),
    getStoreComparison(filters),
    getTopProducts(filters, "spend", 10),
    getTopProducts(filters, "quantity", 10),
    getCategories(),
    getStores(),
  ]);

  return (
    <>
      <PageHeader
        title="Analytics"
        description="The same numbers as the dashboard, with more room to look at them."
        actions={<ExportMenu params={params} />}
      />

      <FilterBar
        stores={storeOptions.map((s) => ({ id: s.id, label: s.name }))}
        categories={categoryOptions.map((c) => ({ id: c.id, label: c.name }))}
      />

      {summary.total_minor === 0 ? (
        <EmptyState
          icon="chart-column"
          title="Nothing in this period"
          description="Widen the date range or clear a filter to see something here."
        />
      ) : (
        <>
          <PeriodComparison current={summary} previous={previous} />

          <div className="grid gap-4 lg:grid-cols-2">
            <CategoryDonut
              data={byCategory}
              description="The leading categories; the tail is folded into Other."
            />
            <CategoryBars
              data={byCategory}
              description="Every category, largest first."
            />
          </div>

          <MonthlyTrend
            data={trend}
            description="Twelve months, so seasonal swings are visible rather than surprising."
          />

          <div className="grid gap-4 lg:grid-cols-2">
            <WeeklyBars data={weekly} description="The last sixteen weeks." />
            <StoreBars
              data={stores}
              limit={12}
              description="Total spent per store, with the average basket in the tooltip."
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <TopProducts
              title="Top 10 by spend"
              products={topBySpend}
              metric="spend"
            />
            <TopProducts
              title="Top 10 by quantity"
              products={topByQuantity}
              metric="quantity"
            />
          </div>
        </>
      )}
    </>
  );
}
