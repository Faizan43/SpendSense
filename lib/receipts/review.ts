import "server-only";

import type { EditorItem } from "@/components/expenses/expense-editor";
import { receiptExtractionSchema } from "@/lib/anthropic/receipt-schema";
import type { Resolver } from "@/lib/categorize/resolve";
import { lineTotalMinor, minorToInput, parseMoneyToMinor } from "@/lib/money";
import type { Json } from "@/lib/types/database";

/**
 * Rebuilds the review grid from the stored extraction rather than from the
 * response of the call that produced it, so a refresh, a shared link or a
 * revisit tomorrow all show the same thing.
 */
export function extractionToEditorItems(
  ocrRaw: Json | null,
  resolver: Resolver,
): EditorItem[] {
  const parsed = receiptExtractionSchema.safeParse(ocrRaw);
  if (!parsed.success) return [];

  return parsed.data.items.map((item, index) => {
    const totalMinor = parseMoneyToMinor(item.total_price);
    const unitMinor = parseMoneyToMinor(item.unit_price);
    const quantity = item.quantity > 0 ? item.quantity : 1;
    const name = item.name || item.raw_text;
    const resolution = resolver.resolve(name, item.category_slug, item.confidence);
    const resolvedTotal = totalMinor ?? lineTotalMinor(unitMinor, quantity);

    return {
      key: `ocr-${index}`,
      name,
      rawText: item.raw_text || null,
      categoryId: resolution.categoryId,
      quantity: String(quantity),
      unit: item.unit ?? "",
      unitPrice: unitMinor != null ? minorToInput(unitMinor) : "",
      totalPrice: resolvedTotal != null ? minorToInput(resolvedTotal) : "",
      notes: "",
      aiCategorySlug: item.category_slug,
      aiConfidence: item.confidence,
      // Amber-flag anything the model hedged on, or any line with no price:
      // those are exactly the rows worth a human glance.
      needsAttention: item.confidence < 0.7 || resolvedTotal === null,
    };
  });
}
