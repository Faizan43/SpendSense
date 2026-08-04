"use client";

import { Minus, TrendingDown, TrendingUp } from "lucide-react";

import { CategoryChip } from "@/components/category-chip";
import { useMoney } from "@/components/money-provider";
import { Card, CardContent } from "@/components/ui/card";
import type { CategorySpend, PeriodSummary } from "@/lib/types/database";
import { cn } from "@/lib/utils";

function DeltaBadge({
  current,
  previous,
  invertColour = false,
}: {
  current: number;
  previous: number;
  /** For spending, up is bad — so the arrow and the colour disagree on purpose. */
  invertColour?: boolean;
}) {
  if (previous === 0) return null;

  const change = ((current - previous) / previous) * 100;
  if (!Number.isFinite(change) || Math.abs(change) < 1) {
    return (
      <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
        <Minus className="size-3" /> level with last period
      </span>
    );
  }

  const up = change > 0;
  const bad = invertColour ? up : !up;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs",
        bad ? "text-destructive" : "text-success",
      )}
    >
      {up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
      {Math.abs(Math.round(change))}% vs last period
    </span>
  );
}

function StatTile({
  label,
  value,
  footer,
}: {
  label: string;
  value: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="space-y-1">
        <p className="text-muted-foreground text-sm">{label}</p>
        {/* Proportional figures: tabular-nums makes a large standalone number
            look loose. */}
        <p className="text-2xl font-semibold tracking-tight">{value}</p>
        {footer ? <div>{footer}</div> : null}
      </CardContent>
    </Card>
  );
}

export function OverviewCards({
  monthTotalMinor,
  yearTotalMinor,
  period,
  previousPeriod,
  topCategory,
}: {
  monthTotalMinor: number;
  yearTotalMinor: number;
  period: PeriodSummary;
  previousPeriod: PeriodSummary;
  topCategory: CategorySpend | null;
}) {
  const { format } = useMoney();

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <StatTile label="This month" value={format(monthTotalMinor)} />
      <StatTile label="This year" value={format(yearTotalMinor)} />
      <StatTile
        label="Shopping trips"
        value={period.trip_count}
        footer={
          <DeltaBadge
            current={period.trip_count}
            previous={previousPeriod.trip_count}
          />
        }
      />
      <StatTile
        label="Average per trip"
        value={format(period.avg_trip_minor)}
        footer={
          <DeltaBadge
            current={period.avg_trip_minor}
            previous={previousPeriod.avg_trip_minor}
            invertColour
          />
        }
      />
      <StatTile
        label="Biggest category"
        value={
          topCategory ? format(topCategory.total_minor) : format(0)
        }
        footer={
          topCategory ? (
            <CategoryChip
              name={topCategory.category_name}
              chartSlot={topCategory.chart_slot}
              className="text-muted-foreground text-xs"
            />
          ) : (
            <span className="text-muted-foreground text-xs">
              Nothing recorded yet
            </span>
          )
        }
      />
    </div>
  );
}
