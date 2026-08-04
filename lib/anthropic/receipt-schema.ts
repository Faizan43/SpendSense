import { z } from "zod";

import { CATEGORY_SLUGS } from "@/lib/categories";

/**
 * JSON Schema handed to the Messages API as `output_config.format`, so the
 * response is guaranteed to parse. Amounts come back as strings ("12.34")
 * rather than numbers — a JSON float would silently round 0.1 + 0.2, and we
 * convert to integer pence ourselves anyway.
 *
 * Unknown values are the empty string rather than null: structured outputs are
 * stricter about unions than about sentinel values, and "" is unambiguous for
 * money and dates.
 */
export const RECEIPT_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "store_name",
    "purchase_date",
    "currency",
    "subtotal",
    "tax",
    "total",
    "confidence",
    "items",
  ],
  properties: {
    store_name: {
      type: "string",
      description:
        "The shop's name as printed, without branch numbers. Empty string if unreadable.",
    },
    purchase_date: {
      type: "string",
      description:
        "Date of purchase as YYYY-MM-DD. Empty string if not printed or unreadable.",
    },
    currency: {
      type: "string",
      description: "ISO 4217 code, e.g. GBP. Empty string if not shown.",
    },
    subtotal: {
      type: "string",
      description: "Subtotal before tax, as a plain decimal. Empty if absent.",
    },
    tax: {
      type: "string",
      description: "Tax or VAT total, as a plain decimal. Empty if absent.",
    },
    total: {
      type: "string",
      description: "Grand total actually paid, as a plain decimal.",
    },
    confidence: {
      type: "number",
      description:
        "0-1 confidence in the extraction as a whole. Be honest: low for creased, cropped or faded receipts.",
    },
    items: {
      type: "array",
      description: "One entry per purchased line. Skip subtotals and headings.",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "raw_text",
          "name",
          "quantity",
          "unit",
          "unit_price",
          "total_price",
          "category_slug",
          "confidence",
        ],
        properties: {
          raw_text: {
            type: "string",
            description: "The line exactly as printed, for the review screen.",
          },
          name: {
            type: "string",
            description:
              "A readable product name. Expand obvious abbreviations (SEMI SKIM MLK -> Semi-skimmed milk).",
          },
          quantity: {
            type: "number",
            description: "Units or weight bought. 1 when not stated.",
          },
          unit: {
            type: "string",
            description: "kg, g, l, ml, pack — empty if the line is a count.",
          },
          unit_price: {
            type: "string",
            description: "Price per unit as a plain decimal. Empty if not printed.",
          },
          total_price: {
            type: "string",
            description:
              "What this line cost, as a plain decimal. Negative for discounts.",
          },
          category_slug: {
            type: "string",
            enum: [...CATEGORY_SLUGS],
            description: "Best-fit category for this item.",
          },
          confidence: {
            type: "number",
            description: "0-1 confidence in this individual line.",
          },
        },
      },
    },
  },
} as const;

/** Runtime guard for the model's response, independent of the schema. */
export const receiptExtractionSchema = z.object({
  store_name: z.string(),
  purchase_date: z.string(),
  currency: z.string(),
  subtotal: z.string(),
  tax: z.string(),
  total: z.string(),
  confidence: z.number().min(0).max(1).catch(0.5),
  items: z.array(
    z.object({
      raw_text: z.string(),
      name: z.string(),
      quantity: z.number().positive().catch(1),
      unit: z.string(),
      unit_price: z.string(),
      total_price: z.string(),
      category_slug: z.string(),
      confidence: z.number().min(0).max(1).catch(0.5),
    }),
  ),
});

export type ReceiptExtraction = z.infer<typeof receiptExtractionSchema>;

export const EXTRACTION_PROMPT = `You are reading a receipt so it can be turned into an expense record.

Rules:
- Transcribe every purchased line item. Skip headings, subtotals, VAT summary lines, loyalty points, and payment method lines.
- A discount or voucher line that reduces the bill is an item with a negative total_price.
- Expand shorthand into a readable product name, but keep the original text in raw_text.
- When a line shows "2 @ 1.25" style pricing, quantity is 2 and unit_price is 1.25.
- If a line shows only a total, leave unit_price empty rather than guessing.
- purchase_date must be the date of the transaction, not a "best before" or a printed offer expiry.
- Choose the category that matches the product itself. Chocolate is snacks; hot chocolate powder is beverages; frozen peas are frozen, not fruit and vegetables.
- Set a low confidence on any line you had to guess at. The person will review anything you flag, so an honest low score is more useful than a confident wrong answer.

Return only the structured object.`;
