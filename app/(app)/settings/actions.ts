"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { CURRENCIES } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";

export type SettingsState = { error?: string; message?: string };

const profileSchema = z.object({
  display_name: z.string().trim().max(80).optional(),
  currency: z.enum(CURRENCIES.map((c) => c.code) as [string, ...string[]]),
  locale: z.string().trim().min(2).max(12),
  week_starts_on: z.coerce.number().int().min(0).max(1),
  default_alert_threshold_pct: z.coerce.number().int().min(1).max(100),
});

export async function updateProfile(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const parsed = profileSchema.safeParse({
    display_name: formData.get("display_name") ?? undefined,
    currency: formData.get("currency"),
    locale: formData.get("locale"),
    week_starts_on: formData.get("week_starts_on"),
    default_alert_threshold_pct: formData.get("default_alert_threshold_pct"),
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be signed in." };

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.data.display_name || null,
      currency: parsed.data.currency,
      locale: parsed.data.locale,
      week_starts_on: parsed.data.week_starts_on,
      default_alert_threshold_pct: parsed.data.default_alert_threshold_pct,
    })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { message: "Settings saved." };
}

/**
 * Wipes every receipt file and row. Deliberately separate from deleting spend
 * data: people often want the images gone once the numbers are recorded.
 */
export async function deleteAllReceipts(): Promise<SettingsState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be signed in." };

  const { data: receipts } = await supabase
    .from("receipts")
    .select("id, storage_path");

  const paths = (receipts ?? []).map((r) => r.storage_path).filter(Boolean);
  if (paths.length > 0) {
    await supabase.storage.from("receipts").remove(paths);
  }

  const { error } = await supabase
    .from("receipts")
    .delete()
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/receipts");
  return {
    message: `Deleted ${paths.length} receipt ${paths.length === 1 ? "file" : "files"}. The shops you saved from them are untouched.`,
  };
}

/**
 * Deletes every row this account owns. The auth record itself needs the
 * Supabase dashboard or an admin key, which this app deliberately doesn't
 * hold — so we say so rather than pretending the account is gone.
 */
export async function deleteAllData(): Promise<SettingsState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be signed in." };

  const { data: receipts } = await supabase
    .from("receipts")
    .select("storage_path");

  const paths = (receipts ?? []).map((r) => r.storage_path).filter(Boolean);
  if (paths.length > 0) {
    await supabase.storage.from("receipts").remove(paths);
  }

  // transaction_items cascade from transactions; budgets and notifications
  // are independent.
  for (const table of [
    "transactions",
    "receipts",
    "budgets",
    "notifications",
    "products",
    "stores",
  ] as const) {
    const { error } = await supabase.from(table).delete().eq("user_id", user.id);
    if (error) return { error: `Couldn't clear ${table}: ${error.message}` };
  }

  await supabase
    .from("category_rules")
    .delete()
    .eq("user_id", user.id)
    .in("source", ["user", "learned"]);

  revalidatePath("/", "layout");
  return {
    message:
      "All of your spending data has been deleted. Your sign-in details still exist — remove those from the Supabase dashboard if you want the account gone entirely.",
  };
}
