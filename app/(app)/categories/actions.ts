"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { normalizeProductName } from "@/lib/normalize";
import { createClient } from "@/lib/supabase/server";

function revalidateCategoryPages() {
  for (const path of ["/categories", "/dashboard", "/expenses", "/analytics", "/budgets"]) {
    revalidatePath(path);
  }
}

const upsertSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, "Give the category a name").max(60),
  icon: z.string().trim().max(40).default("package"),
  chartSlot: z.coerce.number().int().min(0).max(8).default(0),
});

export async function saveCategory(input: {
  id?: string;
  name: string;
  icon: string;
  chartSlot: number;
}) {
  const parsed = upsertSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "You need to be signed in." };

  if (parsed.data.id) {
    const { error } = await supabase
      .from("categories")
      .update({
        name: parsed.data.name,
        icon: parsed.data.icon,
        chart_slot: parsed.data.chartSlot,
      })
      .eq("id", parsed.data.id);
    if (error) return { ok: false as const, error: error.message };
  } else {
    const { count } = await supabase
      .from("categories")
      .select("id", { count: "exact", head: true });

    const slug = `${normalizeProductName(parsed.data.name).replace(/\s+/g, "-")}-${Date.now().toString(36)}`;

    const { error } = await supabase.from("categories").insert({
      user_id: user.id,
      slug,
      name: parsed.data.name,
      icon: parsed.data.icon,
      chart_slot: parsed.data.chartSlot,
      is_system: false,
      sort_order: count ?? 0,
    });
    if (error) return { ok: false as const, error: error.message };
  }

  revalidateCategoryPages();
  return { ok: true as const };
}

export async function reorderCategories(orderedIds: string[]) {
  const supabase = await createClient();

  for (const [index, id] of orderedIds.entries()) {
    await supabase.from("categories").update({ sort_order: index }).eq("id", id);
  }

  revalidateCategoryPages();
  return { ok: true as const };
}

/**
 * Folds one category into another: items, product memory, rules and budgets all
 * move across before the source disappears, so nothing is orphaned into
 * "Uncategorised" and no historical total changes.
 */
export async function mergeCategories(sourceId: string, targetId: string) {
  if (sourceId === targetId) {
    return { ok: false as const, error: "Pick two different categories." };
  }

  const supabase = await createClient();

  const { data: source } = await supabase
    .from("categories")
    .select("id, is_system, name")
    .eq("id", sourceId)
    .maybeSingle();

  if (!source) return { ok: false as const, error: "That category no longer exists." };

  await supabase
    .from("transaction_items")
    .update({ category_id: targetId })
    .eq("category_id", sourceId);

  await supabase
    .from("products")
    .update({ default_category_id: targetId })
    .eq("default_category_id", sourceId);

  await supabase
    .from("category_rules")
    .update({ category_id: targetId })
    .eq("category_id", sourceId);

  // A budget can't move: the target may already have one for the same month,
  // and two budgets for one category is meaningless. Drop the source's.
  await supabase.from("budgets").delete().eq("category_id", sourceId);

  if (source.is_system) {
    // System categories are the twelve the extractor knows about, so keep the
    // row and just empty it rather than breaking future extractions.
    return finishMerge(
      "Moved everything across. The empty category was kept because the receipt reader still uses it.",
    );
  }

  const { error } = await supabase.from("categories").delete().eq("id", sourceId);
  if (error) return { ok: false as const, error: error.message };

  return finishMerge(`Merged ${source.name} away.`);

  function finishMerge(message: string) {
    revalidateCategoryPages();
    return { ok: true as const, message };
  }
}

export async function deleteCategory(id: string) {
  const supabase = await createClient();

  const { count } = await supabase
    .from("transaction_items")
    .select("id", { count: "exact", head: true })
    .eq("category_id", id);

  if (count && count > 0) {
    return {
      ok: false as const,
      error: `${count} items are still filed here. Merge it into another category instead.`,
    };
  }

  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id)
    .eq("is_system", false);

  if (error) return { ok: false as const, error: error.message };

  revalidateCategoryPages();
  return { ok: true as const };
}

const ruleSchema = z.object({
  pattern: z.string().trim().min(2, "A rule needs at least two characters").max(80),
  categoryId: z.string().uuid(),
  matchType: z.enum(["contains", "exact", "prefix"]).default("contains"),
});

/** A rule the user wrote wins over everything else the categoriser knows. */
export async function saveRule(input: {
  pattern: string;
  categoryId: string;
  matchType?: "contains" | "exact" | "prefix";
}) {
  const parsed = ruleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "You need to be signed in." };

  const { error } = await supabase.from("category_rules").upsert(
    {
      user_id: user.id,
      category_id: parsed.data.categoryId,
      pattern: parsed.data.pattern.toLowerCase(),
      match_type: parsed.data.matchType,
      priority: 10,
      source: "user",
    },
    { onConflict: "user_id,pattern,match_type" },
  );

  if (error) return { ok: false as const, error: error.message };

  revalidateCategoryPages();
  return { ok: true as const };
}

export async function deleteRule(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("category_rules").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };

  revalidateCategoryPages();
  return { ok: true as const };
}

/**
 * Re-runs categorisation over items the user has never touched. Useful after
 * adding a rule: "put everything with 'oat' in Dairy" should apply to the past
 * as well as the future.
 */
export async function reapplyRules() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "You need to be signed in." };

  const { loadResolver } = await import("@/lib/categorize/server");
  const resolver = await loadResolver(supabase, user.id);

  const { data: items } = await supabase
    .from("transaction_items")
    .select("id, name, category_id, category_source")
    .neq("category_source", "user")
    .limit(5000);

  let changed = 0;
  for (const item of items ?? []) {
    const resolution = resolver.resolve(item.name);
    if (resolution.categoryId && resolution.categoryId !== item.category_id) {
      await supabase
        .from("transaction_items")
        .update({
          category_id: resolution.categoryId,
          category_source: resolution.source,
          category_confidence: resolution.confidence,
        })
        .eq("id", item.id);
      changed += 1;
    }
  }

  revalidateCategoryPages();
  return { ok: true as const, changed };
}
