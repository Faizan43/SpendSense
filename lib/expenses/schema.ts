import { z } from "zod";

/**
 * One shared shape for every path that writes a shopping trip: the manual
 * form, the bulk grid, the CSV import and the receipt review screen. They
 * differ in how the values are gathered, not in what a valid trip is.
 */
export const expenseItemSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, "Every item needs a name").max(200),
  rawText: z.string().trim().max(400).nullable().optional(),
  categoryId: z.string().uuid().nullable().optional(),
  quantity: z.coerce
    .number()
    .positive("Quantity must be more than zero")
    .max(100000)
    .default(1),
  unit: z.string().trim().max(16).nullable().optional(),
  unitPriceMinor: z.number().int().nullable().optional(),
  totalPriceMinor: z.number().int("Amounts are whole pence"),
  notes: z.string().trim().max(500).nullable().optional(),
  /** Only set on the receipt path, so a user's choice isn't overwritten. */
  aiCategorySlug: z.string().trim().max(64).nullable().optional(),
  aiConfidence: z.number().min(0).max(1).nullable().optional(),
  /** True when a human picked this category on screen. */
  categoryChosenByUser: z.boolean().optional(),
});

export const expenseTransactionSchema = z.object({
  id: z.string().uuid().optional(),
  storeId: z.string().uuid().nullable().optional(),
  storeName: z.string().trim().max(120).nullable().optional(),
  purchaseDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a purchase date"),
  notes: z.string().trim().max(1000).nullable().optional(),
  source: z.enum(["receipt", "manual", "import"]).default("manual"),
  receiptId: z.string().uuid().nullable().optional(),
  items: z
    .array(expenseItemSchema)
    .min(1, "Add at least one item")
    .max(300, "That's more items than a single trip can hold"),
});

export type ExpenseItemInput = z.input<typeof expenseItemSchema>;
export type ExpenseItem = z.output<typeof expenseItemSchema>;
export type ExpenseTransactionInput = z.input<typeof expenseTransactionSchema>;
export type ExpenseTransaction = z.output<typeof expenseTransactionSchema>;

export type SaveResult =
  | { ok: true; transactionId: string }
  | { ok: false; error: string };
