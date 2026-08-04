"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { syncBudgetAlerts } from "@/lib/budgets/alerts";
import { monthKey, shiftMonth } from "@/lib/date";
import { parseMoneyToMinor } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  periodMonth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  categoryId: z.string().uuid().nullable(),
  amount: z.string(),
  alertThresholdPct: z.coerce.number().int().min(1).max(100).default(80),
});

function revalidateBudgetPages() {
  revalidatePath("/budgets");
  revalidatePath("/dashboard");
  revalidatePath("/notifications");
}

/**
 * Create or update a budget for a month.
 *
 * Uniqueness is enforced by two partial indexes (one for the overall budget,
 * one per category), which upsert can't target — so this reads first and then
 * writes.
 */
export async function saveBudget(input: {
  periodMonth: string;
  categoryId: string | null;
  amount: string;
  alertThresholdPct?: number;
}) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0].message };
  }

  const amountMinor = parseMoneyToMinor(parsed.data.amount);
  if (!amountMinor || amountMinor <= 0) {
    return { ok: false as const, error: "Enter an amount above zero." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "You need to be signed in." };

  const lookup = supabase
    .from("budgets")
    .select("id")
    .eq("period_month", parsed.data.periodMonth);

  const { data: existing } = parsed.data.categoryId
    ? await lookup.eq("category_id", parsed.data.categoryId).maybeSingle()
    : await lookup.is("category_id", null).maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("budgets")
      .update({
        amount_minor: amountMinor,
        alert_threshold_pct: parsed.data.alertThresholdPct,
      })
      .eq("id", existing.id);
    if (error) return { ok: false as const, error: error.message };
  } else {
    const { error } = await supabase.from("budgets").insert({
      user_id: user.id,
      period_month: parsed.data.periodMonth,
      category_id: parsed.data.categoryId,
      amount_minor: amountMinor,
      alert_threshold_pct: parsed.data.alertThresholdPct,
    });
    if (error) return { ok: false as const, error: error.message };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("currency, locale")
    .eq("id", user.id)
    .maybeSingle();

  await syncBudgetAlerts(
    supabase,
    user.id,
    parsed.data.periodMonth,
    profile?.currency ?? "GBP",
    profile?.locale ?? "en-GB",
  );

  revalidateBudgetPages();
  return { ok: true as const };
}

export async function deleteBudget(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("budgets").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };

  revalidateBudgetPages();
  return { ok: true as const };
}

/** Copies last month's budgets forward, skipping anything already set. */
export async function copyBudgetsFromPreviousMonth(month: string = monthKey()) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "You need to be signed in." };

  const previous = shiftMonth(month, -1);

  const [{ data: source }, { data: current }] = await Promise.all([
    supabase.from("budgets").select("*").eq("period_month", previous),
    supabase.from("budgets").select("category_id").eq("period_month", month),
  ]);

  if (!source?.length) {
    return { ok: false as const, error: "There's nothing to copy from last month." };
  }

  const taken = new Set((current ?? []).map((b) => b.category_id));
  const rows = source
    .filter((b) => !taken.has(b.category_id))
    .map((b) => ({
      user_id: user.id,
      period_month: month,
      category_id: b.category_id,
      amount_minor: b.amount_minor,
      alert_threshold_pct: b.alert_threshold_pct,
    }));

  if (rows.length === 0) {
    return { ok: false as const, error: "Every budget from last month is already set." };
  }

  const { error } = await supabase.from("budgets").insert(rows);
  if (error) return { ok: false as const, error: error.message };

  revalidateBudgetPages();
  return { ok: true as const, count: rows.length };
}
