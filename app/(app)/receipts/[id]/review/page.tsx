import { TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getReceiptImageUrl } from "@/app/(app)/receipts/actions";
import {
  ExpenseEditor,
  blankItem,
  type EditorItem,
} from "@/components/expenses/expense-editor";
import { PageHeader } from "@/components/layout/page-header";
import { ReceiptViewer } from "@/components/receipts/receipt-viewer";
import { ReprocessButton } from "@/components/receipts/reprocess-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { loadResolver } from "@/lib/categorize/server";
import { todayString } from "@/lib/date";
import { getProductSuggestions } from "@/lib/expenses/queries";
import { getCategories, getStores } from "@/lib/profile";
import { extractionToEditorItems } from "@/lib/receipts/review";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Review receipt" };

export default async function ReviewReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: receipt } = await supabase
    .from("receipts")
    .select("*, stores(id, name)")
    .eq("id", id)
    .maybeSingle();

  if (!receipt) notFound();

  const [categories, stores, suggestions, resolver, imageUrl] =
    await Promise.all([
      getCategories(),
      getStores(),
      getProductSuggestions(),
      loadResolver(supabase, user.id),
      getReceiptImageUrl(receipt.storage_path),
    ]);

  const extracted = extractionToEditorItems(receipt.ocr_raw, resolver);
  const items: EditorItem[] = extracted.length > 0 ? extracted : [blankItem()];
  const flagged = extracted.filter((i) => i.needsAttention).length;

  const storeRaw = receipt.stores;
  const store = Array.isArray(storeRaw) ? storeRaw[0] : storeRaw;

  return (
    <>
      <PageHeader
        title="Check the receipt"
        description="Nothing is counted until you save. Amber rows are the ones worth a second look."
        actions={
          <>
            {receipt.ocr_confidence != null ? (
              <Badge variant="secondary">
                {Math.round(receipt.ocr_confidence * 100)}% confident
              </Badge>
            ) : null}
            <ReprocessButton receiptId={id} />
          </>
        }
      />

      {receipt.status === "failed" ? (
        <Alert variant="destructive">
          <TriangleAlert className="size-4" />
          <AlertTitle>That receipt couldn&apos;t be read</AlertTitle>
          <AlertDescription>
            {receipt.error_message ??
              "Something went wrong reading the file."}{" "}
            You can retry, or just type the items in below.
          </AlertDescription>
        </Alert>
      ) : null}

      {receipt.status === "confirmed" ? (
        <Alert>
          <TriangleAlert className="size-4" />
          <AlertTitle>Already saved</AlertTitle>
          <AlertDescription>
            This receipt has been turned into a shop. Saving again will create a
            second copy —{" "}
            <Link className="underline" href="/expenses">
              edit the existing one
            </Link>{" "}
            instead.
          </AlertDescription>
        </Alert>
      ) : null}

      {flagged > 0 ? (
        <p className="text-muted-foreground text-sm">
          {flagged} of {extracted.length} lines were uncertain — they&apos;re
          highlighted below.
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
        <div className="lg:sticky lg:top-20 lg:self-start">
          <ReceiptViewer
            url={imageUrl}
            isPdf={receipt.mime_type === "application/pdf"}
            fileName={receipt.original_filename}
          />
        </div>

        <ExpenseEditor
          categories={categories}
          stores={stores.map((s) => ({ id: s.id, name: s.name }))}
          suggestions={suggestions}
          receiptId={id}
          source="receipt"
          compact
          printedTotalMinor={receipt.total_minor}
          initial={{
            storeId: receipt.store_id,
            storeName: store?.name ?? null,
            purchaseDate: receipt.purchase_date ?? todayString(),
            items,
          }}
          submitLabel="Save this shop"
          redirectTo="/receipts"
        />
      </div>
    </>
  );
}
