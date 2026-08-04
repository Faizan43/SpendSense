"use client";

import Link from "next/link";

import { CategoryChip } from "@/components/category-chip";
import { useMoney } from "@/components/money-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TopProduct } from "@/lib/types/database";

/**
 * A ranked list, not a bar chart: ten product names need reading, and a
 * horizontal bar chart with ten labels is mostly axis.
 */
export function TopProducts({
  title,
  description,
  products,
  metric,
}: {
  title: string;
  description?: string;
  products: TopProduct[];
  metric: "spend" | "quantity";
}) {
  const { format } = useMoney();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description ? (
          <p className="text-muted-foreground text-sm">{description}</p>
        ) : null}
      </CardHeader>
      <CardContent>
        {products.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            Nothing recorded in this period yet.
          </p>
        ) : (
          <ol className="space-y-1">
            {products.map((product, index) => (
              <li key={product.product_key}>
                <Link
                  href={`/products?q=${encodeURIComponent(product.product_name)}`}
                  className="hover:bg-muted/60 flex items-center gap-3 rounded-lg px-2 py-1.5"
                >
                  <span className="text-muted-foreground w-4 text-right text-xs tabular-nums">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {product.product_name}
                    </span>
                    <CategoryChip
                      name={product.category_name}
                      chartSlot={product.chart_slot}
                      className="text-muted-foreground text-xs"
                    />
                  </span>
                  <span className="shrink-0 text-right text-sm font-medium tabular-nums">
                    {metric === "spend"
                      ? format(product.total_minor)
                      : `${Number(product.total_quantity).toLocaleString()}×`}
                    <span className="text-muted-foreground block text-xs font-normal">
                      {metric === "spend"
                        ? `${product.times_bought} buys`
                        : format(product.total_minor)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
