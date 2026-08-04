"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { normalizeStoreName } from "@/lib/normalize";
import { createClient } from "@/lib/supabase/server";

function revalidateStorePages() {
  for (const path of ["/stores", "/dashboard", "/expenses", "/analytics"]) {
    revalidatePath(path);
  }
}

export async function renameStore(id: string, name: string) {
  const parsed = z.string().trim().min(1).max(120).safeParse(name);
  if (!parsed.success) {
    return { ok: false as const, error: "Give the store a name." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("stores")
    .update({
      name: parsed.data,
      normalized_name: normalizeStoreName(parsed.data),
    })
    .eq("id", id);

  if (error) {
    // The unique index on (user_id, normalized_name) is doing its job: the new
    // name collides with a store that already exists.
    return {
      ok: false as const,
      error: "You already have a store with that name — merge them instead.",
    };
  }

  revalidateStorePages();
  return { ok: true as const };
}

/** "TESCO EXTRA 4471" and "Tesco" are the same shop; this folds one into the other. */
export async function mergeStores(sourceId: string, targetId: string) {
  if (sourceId === targetId) {
    return { ok: false as const, error: "Pick two different stores." };
  }

  const supabase = await createClient();

  await supabase
    .from("transactions")
    .update({ store_id: targetId })
    .eq("store_id", sourceId);

  await supabase.from("receipts").update({ store_id: targetId }).eq("store_id", sourceId);

  const { error } = await supabase.from("stores").delete().eq("id", sourceId);
  if (error) return { ok: false as const, error: error.message };

  revalidateStorePages();
  return { ok: true as const };
}

export async function deleteStore(id: string) {
  const supabase = await createClient();

  const { count } = await supabase
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .eq("store_id", id);

  if (count && count > 0) {
    return {
      ok: false as const,
      error: `${count} shops are recorded here. Merge it into another store instead.`,
    };
  }

  const { error } = await supabase.from("stores").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };

  revalidateStorePages();
  return { ok: true as const };
}
