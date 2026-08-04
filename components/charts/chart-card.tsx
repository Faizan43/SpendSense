"use client";

import { Table2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type TableColumn = { label: string; numeric?: boolean };

/**
 * Every chart ships with a table view of the same numbers.
 *
 * This is the accessibility backstop the whole colour scheme leans on: when
 * hue can't be told apart — colour-vision deficiency, a monochrome print, a
 * forced-colours mode — the values are still right there, and a tooltip is
 * never the only way to read a figure.
 */
export function ChartCard({
  title,
  description,
  action,
  columns,
  rows,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  columns?: TableColumn[];
  rows?: Array<Array<string | number>>;
  children: React.ReactNode;
  className?: string;
}) {
  const [showTable, setShowTable] = useState(false);
  const hasTable = Boolean(columns?.length && rows?.length);

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="text-base">{title}</CardTitle>
            {description ? (
              <CardDescription>{description}</CardDescription>
            ) : null}
          </div>
          <div className="flex items-center gap-1">
            {action}
            {hasTable ? (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-pressed={showTable}
                aria-label={showTable ? "Show the chart" : "Show the numbers"}
                title={showTable ? "Show the chart" : "Show the numbers"}
                onClick={() => setShowTable((v) => !v)}
              >
                <Table2 className="size-3.5" />
              </Button>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {showTable && hasTable ? (
          <div className="max-h-72 overflow-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground sticky top-0">
                <tr>
                  {columns!.map((column) => (
                    <th
                      key={column.label}
                      className={cn(
                        "px-3 py-2 font-medium",
                        column.numeric ? "text-right" : "text-left",
                      )}
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows!.map((row, i) => (
                  <tr key={i} className="border-t">
                    {row.map((cell, j) => (
                      <td
                        key={j}
                        className={cn(
                          "px-3 py-1.5",
                          columns![j]?.numeric &&
                            "text-right font-medium tabular-nums",
                        )}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
