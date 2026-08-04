import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { formatMonth } from "@/lib/date";
import { formatMoney, percentOf } from "@/lib/money";
import type { Database, Json } from "@/lib/types/database";

type Client = SupabaseClient<Database>;

/**
 * Raises budget alerts for a month, at most once each.
 *
 * The dedupe key is what makes this safe to call on every write: re-editing a
 * receipt, correcting a category, or importing the same CSV twice can't re-fire
 * an alert the user has already seen.
 */
export async function syncBudgetAlerts(
  supabase: Client,
  userId: string,
  month: string,
  currency = "GBP",
  locale = "en-GB",
) {
  const { data: progress, error } = await supabase.rpc("fn_budget_progress", {
    p_month: month,
  });

  if (error || !progress?.length) return;

  const rows: Array<{
    user_id: string;
    type: string;
    title: string;
    body: string;
    payload: Json;
    dedupe_key: string;
  }> = [];

  for (const b of progress) {
    const pct = percentOf(b.spent_minor, b.amount_minor);
    const scope =
      b.category_id === null ? "your monthly budget" : b.category_name;

    if (pct > 100) {
      rows.push({
        user_id: userId,
        type: "budget_exceeded",
        title: `Over budget on ${scope}`,
        body: `${formatMoney(b.spent_minor, currency, locale)} spent against ${formatMoney(
          b.amount_minor,
          currency,
          locale,
        )} for ${formatMonth(month)}.`,
        payload: {
          budget_id: b.budget_id,
          category_id: b.category_id,
          month,
          percent: Math.round(pct),
        },
        dedupe_key: `budget:${b.budget_id}:over`,
      });
    } else if (pct >= b.alert_threshold_pct) {
      rows.push({
        user_id: userId,
        type: "budget_threshold",
        title: `${Math.round(pct)}% of ${scope} used`,
        body: `${formatMoney(b.spent_minor, currency, locale)} of ${formatMoney(
          b.amount_minor,
          currency,
          locale,
        )} for ${formatMonth(month)}.`,
        payload: {
          budget_id: b.budget_id,
          category_id: b.category_id,
          month,
          percent: Math.round(pct),
        },
        dedupe_key: `budget:${b.budget_id}:threshold`,
      });
    }
  }

  if (rows.length === 0) return;

  await supabase
    .from("notifications")
    .upsert(rows, { onConflict: "user_id,dedupe_key", ignoreDuplicates: true });
}
