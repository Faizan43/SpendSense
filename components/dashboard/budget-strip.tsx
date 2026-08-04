"use client";

import Link from "next/link";

import { BudgetProgressBar } from "@/components/budgets/budget-progress-bar";
import { useMoney } from "@/components/money-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { daysElapsedInMonth, daysInMonth, daysRemainingInMonth } from "@/lib/date";
import { percentOf } from "@/lib/money";
import type { BudgetProgress } from "@/lib/types/database";

export function BudgetStrip({ budgets }: { budgets: BudgetProgress[] }) {
  const { format } = useMoney();

  const overall = budgets.find((b) => b.category_id === null);
  const categories = budgets
    .filter((b) => b.category_id !== null)
    .sort(
      (a, b) =>
        percentOf(b.spent_minor, b.amount_minor) -
        percentOf(a.spent_minor, a.amount_minor),
    )
    .slice(0, 3);

  if (!overall && categories.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-medium">No budget set for this month</p>
            <p className="text-muted-foreground text-sm">
              Set one and we&apos;ll warn you before you run out, not after.
            </p>
          </div>
          <Button render={<Link href="/budgets" />}>Set a budget</Button>
        </CardContent>
      </Card>
    );
  }

  // Two numbers that actually change behaviour: where this month lands if you
  // carry on at the current rate, and what's safe to spend each remaining day.
  const elapsed = daysElapsedInMonth();
  const remainingDays = daysRemainingInMonth();
  const projected = overall
    ? Math.round((overall.spent_minor / Math.max(1, elapsed)) * daysInMonth())
    : 0;
  const safePerDay = overall
    ? Math.max(
        0,
        Math.round(
          (overall.amount_minor - overall.spent_minor) /
            Math.max(1, remainingDays),
        ),
      )
    : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">This month&apos;s budget</CardTitle>
          <Button variant="ghost" size="sm" render={<Link href="/budgets" />}>
            Manage
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-5 lg:grid-cols-2">
        {overall ? (
          <BudgetProgressBar
            label="Overall"
            spentMinor={overall.spent_minor}
            amountMinor={overall.amount_minor}
            sublabel={
              <>
                On this pace you&apos;ll finish the month at{" "}
                <strong className="text-foreground tabular-nums">
                  {format(projected)}
                </strong>
                . That leaves{" "}
                <strong className="text-foreground tabular-nums">
                  {format(safePerDay)}
                </strong>{" "}
                a day for the {remainingDays} days left.
              </>
            }
          />
        ) : (
          <div className="text-muted-foreground text-sm">
            No overall budget for this month.{" "}
            <Link href="/budgets" className="underline">
              Set one
            </Link>
            .
          </div>
        )}

        {categories.length > 0 ? (
          <div className="space-y-3">
            {categories.map((budget) => (
              <BudgetProgressBar
                key={budget.budget_id}
                size="sm"
                label={budget.category_name}
                spentMinor={budget.spent_minor}
                amountMinor={budget.amount_minor}
              />
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
