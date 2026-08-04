"use client";

import {
  CheckCircle2,
  FileText,
  ImageIcon,
  Loader2,
  TriangleAlert,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { createReceiptRecord } from "@/app/(app)/receipts/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_BYTES = 10 * 1024 * 1024;

type Stage = "uploading" | "reading" | "ready" | "error";

type Job = {
  key: string;
  fileName: string;
  isPdf: boolean;
  stage: Stage;
  message?: string;
  receiptId?: string;
  itemCount?: number;
  lowConfidenceCount?: number;
};

function safeFileName(name: string): string {
  return name.replace(/[^\w.-]+/g, "_").slice(-80) || "receipt";
}

export function ReceiptUploader({
  userId,
  extractionEnabled,
}: {
  userId: string;
  extractionEnabled: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [dragging, setDragging] = useState(false);

  function update(key: string, changes: Partial<Job>) {
    setJobs((current) =>
      current.map((job) => (job.key === key ? { ...job, ...changes } : job)),
    );
  }

  async function processFile(file: File) {
    const key = `${file.name}-${file.size}-${Date.now()}-${Math.random()}`;
    const isPdf = file.type === "application/pdf";

    setJobs((current) => [
      ...current,
      { key, fileName: file.name, isPdf, stage: "uploading" },
    ]);

    if (!ACCEPTED.includes(file.type)) {
      update(key, {
        stage: "error",
        message: "Only JPG, PNG, WebP and PDF files can be read.",
      });
      return;
    }
    if (file.size > MAX_BYTES) {
      update(key, {
        stage: "error",
        message: "That file is over 10 MB. Try a smaller photo.",
      });
      return;
    }

    const supabase = createClient();
    const path = `${userId}/${crypto.randomUUID()}/${safeFileName(file.name)}`;

    const { error: uploadError } = await supabase.storage
      .from("receipts")
      .upload(path, file, { contentType: file.type, upsert: false });

    if (uploadError) {
      update(key, { stage: "error", message: uploadError.message });
      return;
    }

    const record = await createReceiptRecord({
      storagePath: path,
      mimeType: file.type,
      originalFilename: file.name,
      fileSizeBytes: file.size,
    });

    if (!record.ok) {
      update(key, { stage: "error", message: record.error });
      return;
    }

    if (!extractionEnabled) {
      update(key, {
        stage: "ready",
        receiptId: record.receiptId,
        message: "Uploaded. Add the items by hand — reading is switched off.",
      });
      router.refresh();
      return;
    }

    update(key, { stage: "reading", receiptId: record.receiptId });

    try {
      const response = await fetch(`/api/receipts/${record.receiptId}/process`, {
        method: "POST",
      });
      const payload = await response.json();

      if (!response.ok) {
        update(key, {
          stage: "error",
          message: payload.error ?? "That receipt couldn't be read.",
          receiptId: record.receiptId,
        });
        return;
      }

      update(key, {
        stage: "ready",
        receiptId: record.receiptId,
        itemCount: payload.itemCount,
        lowConfidenceCount: payload.lowConfidenceCount,
      });
      router.refresh();
    } catch {
      update(key, {
        stage: "error",
        message: "The network dropped while reading that receipt.",
        receiptId: record.receiptId,
      });
    }
  }

  function handleFiles(files: FileList | null) {
    if (!files) return;
    for (const file of Array.from(files)) void processFile(file);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              handleFiles(e.dataTransfer.files);
            }}
            className={cn(
              "flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-12 text-center transition-colors",
              dragging && "border-primary bg-accent/50",
            )}
          >
            <span className="bg-muted text-muted-foreground flex size-11 items-center justify-center rounded-full">
              <Upload className="size-5" />
            </span>
            <div className="space-y-1">
              <p className="font-medium">Drop receipts here</p>
              <p className="text-muted-foreground text-sm">
                JPG, PNG or PDF, up to 10 MB each. Several at once is fine.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <Button type="button" onClick={() => inputRef.current?.click()}>
                Choose files
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (inputRef.current) {
                    inputRef.current.setAttribute("capture", "environment");
                    inputRef.current.click();
                  }
                }}
                className="sm:hidden"
              >
                Take a photo
              </Button>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED.join(",")}
              multiple
              className="sr-only"
              onChange={(e) => {
                handleFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>
        </CardContent>
      </Card>

      {jobs.length > 0 ? (
        <ul className="space-y-2">
          {jobs.map((job) => (
            <li
              key={job.key}
              className="flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm"
            >
              <span className="text-muted-foreground">
                {job.isPdf ? (
                  <FileText className="size-4" />
                ) : (
                  <ImageIcon className="size-4" />
                )}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">
                  {job.fileName}
                </span>
                <span className="text-muted-foreground block text-xs">
                  {job.stage === "uploading" && "Uploading…"}
                  {job.stage === "reading" && "Reading the receipt…"}
                  {job.stage === "ready" &&
                    (job.message ??
                      `${job.itemCount ?? 0} items found${
                        job.lowConfidenceCount
                          ? `, ${job.lowConfidenceCount} to check`
                          : ""
                      }`)}
                  {job.stage === "error" && job.message}
                </span>
              </span>

              {job.stage === "uploading" || job.stage === "reading" ? (
                <Loader2 className="text-muted-foreground size-4 animate-spin" />
              ) : job.stage === "ready" ? (
                <>
                  <CheckCircle2 className="text-success size-4" />
                  <Button
                    size="sm"
                    render={
                      <Link href={`/receipts/${job.receiptId}/review`} />
                    }
                  >
                    Review
                  </Button>
                </>
              ) : (
                <>
                  <TriangleAlert className="text-destructive size-4" />
                  {job.receiptId ? (
                    <Button
                      size="sm"
                      variant="outline"
                      render={
                        <Link href={`/receipts/${job.receiptId}/review`} />
                      }
                    >
                      Enter by hand
                    </Button>
                  ) : null}
                </>
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
