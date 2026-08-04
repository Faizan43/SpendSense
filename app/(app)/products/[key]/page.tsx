import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

import { PriceHistory } from "@/components/charts/price-history";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { ProductAmount } from "@/components/products/product-amount";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/date";
import { titleCase } from "@/lib/normalize";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Product" };

export default async function ProductPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const normalized = decodeURIComponent(key);

  const supabase = await createClient();

  const [{ data: history }, { data: product }] = await Promise.all([
    supabase.rpc("fn_price_history", { p_normalized_name: normalized }),
    supabase
      .from("products")
      .select("canonical_name")
      .eq("normalized_name", normalized)
      .maybeSingle(),
  ]);

  const rows = history ?? [];
  const name = product?.canonical_name ?? titleCase(normalized);

  const totalSpent = rows.reduce((sum, r) => sum + r.total_price_minor, 0);
  const totalQuantity = rows.reduce((sum, r) => sum + Number(r.quantity), 0);
  const stores = new Set(rows.map((r) => r.store_name));

  return (
    <>
      <PageHeader
        title={name}
        description={
          rows.length > 0
            ? `Bought ${rows.length} ${rows.length === 1 ? "time" : "times"} across ${stores.size} ${stores.size === 1 ? "store" : "stores"}.`
            : undefined
        }
        actions={
          <Button variant="outline" render={<Link href="/products" />}>
            <ArrowLeft className="size-4" /> All products
          </Button>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          icon="shopping-basket"
          title="Nothing recorded for this product"
          description="It may have been renamed or deleted."
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Card>
              <CardContent className="space-y-1">
                <p className="text-muted-foreground text-sm">Total spent</p>
                <p className="text-2xl font-semibold tracking-tight">
                  <ProductAmount minor={totalSpent} />
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="space-y-1">
                <p className="text-muted-foreground text-sm">Total quantity</p>
                <p className="text-2xl font-semibold tracking-tight">
                  {totalQuantity.toLocaleString()}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="space-y-1">
                <p className="text-muted-foreground text-sm">Last bought</p>
                <p className="text-2xl font-semibold tracking-tight">
                  {formatDate(rows[rows.length - 1]?.purchase_date)}
                </p>
              </CardContent>
            </Card>
          </div>

          <PriceHistory data={rows} productName={name} />

          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:font-medium">
                  <th className="text-left">Date</th>
                  <th className="text-left">Store</th>
                  <th className="text-right">Quantity</th>
                  <th className="text-right">Unit price</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {[...rows].reverse().map((row, index) => (
                  <tr key={`${row.purchase_date}-${index}`} className="border-t">
                    <td className="px-3 py-2">{formatDate(row.purchase_date)}</td>
                    <td className="text-muted-foreground px-3 py-2">
                      {row.store_name}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {Number(row.quantity)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {row.unit_price_minor != null ? (
                        <ProductAmount minor={row.unit_price_minor} />
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-medium tabular-nums">
                      <ProductAmount minor={row.total_price_minor} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
