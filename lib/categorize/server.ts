import "server-only";

import { createResolver, type Resolver } from "@/lib/categorize/resolve";
import { normalizeProductName } from "@/lib/normalize";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

type Client = SupabaseClient<Database>;

/**
 * One round trip for the whole batch. Categorising forty receipt lines should
 * not be forty queries.
 */
export async function loadResolver(
  supabase: Client,
  userId: string,
): Promise<Resolver> {
  const [categories, rules, products] = await Promise.all([
    supabase.from("categories").select("*").eq("user_id", userId).order("sort_order"),
    supabase.from("category_rules").select("*").eq("user_id", userId),
    supabase
      .from("products")
      .select("normalized_name, default_category_id")
      .eq("user_id", userId)
      .not("default_category_id", "is", null),
  ]);

  return createResolver({
    categories: categories.data ?? [],
    rules: rules.data ?? [],
    products: products.data ?? [],
  });
}

/**
 * Records what a product is, so the next shop starts from the answer rather
 * than from a keyword guess. Returns the product id to attach to the item.
 */
export async function rememberProduct(
  supabase: Client,
  userId: string,
  params: {
    name: string;
    categoryId: string | null;
    unit?: string | null;
    /** Only overwrite a remembered category when the user chose it. */
    authoritative: boolean;
  },
): Promise<string | null> {
  const normalized = normalizeProductName(params.name);
  if (!normalized) return null;

  const { data: existing } = await supabase
    .from("products")
    .select("id, default_category_id")
    .eq("user_id", userId)
    .eq("normalized_name", normalized)
    .maybeSingle();

  if (existing) {
    const shouldUpdate =
      params.categoryId &&
      (params.authoritative || !existing.default_category_id);

    if (shouldUpdate) {
      await supabase
        .from("products")
        .update({ default_category_id: params.categoryId })
        .eq("id", existing.id);
    }
    return existing.id;
  }

  const { data: created } = await supabase
    .from("products")
    .insert({
      user_id: userId,
      canonical_name: params.name.trim(),
      normalized_name: normalized,
      default_category_id: params.categoryId,
      unit: params.unit ?? null,
    })
    .select("id")
    .single();

  return created?.id ?? null;
}

/**
 * A user correction is worth more than the one item they corrected: store it as
 * a rule so similar names get it right straight away.
 */
export async function learnFromCorrection(
  supabase: Client,
  userId: string,
  itemName: string,
  categoryId: string,
) {
  const normalized = normalizeProductName(itemName);
  if (!normalized || normalized.length < 3) return;

  await supabase
    .from("category_rules")
    .upsert(
      {
        user_id: userId,
        category_id: categoryId,
        pattern: normalized,
        match_type: "contains",
        priority: 50,
        source: "learned",
      },
      { onConflict: "user_id,pattern,match_type" },
    );
}

/** Finds or creates the store row for a receipt or manual entry. */
export async function resolveStore(
  supabase: Client,
  userId: string,
  rawName: string | null | undefined,
): Promise<string | null> {
  const name = rawName?.trim();
  if (!name) return null;

  const { normalizeStoreName } = await import("@/lib/normalize");
  const normalized = normalizeStoreName(name);
  if (!normalized) return null;

  const { data: existing } = await supabase
    .from("stores")
    .select("id")
    .eq("user_id", userId)
    .eq("normalized_name", normalized)
    .maybeSingle();

  if (existing) return existing.id;

  const { data: created } = await supabase
    .from("stores")
    .insert({ user_id: userId, name, normalized_name: normalized })
    .select("id")
    .single();

  return created?.id ?? null;
}
