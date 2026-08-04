import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

import { BudgetManager } from "@/components/budgets/budget-manager";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { getBudgetProgress } from "@/lib/analytics/queries";
import { formatMonth, monthKey, shiftMonth } from "@/lib/date";
import type { SearchParams } from "@/lib/filters";
import { getCategories, getProfile } from "@/lib/profile";

export const metadata: Metadata = { title: "Budgets" };

export default async function BudgetsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const raw = typeof params.month === "string" ? params.month : "";
  const month = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? monthKey(raw) : monthKey();

  const [budgets, categories, profile] = await Promise.all([
    getBudgetProgress(month),
    getCategories(),
    getProfile(),
  ]);

  return (
    <>
      <PageHeader
        title="Budgets"
        description="A limit you set, and an early warning long before you hit it."
        actions={
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              aria-label="Previous month"
              render={<Link href={`/budgets?month=${shiftMonth(month, -1)}`} />}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="min-w-36 text-center text-sm font-medium">
              {formatMonth(month)}
            </span>
            <Button
              variant="outline"
              size="icon"
              aria-label="Next month"
              render={<Link href={`/budgets?month=${shiftMonth(month, 1)}`} />}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        }
      />

      <BudgetManager
        month={month}
        budgets={budgets}
        categories={categories}
        defaultThreshold={profile?.default_alert_threshold_pct ?? 80}
      />
    </>
  );
}
