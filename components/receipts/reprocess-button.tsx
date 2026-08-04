"use client";

import { Loader2, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function ReprocessButton({ receiptId }: { receiptId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function run() {
    setPending(true);
    try {
      const response = await fetch(`/api/receipts/${receiptId}/process`, {
        method: "POST",
      });
      const payload = await response.json();

      if (!response.ok) {
        toast.error(payload.error ?? "That receipt still couldn't be read.");
        return;
      }

      toast.success(
        `Read again — ${payload.itemCount} items found.`,
      );
      router.refresh();
    } catch {
      toast.error("The network dropped while reading that receipt.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Button variant="outline" onClick={run} disabled={pending}>
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <RefreshCw className="size-4" />
      )}
      Read it again
    </Button>
  );
}
