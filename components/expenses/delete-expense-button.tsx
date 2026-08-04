"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { deleteExpense } from "@/app/(app)/expenses/actions";
import { useConfirm } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";

export function DeleteExpenseButton({ id }: { id: string }) {
  const router = useRouter();
  const confirm = useConfirm();

  function handleClick() {
    confirm({
      title: "Delete this shop?",
      description:
        "Every item in it goes too, and your totals and budgets will update. This can't be undone.",
      confirmLabel: "Delete",
      variant: "destructive",
      onConfirm: async () => {
        const result = await deleteExpense(id);
        if (!result.ok) {
          toast.error(result.error);
          return false;
        }
        toast.success("Shop deleted");
        router.push("/expenses");
        router.refresh();
        return true;
      },
    });
  }

  return (
    <Button variant="destructive" onClick={handleClick}>
      <Trash2 className="size-4" /> Delete shop
    </Button>
  );
}
