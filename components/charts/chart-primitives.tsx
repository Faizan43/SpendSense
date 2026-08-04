"use client";

import type { ReactNode } from "react";

/** Shared chrome so every chart in the app reads as one system. */
export const AXIS_PROPS = {
  stroke: "var(--chart-axis)",
  tick: { fill: "var(--muted-foreground)", fontSize: 11 },
  tickLine: false,
  axisLine: false,
} as const;

export const GRID_PROPS = {
  stroke: "var(--chart-grid)",
  strokeWidth: 1,
  vertical: false,
} as const;

export function ChartTooltip({
  label,
  rows,
}: {
  label?: ReactNode;
  rows: Array<{ color?: string; name: string; value: string }>;
}) {
  return (
    <div className="bg-popover text-popover-foreground ring-foreground/10 rounded-lg px-2.5 py-2 text-xs shadow-md ring-1">
      {label ? <p className="mb-1 font-medium">{label}</p> : null}
      <ul className="space-y-0.5">
        {rows.map((row) => (
          <li key={row.name} className="flex items-center gap-2">
            {row.color ? (
              <span
                aria-hidden="true"
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: row.color }}
              />
            ) : null}
            <span className="text-muted-foreground">{row.name}</span>
            <span className="ml-auto font-medium tabular-nums">{row.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ChartLegend({
  items,
}: {
  items: Array<{ label: string; color: string; value?: string }>;
}) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-muted-foreground truncate">{item.label}</span>
          {item.value ? (
            <span className="font-medium tabular-nums">{item.value}</span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function ChartEmpty({ message }: { message: string }) {
  return (
    <div className="text-muted-foreground flex h-56 items-center justify-center rounded-lg border border-dashed text-sm">
      {message}
    </div>
  );
}
