import { NextResponse, type NextRequest } from "next/server";

import { extractReceipt } from "@/lib/anthropic/extract-receipt";
import { loadResolver, resolveStore } from "@/lib/categorize/server";
import { hasAnthropicKey } from "@/lib/env";
import { lineTotalMinor, parseMoneyToMinor } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/types/database";

// sharp is a native module, and a photographed receipt can take a while to
// read, so this runs on Node with a generous ceiling.
export const runtime = "nodejs";
export const maxDuration = 300;

/** A crude but effective guard against a runaway loop burning API credit. */
const MAX_PER_HOUR = 60;

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  if (!hasAnthropicKey()) {
    return NextResponse.json(
      {
        error:
          "Receipt reading is switched off — no ANTHROPIC_API_KEY is configured. You can still enter this shop by hand.",
      },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { data: receipt } = await supabase
    .from("receipts")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!receipt) {
    return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
  }

  const oneHourAgo = new Date(Date.now() - 3_600_000).toISOString();
  const { count: recent } = await supabase
    .from("receipts")
    .select("id", { count: "exact", head: true })
    .gte("processed_at", oneHourAgo);

  if ((recent ?? 0) >= MAX_PER_HOUR) {
    return NextResponse.json(
      { error: "That's a lot of receipts in one hour. Try again shortly." },
      { status: 429 },
    );
  }

  await supabase
    .from("receipts")
    .update({ status: "processing", error_message: null })
    .eq("id", id);

  try {
    const { data: file, error: downloadError } = await supabase.storage
      .from("receipts")
      .download(receipt.storage_path);

    if (downloadError || !file) {
      throw new Error("The uploaded file couldn't be read back from storage.");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const extraction = await extractReceipt(buffer, receipt.mime_type);
    const parsed = extraction.data;

    const storeId = await resolveStore(supabase, user.id, parsed.store_name);
    const resolver = await loadResolver(supabase, user.id);

    const purchaseDate = /^\d{4}-\d{2}-\d{2}$/.test(parsed.purchase_date)
      ? parsed.purchase_date
      : null;

    await supabase
      .from("receipts")
      .update({
        store_id: storeId,
        purchase_date: purchaseDate,
        subtotal_minor: parseMoneyToMinor(parsed.subtotal),
        tax_minor: parseMoneyToMinor(parsed.tax),
        total_minor: parseMoneyToMinor(parsed.total),
        currency: parsed.currency?.toUpperCase() || receipt.currency,
        status: "needs_review",
        ocr_model: extraction.model,
        ocr_raw: parsed as unknown as Json,
        ocr_confidence: parsed.confidence,
        processed_at: new Date().toISOString(),
        error_message: null,
      })
      .eq("id", id);

    // A duplicate is worth a warning, not a block: two identical shops on the
    // same day genuinely happen.
    let duplicateOf: string | null = null;
    if (purchaseDate && parsed.total) {
      const totalMinor = parseMoneyToMinor(parsed.total);
      if (totalMinor) {
        const { data: existing } = await supabase
          .from("transactions")
          .select("id")
          .eq("purchase_date", purchaseDate)
          .eq("total_minor", totalMinor)
          .neq("receipt_id", id)
          .limit(1)
          .maybeSingle();
        duplicateOf = existing?.id ?? null;
      }
    }

    const items = parsed.items.map((item, index) => {
      const totalMinor = parseMoneyToMinor(item.total_price);
      const unitMinor = parseMoneyToMinor(item.unit_price);
      const quantity = item.quantity > 0 ? item.quantity : 1;
      const resolution = resolver.resolve(
        item.name || item.raw_text,
        item.category_slug,
        item.confidence,
      );

      return {
        position: index,
        rawText: item.raw_text,
        name: item.name || item.raw_text,
        quantity,
        unit: item.unit || null,
        unitPriceMinor: unitMinor,
        totalPriceMinor:
          totalMinor ?? lineTotalMinor(unitMinor, quantity) ?? 0,
        categoryId: resolution.categoryId,
        categorySource: resolution.source,
        aiCategorySlug: item.category_slug,
        confidence: item.confidence,
        // Anything the model was unsure about, or that has no price, gets
        // flagged so the reviewer's eye goes straight to it.
        needsAttention: item.confidence < 0.7 || totalMinor === null,
      };
    });

    return NextResponse.json({
      ok: true,
      receiptId: id,
      duplicateOf,
      itemCount: items.length,
      items,
      lowConfidenceCount: items.filter((i) => i.needsAttention).length,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Something went wrong reading this receipt.";

    await supabase
      .from("receipts")
      .update({
        status: "failed",
        error_message: message,
        processed_at: new Date().toISOString(),
      })
      .eq("id", id);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
