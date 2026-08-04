import { Upload } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { ReceiptCard } from "@/components/receipts/receipt-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import type { SearchParams } from "@/lib/filters";
import { createClient } from "@/lib/supabase/server";
import type { ReceiptStatus } from "@/lib/types/database";

export const metadata: Metadata = { title: "Receipts" };

const STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: "", label: "All receipts" },
  { value: "needs_review", label: "Needs review" },
  { value: "confirmed", label: "Saved" },
  { value: "failed", label: "Failed" },
];

export default async function ReceiptsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const status = typeof params.status === "string" ? params.status : "";

  const supabase = await createClient();

  let query = supabase
    .from("receipts")
    .select("*, stores(name)")
    .order("created_at", { ascending: false })
    .limit(120);

  if (status) query = query.eq("status", status as ReceiptStatus);

  const [{ data: receipts }, { count: needsReview }] = await Promise.all([
    query,
    supabase
      .from("receipts")
      .select("id", { count: "exact", head: true })
      .eq("status", "needs_review"),
  ]);

  const rows = receipts ?? [];

  return (
    <>
      <PageHeader
        title="Receipts"
        description="Everything you've uploaded, and what became of it."
        actions={
          <Button render={<Link href="/receipts/upload" />}>
            <Upload className="size-4" /> Upload
          </Button>
        }
      />

      {needsReview && !status ? (
        <Alert>
          <AlertTitle>
            {needsReview} {needsReview === 1 ? "receipt is" : "receipts are"}{" "}
            waiting to be checked
          </AlertTitle>
          <AlertDescription>
            Nothing counts towards your spending until you&apos;ve reviewed and
            saved it.
          </AlertDescription>
        </Alert>
      ) : null}

      <form className="flex items-end gap-2">
        <NativeSelect
          name="status"
          defaultValue={status}
          className="w-48"
          aria-label="Filter by status"
        >
          {STATUS_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </NativeSelect>
        <Button type="submit" variant="outline">
          Apply
        </Button>
      </form>

      {rows.length === 0 ? (
        <EmptyState
          icon="receipt-text"
          title={status ? "Nothing with that status" : "No receipts yet"}
          description={
            status
              ? "Try a different status filter."
              : "Photograph a receipt or drop in a PDF and every line gets read out for you."
          }
          action={
            <Button render={<Link href="/receipts/upload" />}>
              <Upload className="size-4" /> Upload a receipt
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((receipt) => {
            const storeRaw = receipt.stores;
            const store = Array.isArray(storeRaw) ? storeRaw[0] : storeRaw;
            return (
              <ReceiptCard
                key={receipt.id}
                id={receipt.id}
                status={receipt.status}
                storeName={store?.name ?? null}
                purchaseDate={receipt.purchase_date}
                totalMinor={receipt.total_minor}
                fileName={receipt.original_filename}
                isPdf={receipt.mime_type === "application/pdf"}
                createdAt={receipt.created_at}
                errorMessage={receipt.error_message}
              />
            );
          })}
        </ul>
      )}
    </>
  );
}
