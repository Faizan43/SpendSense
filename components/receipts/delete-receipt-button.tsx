"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { deleteReceipt } from "@/app/(app)/receipts/actions";
import { useConfirm } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";

export function DeleteReceiptButton({ id }: { id: string }) {
  const router = useRouter();
  const confirm = useConfirm();

  function handleClick() {
    confirm({
      title: "Delete this receipt?",
      description:
        "The image is deleted too. Any shop you already saved from it stays — delete that separately if you want it gone.",
      confirmLabel: "Delete",
      variant: "destructive",
      onConfirm: async () => {
        const result = await deleteReceipt(id);
        if (!result.ok) {
          toast.error(result.error);
          return false;
        }
        toast.success("Receipt deleted");
        router.refresh();
        return true;
      },
    });
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="Delete receipt"
      onClick={handleClick}
    >
      <Trash2 className="size-3.5" />
    </Button>
  );
}
