"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { monthKey } from "@/lib/date";
import { CURRENCIES, parseMoneyToMinor } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  display_name: z.string().trim().max(80).optional(),
  currency: z.enum(CURRENCIES.map((c) => c.code) as [string, ...string[]]),
  locale: z.string().trim().min(2).max(12),
  week_starts_on: z.coerce.number().int().min(0).max(1),
  monthly_budget: z.string().optional(),
});

export type OnboardingState = { error?: string };

export async function completeOnboarding(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const parsed = schema.safeParse({
    display_name: formData.get("display_name") ?? undefined,
    currency: formData.get("currency"),
    locale: formData.get("locale"),
    week_starts_on: formData.get("week_starts_on"),
    monthly_budget: formData.get("monthly_budget") ?? undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // The signup trigger normally creates this row; upsert covers the case where
  // the account predates the trigger (or was made directly in the dashboard).
  const { error: profileError } = await supabase.from("profiles").upsert({
    id: user.id,
    display_name: parsed.data.display_name || null,
    currency: parsed.data.currency,
    locale: parsed.data.locale,
    week_starts_on: parsed.data.week_starts_on,
    onboarded_at: new Date().toISOString(),
  });

  if (profileError) return { error: profileError.message };

  // Categories are seeded by the signup trigger; call it again for accounts
  // that predate it. It is idempotent, and it derives the user from the
  // session rather than taking an id, so there is nothing to forge.
  await supabase.rpc("ensure_user_defaults");

  const budgetMinor = parseMoneyToMinor(parsed.data.monthly_budget ?? "");
  if (budgetMinor && budgetMinor > 0) {
    // The uniqueness constraint is a partial index (…where category_id is
    // null), which upsert can't target, so read-then-write it is.
    const month = monthKey();
    const { data: existing } = await supabase
      .from("budgets")
      .select("id")
      .eq("period_month", month)
      .is("category_id", null)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("budgets")
        .update({ amount_minor: budgetMinor })
        .eq("id", existing.id);
    } else {
      await supabase.from("budgets").insert({
        user_id: user.id,
        period_month: month,
        category_id: null,
        amount_minor: budgetMinor,
      });
    }
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
