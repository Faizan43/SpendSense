"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { ChartCard } from "@/components/charts/chart-card";
import {
  ChartEmpty,
  ChartLegend,
  ChartTooltip,
} from "@/components/charts/chart-primitives";
import { useMoney } from "@/components/money-provider";
import { foldToChartSeries } from "@/lib/categories";
import type { CategorySpend } from "@/lib/types/database";

export function CategoryDonut({
  data,
  title = "Spending by category",
  description,
}: {
  data: CategorySpend[];
  title?: string;
  description?: string;
}) {
  const { format } = useMoney();

  const slices = foldToChartSeries(
    data
      .filter((row) => row.total_minor > 0)
      .map((row) => ({
        categoryId: row.category_id,
        categoryName: row.category_name,
        chartSlot: row.chart_slot,
        value: row.total_minor,
      })),
  );

  const total = slices.reduce((sum, s) => sum + s.value, 0);

  return (
    <ChartCard
      title={title}
      description={description}
      columns={[
        { label: "Category" },
        { label: "Spent", numeric: true },
        { label: "Share", numeric: true },
      ]}
      rows={data
        .filter((r) => r.total_minor > 0)
        .map((r) => [
          r.category_name,
          format(r.total_minor),
          total > 0 ? `${Math.round((r.total_minor / total) * 100)}%` : "—",
        ])}
    >
      {slices.length === 0 ? (
        <ChartEmpty message="Nothing spent in this period yet." />
      ) : (
        <div className="space-y-4">
          <div className="relative h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={slices}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="62%"
                  outerRadius="94%"
                  // A 2px surface gap between segments instead of a stroke
                  // border — the separation reads without adding a line.
                  paddingAngle={1.5}
                  stroke="var(--card)"
                  strokeWidth={2}
                  isAnimationActive={false}
                >
                  {slices.map((slice) => (
                    <Cell key={slice.key} fill={slice.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const slice = payload[0].payload as (typeof slices)[number];
                    return (
                      <ChartTooltip
                        rows={[
                          {
                            color: slice.color,
                            name: slice.name,
                            value: `${format(slice.value)} · ${
                              total > 0
                                ? Math.round((slice.value / total) * 100)
                                : 0
                            }%`,
                          },
                        ]}
                      />
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-muted-foreground text-xs">Total</span>
              <span className="text-xl font-semibold">{format(total)}</span>
            </div>
          </div>

          <ChartLegend
            items={slices.map((slice) => ({
              label: slice.name,
              color: slice.color,
              value: format(slice.value),
            }))}
          />
        </div>
      )}
    </ChartCard>
  );
}
