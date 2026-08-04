"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
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
import { formatDate, formatDateShort } from "@/lib/date";
import { toMajor } from "@/lib/money";
import type { PricePoint } from "@/lib/types/database";

/**
 * Unit price over time for one product. This is the chart that answers "is
 * bread actually getting more expensive, or does it just feel like it?"
 */
export function PriceHistory({
  data,
  productName,
}: {
  data: PricePoint[];
  productName: string;
}) {
  const { format } = useMoney();

  const points = data
    .filter((row) => row.unit_price_minor != null)
    .map((row) => ({
      label: formatDateShort(row.purchase_date),
      date: row.purchase_date,
      store: row.store_name,
      value: toMajor(row.unit_price_minor as number),
      minor: row.unit_price_minor as number,
    }));

  const first = points[0]?.minor;
  const last = points[points.length - 1]?.minor;
  const change =
    first && last && first !== last ? ((last - first) / first) * 100 : null;

  return (
    <ChartCard
      title="Unit price over time"
      description={
        change === null
          ? `What you've paid per unit for ${productName}.`
          : `${change > 0 ? "Up" : "Down"} ${Math.abs(Math.round(change))}% since the first time you bought it.`
      }
      columns={[
        { label: "Date" },
        { label: "Store" },
        { label: "Unit price", numeric: true },
      ]}
      rows={points.map((p) => [formatDate(p.date), p.store, format(p.minor)])}
    >
      {points.length < 2 ? (
        <ChartEmpty message="Buy this a couple more times and a price trend will appear here." />
      ) : (
        <div className="h-56">
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
                domain={["auto", "auto"]}
                tickFormatter={(value: number) => format(Math.round(value * 100))}
              />
              <Tooltip
                cursor={{ stroke: "var(--chart-axis)", strokeWidth: 1 }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const point = payload[0].payload as (typeof points)[number];
                  return (
                    <ChartTooltip
                      label={formatDate(point.date)}
                      rows={[
                        {
                          color: "var(--chart-1)",
                          name: "Unit price",
                          value: format(point.minor),
                        },
                        { name: "Store", value: point.store },
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
                dot={{ r: 3, strokeWidth: 2, stroke: "var(--card)" }}
                activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--card)" }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}
