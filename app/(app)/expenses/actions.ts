"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { syncBudgetAlerts } from "@/lib/budgets/alerts";
import {
  learnFromCorrection,
  loadResolver,
  rememberProduct,
  resolveStore,
} from "@/lib/categorize/server";
import { monthKey } from "@/lib/date";
import {
  expenseTransactionSchema,
  type ExpenseTransactionInput,
  type SaveResult,
} from "@/lib/expenses/schema";
import { createClient } from "@/lib/supabase/server";

function revalidateSpendPages() {
  for (const path of [
    "/dashboard",
    "/expenses",
    "/analytics",
    "/budgets",
    "/insights",
    "/stores",
    "/products",
    "/notifications",
  ]) {
    revalidatePath(path);
  }
}

/**
 * Creates or replaces a shopping trip and all of its items.
 *
 * Items are rewritten wholesale rather than diffed: a trip is small, the edit
 * screens let you add and remove rows freely, and a full replace can't leave
 * orphaned lines behind. The transaction total is maintained by a database
 * trigger, so it can never drift from the sum of what's in front of the user.
 */
export async function saveExpense(
  input: ExpenseTransactionInput,
): Promise<SaveResult> {
  const parsed = expenseTransactionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }
  const data = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You need to be signed in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("currency, locale")
    .eq("id", user.id)
    .maybeSingle();

  const currency = profile?.currency ?? "GBP";

  const storeId =
    data.storeId ?? (await resolveStore(supabase, user.id, data.storeName));

  let transactionId = data.id;

  if (transactionId) {
    const { error } = await supabase
      .from("transactions")
      .update({
        store_id: storeId,
        purchase_date: data.purchaseDate,
        notes: data.notes ?? null,
        currency,
      })
      .eq("id", transactionId);
    if (error) return { ok: false, error: error.message };

    await supabase
      .from("transaction_items")
      .delete()
      .eq("transaction_id", transactionId);
  } else {
    const { data: created, error } = await supabase
      .from("transactions")
      .insert({
        user_id: user.id,
        store_id: storeId,
        receipt_id: data.receiptId ?? null,
        purchase_date: data.purchaseDate,
        notes: data.notes ?? null,
        source: data.source,
        currency,
      })
      .select("id")
      .single();

    if (error || !created) {
      return { ok: false, error: error?.message ?? "Could not save the trip." };
    }
    transactionId = created.id;
  }

  const resolver = await loadResolver(supabase, user.id);

  const rows = [];
  for (const [index, item] of data.items.entries()) {
    const resolution = item.categoryId
      ? {
          categoryId: item.categoryId,
          source: item.categoryChosenByUser
            ? ("user" as const)
            : ("ai" as const),
          confidence: item.categoryChosenByUser ? 1 : (item.aiConfidence ?? null),
        }
      : resolver.resolve(item.name, item.aiCategorySlug, item.aiConfidence);

    // Remember the product either way; only let a human decision overwrite an
    // existing memory.
    const productId = await rememberProduct(supabase, user.id, {
      name: item.name,
      categoryId: resolution.categoryId,
      unit: item.unit ?? null,
      authoritative: Boolean(item.categoryChosenByUser),
    });

    if (item.categoryChosenByUser && resolution.categoryId) {
      await learnFromCorrection(
        supabase,
        user.id,
        item.name,
        resolution.categoryId,
      );
    }

    rows.push({
      user_id: user.id,
      transaction_id: transactionId,
      product_id: productId,
      category_id: resolution.categoryId,
      name: item.name,
      raw_text: item.rawText ?? null,
      quantity: item.quantity,
      unit: item.unit ?? null,
      unit_price_minor: item.unitPriceMinor ?? null,
      total_price_minor: item.totalPriceMinor,
      notes: item.notes ?? null,
      category_source: resolution.source,
      category_confidence: resolution.confidence,
      position: index,
    });
  }

  const { error: itemsError } = await supabase
    .from("transaction_items")
    .insert(rows);

  if (itemsError) return { ok: false, error: itemsError.message };

  // Saving reviewed items is what "confirms" a receipt — there is no separate
  // button to forget to press.
  if (data.receiptId) {
    await supabase
      .from("receipts")
      .update({ status: "confirmed", error_message: null })
      .eq("id", data.receiptId);
    revalidatePath("/receipts");
    revalidatePath(`/receipts/${data.receiptId}`);
  }

  await syncBudgetAlerts(
    supabase,
    user.id,
    monthKey(data.purchaseDate),
    currency,
    profile?.locale ?? "en-GB",
  );

  revalidateSpendPages();
  revalidatePath(`/expenses/${transactionId}`);

  return { ok: true, transactionId };
}

export async function deleteExpense(transactionId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", transactionId);

  if (error) return { ok: false as const, error: error.message };

  revalidateSpendPages();
  return { ok: true as const };
}

const bulkCategorySchema = z.object({
  itemIds: z.array(z.string().uuid()).min(1).max(500),
  categoryId: z.string().uuid(),
});

/** Bulk re-file items, and learn from every one of them. */
export async function updateItemsCategory(input: {
  itemIds: string[];
  categoryId: string;
}) {
  const parsed = bulkCategorySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "You need to be signed in." };

  const { data: items } = await supabase
    .from("transaction_items")
    .select("id, name")
    .in("id", parsed.data.itemIds);

  const { error } = await supabase
    .from("transaction_items")
    .update({
      category_id: parsed.data.categoryId,
      category_source: "user",
      category_confidence: 1,
    })
    .in("id", parsed.data.itemIds);

  if (error) return { ok: false as const, error: error.message };

  for (const item of items ?? []) {
    await Promise.all([
      learnFromCorrection(supabase, user.id, item.name, parsed.data.categoryId),
      rememberProduct(supabase, user.id, {
        name: item.name,
        categoryId: parsed.data.categoryId,
        authoritative: true,
      }),
    ]);
  }

  revalidateSpendPages();
  return { ok: true as const, count: parsed.data.itemIds.length };
}

export async function deleteItems(itemIds: string[]) {
  if (itemIds.length === 0) return { ok: true as const, count: 0 };

  const supabase = await createClient();

  // Remember which trips are affected before the rows disappear.
  const { data: affected } = await supabase
    .from("transaction_items")
    .select("transaction_id")
    .in("id", itemIds);

  const { error } = await supabase
    .from("transaction_items")
    .delete()
    .in("id", itemIds);

  if (error) return { ok: false as const, error: error.message };

  // A trip with nothing left in it would still count towards "shopping trips"
  // and drag the average spend down, so clear it out.
  const transactionIds = [...new Set((affected ?? []).map((a) => a.transaction_id))];
  for (const id of transactionIds) {
    const { count } = await supabase
      .from("transaction_items")
      .select("id", { count: "exact", head: true })
      .eq("transaction_id", id);
    if (!count) await supabase.from("transactions").delete().eq("id", id);
  }

  revalidateSpendPages();
  return { ok: true as const, count: itemIds.length };
}
