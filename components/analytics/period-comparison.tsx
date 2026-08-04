"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import { useMoney } from "@/components/money-provider";
import { Card, CardContent } from "@/components/ui/card";
import type { PeriodSummary } from "@/lib/types/database";
import { cn } from "@/lib/utils";

function Comparison({
  label,
  current,
  previous,
  format,
  higherIsWorse = false,
}: {
  label: string;
  current: number;
  previous: number;
  format: (value: number) => string;
  higherIsWorse?: boolean;
}) {
  const delta = current - previous;
  const pct = previous === 0 ? null : (delta / previous) * 100;
  const flat = pct === null || Math.abs(pct) < 1;
  const up = delta > 0;
  const bad = higherIsWorse ? up : !up;

  return (
    <div className="space-y-1">
      <p className="text-muted-foreground text-sm">{label}</p>
      <p className="text-2xl font-semibold tracking-tight">{format(current)}</p>
      <p
        className={cn(
          "flex items-center gap-1 text-xs",
          flat ? "text-muted-foreground" : bad ? "text-destructive" : "text-success",
        )}
      >
        {flat ? (
          <Minus className="size-3" />
        ) : up ? (
          <ArrowUpRight className="size-3" />
        ) : (
          <ArrowDownRight className="size-3" />
        )}
        {flat
          ? "About the same as the period before"
          : `${Math.abs(Math.round(pct!))}% vs ${format(previous)} before`}
      </p>
    </div>
  );
}

/**
 * The window immediately before the selected one, same length — so "last three
 * months" is compared against the three months before that, not against a
 * calendar quarter that happens to be a different size.
 */
export function PeriodComparison({
  current,
  previous,
}: {
  current: PeriodSummary;
  previous: PeriodSummary;
}) {
  const { format } = useMoney();
  const count = (value: number) => value.toLocaleString();

  return (
    <Card>
      <CardContent className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Comparison
          label="Total spent"
          current={current.total_minor}
          previous={previous.total_minor}
          format={format}
          higherIsWorse
        />
        <Comparison
          label="Shopping trips"
          current={current.trip_count}
          previous={previous.trip_count}
          format={count}
        />
        <Comparison
          label="Average per trip"
          current={current.avg_trip_minor}
          previous={previous.avg_trip_minor}
          format={format}
          higherIsWorse
        />
        <Comparison
          label="Items bought"
          current={current.item_count}
          previous={previous.item_count}
          format={count}
        />
      </CardContent>
    </Card>
  );
}
