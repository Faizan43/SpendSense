import "server-only";

import type { SpendFilters } from "@/lib/filters";
import { createClient } from "@/lib/supabase/server";

export type ExportRow = {
  id: string;
  transactionId: string;
  purchaseDate: string;
  storeName: string | null;
  name: string;
  categoryName: string;
  chartSlot: number;
  quantity: number;
  unit: string | null;
  unitPriceMinor: number | null;
  totalPriceMinor: number;
  notes: string | null;
};

/**
 * The filtered item list, shared by the ledger and both exports — so a CSV is
 * exactly what was on screen, not a differently-filtered approximation.
 */
export async function queryFilteredItems(
  filters: SpendFilters,
  limit = 10000,
): Promise<ExportRow[]> {
  const supabase = await createClient();

  let query = supabase
    .from("transaction_items")
    .select(
      `id, name, quantity, unit, unit_price_minor, total_price_minor, notes,
       transaction_id, category_id,
       categories(name, chart_slot),
       transactions!inner(purchase_date, store_id, stores(name))`,
    )
    .gte("transactions.purchase_date", filters.range.from)
    .lte("transactions.purchase_date", filters.range.to)
    .order("purchase_date", { referencedTable: "transactions", ascending: false })
    .limit(limit);

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
    query = query.ilike("name", `%${filters.search}%`);
  }

  const { data } = await query;

  return (data ?? []).map((item) => {
    const transaction = Array.isArray(item.transactions)
      ? item.transactions[0]
      : item.transactions;
    const storeRaw = transaction?.stores;
    const store = Array.isArray(storeRaw) ? storeRaw[0] : storeRaw;
    const categoryRaw = item.categories;
    const category = Array.isArray(categoryRaw) ? categoryRaw[0] : categoryRaw;

    return {
      id: item.id,
      transactionId: item.transaction_id,
      purchaseDate: transaction?.purchase_date ?? "",
      storeName: store?.name ?? null,
      name: item.name,
      categoryName: category?.name ?? "Uncategorised",
      chartSlot: category?.chart_slot ?? 0,
      quantity: Number(item.quantity),
      unit: item.unit,
      unitPriceMinor: item.unit_price_minor,
      totalPriceMinor: item.total_price_minor,
      notes: item.notes,
    };
  });
}
