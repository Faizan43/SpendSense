import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DeleteExpenseButton } from "@/components/expenses/delete-expense-button";
import { ExpenseEditor, type EditorItem } from "@/components/expenses/expense-editor";
import { PageHeader } from "@/components/layout/page-header";
import { minorToInput } from "@/lib/money";
import { getProductSuggestions, getTransactionWithItems } from "@/lib/expenses/queries";
import { getCategories, getStores } from "@/lib/profile";

export const metadata: Metadata = { title: "Edit shop" };

export default async function EditExpensePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const record = await getTransactionWithItems(id);
  if (!record) notFound();

  const [categories, stores, suggestions] = await Promise.all([
    getCategories(),
    getStores(),
    getProductSuggestions(),
  ]);

  const storeRaw = record.transaction.stores;
  const store = Array.isArray(storeRaw) ? storeRaw[0] : storeRaw;

  const items: EditorItem[] = record.items.map((item, index) => ({
    key: `item-${item.id}-${index}`,
    id: item.id,
    name: item.name,
    rawText: item.raw_text,
    categoryId: item.category_id,
    quantity: String(item.quantity),
    unit: item.unit ?? "",
    unitPrice:
      item.unit_price_minor != null ? minorToInput(item.unit_price_minor) : "",
    totalPrice: minorToInput(item.total_price_minor),
    notes: item.notes ?? "",
  }));

  return (
    <>
      <PageHeader
        title="Edit shop"
        description="Change anything here and the dashboard follows immediately."
        actions={<DeleteExpenseButton id={id} />}
      />

      <ExpenseEditor
        categories={categories}
        stores={stores.map((s) => ({ id: s.id, name: s.name }))}
        suggestions={suggestions}
        initial={{
          id: record.transaction.id,
          storeId: record.transaction.store_id,
          storeName: store?.name ?? null,
          purchaseDate: record.transaction.purchase_date,
          notes: record.transaction.notes,
          items,
        }}
        source={record.transaction.source}
        receiptId={record.transaction.receipt_id}
        submitLabel="Save changes"
      />
    </>
  );
}
