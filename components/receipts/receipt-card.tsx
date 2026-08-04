"use client";

import {
  CheckCircle2,
  Clock,
  FileText,
  ImageIcon,
  Loader2,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";

import { DeleteReceiptButton } from "@/components/receipts/delete-receipt-button";
import { useMoney } from "@/components/money-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatRelativeTime } from "@/lib/date";
import type { ReceiptStatus } from "@/lib/types/database";

const STATUS: Record<
  ReceiptStatus,
  { label: string; icon: typeof Clock; variant: "secondary" | "destructive" | "default" }
> = {
  uploaded: { label: "Uploaded", icon: Clock, variant: "secondary" },
  processing: { label: "Reading…", icon: Loader2, variant: "secondary" },
  needs_review: { label: "Needs review", icon: Clock, variant: "default" },
  confirmed: { label: "Saved", icon: CheckCircle2, variant: "secondary" },
  failed: { label: "Failed", icon: TriangleAlert, variant: "destructive" },
};

export function ReceiptCard({
  id,
  status,
  storeName,
  purchaseDate,
  totalMinor,
  fileName,
  isPdf,
  createdAt,
  errorMessage,
}: {
  id: string;
  status: ReceiptStatus;
  storeName: string | null;
  purchaseDate: string | null;
  totalMinor: number | null;
  fileName: string | null;
  isPdf: boolean;
  createdAt: string;
  errorMessage: string | null;
}) {
  const { format } = useMoney();
  const meta = STATUS[status];
  const StatusIcon = meta.icon;

  return (
    <li className="hover:border-foreground/20 flex flex-col gap-3 rounded-xl border p-3 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium">
            {storeName ?? fileName ?? "Untitled receipt"}
          </p>
          <p className="text-muted-foreground text-xs">
            {purchaseDate
              ? formatDate(purchaseDate)
              : `Uploaded ${formatRelativeTime(createdAt)}`}
          </p>
        </div>
        <Badge variant={meta.variant} className="shrink-0 gap-1">
          <StatusIcon
            className={`size-3 ${status === "processing" ? "animate-spin" : ""}`}
          />
          {meta.label}
        </Badge>
      </div>

      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        {isPdf ? <FileText className="size-4" /> : <ImageIcon className="size-4" />}
        <span className="truncate">{fileName ?? "receipt"}</span>
        {totalMinor != null ? (
          <span className="text-foreground ml-auto font-medium tabular-nums">
            {format(totalMinor)}
          </span>
        ) : null}
      </div>

      {status === "failed" && errorMessage ? (
        <p className="text-destructive line-clamp-2 text-xs">{errorMessage}</p>
      ) : null}

      <div className="mt-auto flex items-center gap-2">
        <Button
          size="sm"
          variant={status === "needs_review" ? "default" : "outline"}
          className="flex-1"
          render={<Link href={`/receipts/${id}/review`} />}
        >
          {status === "confirmed" ? "View" : "Review"}
        </Button>
        <DeleteReceiptButton id={id} />
      </div>
    </li>
  );
}
