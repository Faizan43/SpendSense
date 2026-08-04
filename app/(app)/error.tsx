"use client";

import { RefreshCw, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const looksLikeConfig = /supabase|environment variable|fetch failed/i.test(
    error.message,
  );

  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed px-6 py-16 text-center">
      <span className="bg-destructive/10 text-destructive flex size-11 items-center justify-center rounded-full">
        <TriangleAlert className="size-5" />
      </span>
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">That page didn&apos;t load</h1>
        <p className="text-muted-foreground mx-auto max-w-md text-sm">
          {looksLikeConfig
            ? "This usually means the Supabase environment variables are missing or wrong. Check .env.local against .env.example."
            : "Something went wrong on our side. Trying again often clears it."}
        </p>
        {error.digest ? (
          <p className="text-muted-foreground text-xs">
            Reference: {error.digest}
          </p>
        ) : null}
      </div>
      <div className="flex gap-2">
        <Button onClick={reset}>
          <RefreshCw className="size-4" /> Try again
        </Button>
        <Button variant="outline" render={<Link href="/dashboard" />}>
          Back to the dashboard
        </Button>
      </div>
    </div>
  );
}
