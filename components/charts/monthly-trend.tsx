"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartCard } from "@/components/charts/chart-card";
import {
  AXIS_PROPS,
  ChartEmpty,
  ChartTooltip,
  GRID_PROPS,
} from "@/components/charts/chart-primitives";
import { useMoney } from "@/components/money-provider";
import { formatMonthShort } from "@/lib/date";
import { toMajor } from "@/lib/money";
import type { MonthlyPoint } from "@/lib/types/database";

export function MonthlyTrend({
  data,
  budgetMinor,
  title = "Monthly spending",
  description,
}: {
  data: MonthlyPoint[];
  budgetMinor?: number | null;
  title?: string;
  description?: string;
}) {
  const { format, formatCompact } = useMoney();

  const points = data.map((row) => ({
    month: row.month,
    label: formatMonthShort(row.month),
    value: toMajor(row.total_minor),
    minor: row.total_minor,
    trips: row.trip_count,
  }));

  const hasSpend = points.some((p) => p.minor > 0);

  return (
    <ChartCard
      title={title}
      description={description}
      columns={[
        { label: "Month" },
        { label: "Spent", numeric: true },
        { label: "Trips", numeric: true },
      ]}
      rows={points.map((p) => [p.label, format(p.minor), p.trips])}
    >
      {!hasSpend ? (
        <ChartEmpty message="Not enough history yet to draw a trend." />
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={points}
              margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
            >
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="label" {...AXIS_PROPS} interval="preserveStartEnd" />
              <YAxis
                {...AXIS_PROPS}
                width={56}
                tickFormatter={(value: number) =>
                  formatCompact(Math.round(value * 100))
                }
              />
              {budgetMinor ? (
                <ReferenceLine
                  y={toMajor(budgetMinor)}
                  stroke="var(--chart-other)"
                  strokeWidth={1}
                  label={{
                    value: "Budget",
                    position: "insideTopRight",
                    fill: "var(--muted-foreground)",
                    fontSize: 11,
                  }}
                />
              ) : null}
              <Tooltip
                cursor={{ stroke: "var(--chart-axis)", strokeWidth: 1 }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const point = payload[0].payload as (typeof points)[number];
                  return (
                    <ChartTooltip
                      label={label as string}
                      rows={[
                        {
                          color: "var(--chart-1)",
                          name: "Spent",
                          value: format(point.minor),
                        },
                        {
                          name: "Shopping trips",
                          value: String(point.trips),
                        },
                      ]}
                    />
                  );
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="var(--chart-1)"
                strokeWidth={2}
                dot={false}
                activeDot={{
                  r: 4,
                  strokeWidth: 2,
                  stroke: "var(--card)",
                }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}
