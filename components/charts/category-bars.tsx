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
import type { CategorySpend } from "@/lib/types/database";

/**
 * The donut folds the tail into "Other" because part-to-whole stops reading
 * past about six segments. Bars don't have that limit, so this is where every
 * category gets shown — one measure, one colour, sorted by size.
 */
export function CategoryBars({
  data,
  title = "Every category",
  description,
}: {
  data: CategorySpend[];
  title?: string;
  description?: string;
}) {
  const { format, formatCompact } = useMoney();

  const points = data
    .filter((row) => row.total_minor > 0)
    .map((row) => ({
      label: row.category_name,
      value: toMajor(row.total_minor),
      minor: row.total_minor,
      items: row.item_count,
    }));

  return (
    <ChartCard
      title={title}
      description={description}
      columns={[
        { label: "Category" },
        { label: "Items", numeric: true },
        { label: "Spent", numeric: true },
      ]}
      rows={points.map((p) => [p.label, p.items, format(p.minor)])}
    >
      {points.length === 0 ? (
        <ChartEmpty message="Nothing spent in this period." />
      ) : (
        <div style={{ height: Math.max(200, points.length * 34 + 28) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={points}
              layout="vertical"
              margin={{ top: 4, right: 16, bottom: 4, left: 0 }}
              barCategoryGap="20%"
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
              <YAxis type="category" dataKey="label" width={140} {...AXIS_PROPS} />
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
                          name: "Spent",
                          value: format(point.minor),
                        },
                        { name: "Items", value: String(point.items) },
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
