import "server-only";

import { cache } from "react";

import type { ProductSuggestion } from "@/components/expenses/expense-editor";
import { createClient } from "@/lib/supabase/server";

export const getProductSuggestions = cache(
  async (limit = 500): Promise<ProductSuggestion[]> => {
    const supabase = await createClient();
    const { data } = await supabase.rpc("fn_product_suggestions", {
      p_limit: limit,
    });

    return (data ?? []).map((row) => ({
      name: row.name,
      categoryId: row.category_id,
      lastUnitPriceMinor: row.last_unit_price_minor,
      unit: row.unit,
    }));
  },
);

/** A trip with its items, shaped for the editor. */
export async function getTransactionWithItems(id: string) {
  const supabase = await createClient();

  const [{ data: transaction }, { data: items }] = await Promise.all([
    supabase
      .from("transactions")
      .select("*, stores(id, name)")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("transaction_items")
      .select("*")
      .eq("transaction_id", id)
      .order("position", { ascending: true }),
  ]);

  if (!transaction) return null;
  return { transaction, items: items ?? [] };
}
