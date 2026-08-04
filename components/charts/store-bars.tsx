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
} from "@/components/charts/chart-primitives";
import { useMoney } from "@/components/money-provider";
import { toMajor } from "@/lib/money";
import type { StoreSpend } from "@/lib/types/database";

/**
 * One measure, one colour. Shading each bar by its own value would double-encode
 * length as hue and tell the reader nothing the bar doesn't already say.
 */
export function StoreBars({
  data,
  title = "Where you shop",
  description,
  limit = 8,
}: {
  data: StoreSpend[];
  title?: string;
  description?: string;
  limit?: number;
}) {
  const { format, formatCompact } = useMoney();

  const points = data
    .filter((row) => row.total_minor > 0)
    .slice(0, limit)
    .map((row) => ({
      label: row.store_name,
      value: toMajor(row.total_minor),
      minor: row.total_minor,
      trips: row.trip_count,
      avg: row.avg_trip_minor,
    }));

  return (
    <ChartCard
      title={title}
      description={description}
      columns={[
        { label: "Store" },
        { label: "Total", numeric: true },
        { label: "Trips", numeric: true },
        { label: "Average basket", numeric: true },
      ]}
      rows={data
        .filter((r) => r.total_minor > 0)
        .map((r) => [
          r.store_name,
          format(r.total_minor),
          r.trip_count,
          format(r.avg_trip_minor),
        ])}
    >
      {points.length === 0 ? (
        <ChartEmpty message="No shops recorded in this period." />
      ) : (
        <div style={{ height: Math.max(180, points.length * 38 + 24) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={points}
              layout="vertical"
              margin={{ top: 4, right: 16, bottom: 4, left: 0 }}
              barCategoryGap="22%"
            >
              <CartesianGrid
                stroke="var(--chart-grid)"
                strokeWidth={1}
                horizontal={false}
              />
              <XAxis
                type="number"
                {...AXIS_PROPS}
                tickFormatter={(value: number) =>
                  formatCompact(Math.round(value * 100))
                }
              />
              <YAxis
                type="category"
                dataKey="label"
                width={120}
                {...AXIS_PROPS}
              />
              <Tooltip
                cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const point = payload[0].payload as (typeof points)[number];
                  return (
                    <ChartTooltip
                      label={point.label}
                      rows={[
                        {
                          color: "var(--chart-1)",
                          name: "Total spent",
                          value: format(point.minor),
                        },
                        { name: "Trips", value: String(point.trips) },
                        { name: "Average basket", value: format(point.avg) },
                      ]}
                    />
                  );
                }}
              />
              <Bar
                dataKey="value"
                fill="var(--chart-1)"
                radius={[0, 4, 4, 0]}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}
