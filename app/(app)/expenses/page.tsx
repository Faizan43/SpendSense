import { Plus, Upload } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

import { EmptyState } from "@/components/empty-state";
import { ExpensesTable } from "@/components/expenses/expenses-table";
import { ExportMenu } from "@/components/export-menu";
import { FilterBar } from "@/components/filters/filter-bar";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  hasActiveFilters,
  parseFilters,
  parsePage,
  parseSort,
  type SearchParams,
} from "@/lib/filters";
import { getCategories, getStores } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Expenses" };

const PAGE_SIZE = 50;

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const filters = parseFilters(params, "last-12-months");
  const sort = parseSort(params);
  const page = parsePage(params);

  const [categories, stores, supabase] = await Promise.all([
    getCategories(),
    getStores(),
    createClient(),
  ]);

  let query = supabase
    .from("transaction_items")
    .select(
      `id, name, quantity, unit, unit_price_minor, total_price_minor,
       category_id, category_source, notes, transaction_id,
       transactions!inner(id, purchase_date, store_id, stores(id, name))`,
      { count: "exact" },
    )
    .gte("transactions.purchase_date", filters.range.from)
    .lte("transactions.purchase_date", filters.range.to);

  if (filters.storeIds.length) {
    query = query.in("transactions.store_id", filters.storeIds);
  }
  if (filters.categoryIds.length) {
    query = query.in("category_id", filters.categoryIds);
  }
  if (filters.minMinor !== null) {
    query = query.gte("total_price_minor", filters.minMinor);
  }
  if (filters.maxMinor !== null) {
    query = query.lte("total_price_minor", filters.maxMinor);
  }
  if (filters.search) {
    // Substring rather than full-text here: in a ledger search box people
    // expect "milk" to also find "buttermilk".
    query = query.ilike("name", `%${filters.search}%`);
  }

  if (sort.key === "date") {
    query = query.order("purchase_date", {
      referencedTable: "transactions",
      ascending: sort.ascending,
    });
  } else if (sort.key === "store") {
    query = query.order("store_id", {
      referencedTable: "transactions",
      ascending: sort.ascending,
    });
  } else {
    const column = (
      {
        name: "name",
        category: "category_id",
        quantity: "quantity",
        unit_price: "unit_price_minor",
        total: "total_price_minor",
      } as const
    )[sort.key as "name" | "category" | "quantity" | "unit_price" | "total"];
    query = query.order(column, { ascending: sort.ascending });
  }

  const offset = (page - 1) * PAGE_SIZE;
  const { data, count } = await query.range(offset, offset + PAGE_SIZE - 1);

  const categoryById = new Map(categories.map((c) => [c.id, c]));

  const rows = (data ?? []).map((item) => {
    const transaction = Array.isArray(item.transactions)
      ? item.transactions[0]
      : item.transactions;
    const storeRaw = transaction?.stores;
    const store = Array.isArray(storeRaw) ? storeRaw[0] : storeRaw;
    const category = item.category_id
      ? categoryById.get(item.category_id)
      : undefined;

    return {
      id: item.id,
      transactionId: item.transaction_id,
      name: item.name,
      notes: item.notes,
      quantity: Number(item.quantity),
      unit: item.unit,
      unitPriceMinor: item.unit_price_minor,
      totalPriceMinor: item.total_price_minor,
      purchaseDate: transaction?.purchase_date ?? "",
      storeName: store?.name ?? null,
      categoryId: item.category_id,
      categoryName: category?.name ?? "Uncategorised",
      chartSlot: category?.chart_slot ?? 0,
      categorySource: item.category_source,
    };
  });

  const total = count ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeader
        title="Expenses"
        description="Every item you've bought, searchable and sortable."
        actions={
          <>
            <ExportMenu params={params} />
            <Button variant="outline" render={<Link href="/receipts/upload" />}>
              <Upload className="size-4" /> Upload receipt
            </Button>
            <Button render={<Link href="/expenses/new" />}>
              <Plus className="size-4" /> Add a shop
            </Button>
          </>
        }
      />

      <FilterBar
        stores={stores.map((s) => ({ id: s.id, label: s.name }))}
        categories={categories.map((c) => ({ id: c.id, label: c.name }))}
      />

      {rows.length === 0 ? (
        <EmptyState
          icon="list"
          title={
            hasActiveFilters(filters)
              ? "Nothing matches those filters"
              : "No expenses yet"
          }
          description={
            hasActiveFilters(filters)
              ? "Try widening the date range or clearing a filter."
              : "Upload a receipt or add a shop by hand and it'll show up here."
          }
          action={
            <Button render={<Link href="/expenses/new" />}>
              <Plus className="size-4" /> Add a shop
            </Button>
          }
        />
      ) : (
        <ExpensesTable
          rows={rows}
          categories={categories}
          total={total}
          page={page}
          pageCount={pageCount}
          sortKey={sort.key}
          ascending={sort.ascending}
        />
      )}
    </>
  );
}
