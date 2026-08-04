import { ArrowDownRight, ArrowUpRight, Search } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

import { CategoryChip } from "@/components/category-chip";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { ProductAmount } from "@/components/products/product-amount";
import { Input } from "@/components/ui/input";
import { getTopProducts } from "@/lib/analytics/queries";
import { resolveRange } from "@/lib/date";
import type { SearchParams } from "@/lib/filters";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Products" };

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const search = (typeof params.q === "string" ? params.q : "").trim();

  const supabase = await createClient();

  const [products, movers] = await Promise.all([
    getTopProducts(
      {
        preset: "all-time",
        range: resolveRange("all-time"),
        storeIds: [],
        categoryIds: [],
        minMinor: null,
        maxMinor: null,
        search: "",
      },
      "frequency",
      200,
    ),
    supabase.rpc("fn_price_movers", {
      p_lookback_days: 365,
      p_min_purchases: 2,
      p_limit: 200,
    }),
  ]);

  const changeByKey = new Map(
    (movers.data ?? []).map((m) => [m.product_key, m.change_pct]),
  );

  const filtered = search
    ? products.filter((p) =>
        p.product_name.toLowerCase().includes(search.toLowerCase()),
      )
    : products;

  return (
    <>
      <PageHeader
        title="Products"
        description="Everything you buy, how often, and whether its price is drifting."
      />

      <form className="relative max-w-sm">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input
          name="q"
          defaultValue={search}
          className="pl-8"
          placeholder="Search products…"
          aria-label="Search products"
        />
      </form>

      {filtered.length === 0 ? (
        <EmptyState
          icon="shopping-basket"
          title={search ? "Nothing matches that" : "No products yet"}
          description={
            search
              ? "Try a shorter search term."
              : "Products appear here as soon as you've saved a shop."
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:font-medium">
                <th className="text-left">Product</th>
                <th className="text-left">Category</th>
                <th className="text-right">Times bought</th>
                <th className="text-right">Quantity</th>
                <th className="text-right">Total spent</th>
                <th className="text-right">Price trend</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((product) => {
                const change = changeByKey.get(product.product_key);
                return (
                  <tr key={product.product_key} className="hover:bg-muted/40 border-t">
                    <td className="px-3 py-2">
                      <Link
                        href={`/products/${encodeURIComponent(product.product_key)}`}
                        className="font-medium hover:underline"
                      >
                        {product.product_name}
                      </Link>
                    </td>
                    <td className="px-3 py-2">
                      <CategoryChip
                        name={product.category_name}
                        chartSlot={product.chart_slot}
                      />
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {product.times_bought}
                    </td>
                    <td className="text-muted-foreground px-3 py-2 text-right tabular-nums">
                      {Number(product.total_quantity).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right font-medium tabular-nums">
                      <ProductAmount minor={product.total_minor} />
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {change == null ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <span
                          className={
                            change > 0 ? "text-destructive" : "text-success"
                          }
                        >
                          <span className="inline-flex items-center gap-0.5">
                            {change > 0 ? (
                              <ArrowUpRight className="size-3" />
                            ) : (
                              <ArrowDownRight className="size-3" />
                            )}
                            {Math.abs(Number(change))}%
                          </span>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
