import { Plus, Upload } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

import { CategoryDonut } from "@/components/charts/category-donut";
import { MonthlyTrend } from "@/components/charts/monthly-trend";
import { StoreBars } from "@/components/charts/store-bars";
import { WeeklyBars } from "@/components/charts/weekly-bars";
import { BudgetStrip } from "@/components/dashboard/budget-strip";
import { OverviewCards } from "@/components/dashboard/overview-cards";
import { RecentTrips } from "@/components/dashboard/recent-trips";
import { TopProducts } from "@/components/dashboard/top-products";
import { EmptyState } from "@/components/empty-state";
import { FilterBar } from "@/components/filters/filter-bar";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  getBudgetProgress,
  getMonthAndYearTotals,
  getMonthlyTrend,
  getPeriodSummary,
  getPreviousPeriodSummary,
  getRecentTrips,
  getSpendByCategory,
  getStoreComparison,
  getTopProducts,
  getWeeklySpend,
} from "@/lib/analytics/queries";
import { parseFilters, type SearchParams } from "@/lib/filters";
import { getCategories, getProfile, getStores } from "@/lib/profile";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const filters = parseFilters(params, "this-month");

  const profile = await getProfile();

  const [
    totals,
    period,
    previousPeriod,
    byCategory,
    trend,
    weekly,
    stores,
    topBySpend,
    topByQuantity,
    budgets,
    recentTrips,
    categoryOptions,
    storeOptions,
  ] = await Promise.all([
    getMonthAndYearTotals(),
    getPeriodSummary(filters),
    getPreviousPeriodSummary(filters),
    getSpendByCategory(filters),
    getMonthlyTrend(filters, 12),
    getWeeklySpend(filters, 12, profile?.week_starts_on ?? 1),
    getStoreComparison(filters),
    getTopProducts(filters, "spend", 10),
    getTopProducts(filters, "quantity", 10),
    getBudgetProgress(),
    getRecentTrips(6),
    getCategories(),
    getStores(),
  ]);

  const overallBudget = budgets.find((b) => b.category_id === null);
  const hasAnySpend = totals.year.total_minor > 0 || period.total_minor > 0;

  if (!hasAnySpend) {
    return (
      <>
        <PageHeader
          title={
            profile?.display_name
              ? `Hello, ${profile.display_name}`
              : "Dashboard"
          }
          description="Once you've added a shop, this fills up with where your money actually went."
        />
        <EmptyState
          icon="chart-pie"
          title="Nothing to chart yet"
          description="Upload a receipt and every line is read out and categorised for you — or add a shop by hand if you'd rather."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button render={<Link href="/receipts/upload" />}>
                <Upload className="size-4" /> Upload a receipt
              </Button>
              <Button variant="outline" render={<Link href="/expenses/new" />}>
                <Plus className="size-4" /> Add a shop
              </Button>
            </div>
          }
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={
          profile?.display_name ? `Hello, ${profile.display_name}` : "Dashboard"
        }
        description="Where your money is going."
        actions={
          <>
            <Button variant="outline" render={<Link href="/receipts/upload" />}>
              <Upload className="size-4" /> Upload receipt
            </Button>
            <Button render={<Link href="/expenses/new" />}>
              <Plus className="size-4" /> Add a shop
            </Button>
          </>
        }
      />

      {/* One filter row, above everything it scopes — every widget below
          re-renders against the same slice. */}
      <FilterBar
        stores={storeOptions.map((s) => ({ id: s.id, label: s.name }))}
        categories={categoryOptions.map((c) => ({ id: c.id, label: c.name }))}
      />

      <OverviewCards
        monthTotalMinor={totals.month.total_minor}
        yearTotalMinor={totals.year.total_minor}
        period={period}
        previousPeriod={previousPeriod}
        topCategory={byCategory[0] ?? null}
      />

      <BudgetStrip budgets={budgets} />

      <div className="grid gap-4 lg:grid-cols-2">
        <CategoryDonut
          data={byCategory}
          description="Leading categories for the selected period; the rest are folded into Other."
        />
        <MonthlyTrend
          data={trend}
          budgetMinor={overallBudget?.amount_minor ?? null}
          description="The last twelve months, against your current monthly budget."
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <WeeklyBars data={weekly} description="The last twelve weeks." />
        <StoreBars
          data={stores}
          description="Total spent, with the average basket in the tooltip."
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <TopProducts
          title="Most expensive products"
          description="What's taking the biggest bite out of the budget."
          products={topBySpend}
          metric="spend"
        />
        <TopProducts
          title="Most bought products"
          description="Your staples, by how often they end up in the trolley."
          products={topByQuantity}
          metric="quantity"
        />
      </div>

      <RecentTrips trips={recentTrips} />
    </>
  );
}
