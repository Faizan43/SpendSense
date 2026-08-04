import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { CategoryRow, ProfileRow } from "@/lib/types/database";

/**
 * `cache` dedupes these within a single render pass, so a layout, a page and
 * three widgets asking for the profile issue one query between them.
 */
export const getProfile = cache(async (): Promise<ProfileRow | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return data ?? null;
});

export const getCategories = cache(async (): Promise<CategoryRow[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true });
  return data ?? [];
});

export const getStores = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("stores")
    .select("*")
    .order("name", { ascending: true });
  return data ?? [];
});

export type MoneyFormat = { currency: string; locale: string };

export async function getMoneyFormat(): Promise<MoneyFormat> {
  const profile = await getProfile();
  return {
    currency: profile?.currency ?? "GBP",
    locale: profile?.locale ?? "en-GB",
  };
}
