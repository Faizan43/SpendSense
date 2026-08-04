"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
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
import { formatDateShort } from "@/lib/date";
import { toMajor } from "@/lib/money";
import type { WeeklyPoint } from "@/lib/types/database";

export function WeeklyBars({
  data,
  title = "Weekly spending",
  description,
}: {
  data: WeeklyPoint[];
  title?: string;
  description?: string;
}) {
  const { format, formatCompact } = useMoney();

  const points = data.map((row) => ({
    label: formatDateShort(row.week_start),
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
        { label: "Week beginning" },
        { label: "Spent", numeric: true },
        { label: "Trips", numeric: true },
      ]}
      rows={points.map((p) => [p.label, format(p.minor), p.trips])}
    >
      {!hasSpend ? (
        <ChartEmpty message="No shopping recorded in these weeks." />
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={points}
              margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
              barCategoryGap="22%"
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
              <Tooltip
                cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const point = payload[0].payload as (typeof points)[number];
                  return (
                    <ChartTooltip
                      label={`Week of ${label}`}
                      rows={[
                        {
                          color: "var(--chart-1)",
                          name: "Spent",
                          value: format(point.minor),
                        },
                        { name: "Shopping trips", value: String(point.trips) },
                      ]}
                    />
                  );
                }}
              />
              <Bar
                dataKey="value"
                fill="var(--chart-1)"
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}
