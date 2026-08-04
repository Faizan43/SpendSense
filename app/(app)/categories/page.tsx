import type { Metadata } from "next";

import { CategoryManager } from "@/components/categories/category-manager";
import { PageHeader } from "@/components/layout/page-header";
import { getSpendByCategory } from "@/lib/analytics/queries";
import { resolveRange } from "@/lib/date";
import { getCategories } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Categories" };

export default async function CategoriesPage() {
  const supabase = await createClient();

  const [categories, rules, spend] = await Promise.all([
    getCategories(),
    supabase
      .from("category_rules")
      .select("*")
      .in("source", ["user", "learned"])
      .order("priority", { ascending: true })
      .order("pattern", { ascending: true })
      .limit(300),
    getSpendByCategory({
      preset: "all-time",
      range: resolveRange("all-time"),
      storeIds: [],
      categoryIds: [],
      minMinor: null,
      maxMinor: null,
      search: "",
    }),
  ]);

  const nameById = new Map(categories.map((c) => [c.id, c.name]));

  return (
    <>
      <PageHeader
        title="Categories"
        description="Rename them, recolour them, and teach the categoriser what belongs where. Every correction you make on the expenses screen already lands here."
      />

      <CategoryManager
        categories={categories}
        rules={(rules.data ?? []).map((rule) => ({
          ...rule,
          categoryName: nameById.get(rule.category_id) ?? "Unknown",
        }))}
        stats={spend
          .filter((row) => row.category_id)
          .map((row) => ({
            categoryId: row.category_id as string,
            itemCount: row.item_count,
            totalMinor: row.total_minor,
          }))}
      />
    </>
  );
}
