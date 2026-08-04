"use client";

import { Check, Loader2, Merge, Pencil, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { deleteStore, mergeStores, renameStore } from "@/app/(app)/stores/actions";
import { useMoney } from "@/components/money-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";

export type StoreRowView = {
  id: string;
  name: string;
  totalMinor: number;
  tripCount: number;
  avgTripMinor: number;
  itemCount: number;
};

export function StoreTable({ stores }: { stores: StoreRowView[] }) {
  const router = useRouter();
  const { format } = useMoney();
  const [pending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [merge, setMerge] = useState<{
    open: boolean;
    sourceId?: string;
    sourceName?: string;
    targetId: string;
  }>({ open: false, targetId: "" });

  function run(action: () => Promise<{ ok: boolean; error?: string }>, message: string) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(result.error ?? "That didn't work.");
        return;
      }
      toast.success(message);
      setEditingId(null);
      setMerge({ open: false, targetId: "" });
      router.refresh();
    });
  }

  return (
    <>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[680px] text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:font-medium">
              <th className="text-left">Store</th>
              <th className="text-right">Trips</th>
              <th className="text-right">Items</th>
              <th className="text-right">Average basket</th>
              <th className="text-right">Total spent</th>
              <th className="w-28" />
            </tr>
          </thead>
          <tbody>
            {stores.map((store) => (
              <tr key={store.id} className="border-t">
                <td className="px-3 py-2">
                  {editingId === store.id ? (
                    <div className="flex items-center gap-1">
                      <Input
                        autoFocus
                        value={draftName}
                        aria-label={`Rename ${store.name}`}
                        onChange={(e) => setDraftName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter")
                            run(
                              () => renameStore(store.id, draftName),
                              "Store renamed",
                            );
                          if (e.key === "Escape") setEditingId(null);
                        }}
                      />
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label="Save name"
                        onClick={() =>
                          run(() => renameStore(store.id, draftName), "Store renamed")
                        }
                      >
                        <Check className="size-3.5" />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label="Cancel"
                        onClick={() => setEditingId(null)}
                      >
                        <X className="size-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <span className="font-medium">{store.name}</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {store.tripCount}
                </td>
                <td className="text-muted-foreground px-3 py-2 text-right tabular-nums">
                  {store.itemCount}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {format(store.avgTripMinor)}
                </td>
                <td className="px-3 py-2 text-right font-medium tabular-nums">
                  {format(store.totalMinor)}
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Rename ${store.name}`}
                    onClick={() => {
                      setEditingId(store.id);
                      setDraftName(store.name);
                    }}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Merge ${store.name} into another store`}
                    onClick={() =>
                      setMerge({
                        open: true,
                        sourceId: store.id,
                        sourceName: store.name,
                        targetId: stores.find((s) => s.id !== store.id)?.id ?? "",
                      })
                    }
                  >
                    <Merge className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Delete ${store.name}`}
                    disabled={pending}
                    onClick={() => run(() => deleteStore(store.id), "Store deleted")}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog
        open={merge.open}
        onOpenChange={(open) => setMerge((m) => ({ ...m, open }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Merge {merge.sourceName}</DialogTitle>
            <DialogDescription>
              Every shop and receipt recorded against it moves across. Your
              totals don&apos;t change.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor="merge-store-target">Move everything into</Label>
            <NativeSelect
              id="merge-store-target"
              value={merge.targetId}
              onChange={(e) => setMerge((m) => ({ ...m, targetId: e.target.value }))}
            >
              {stores
                .filter((s) => s.id !== merge.sourceId)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </NativeSelect>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setMerge({ open: false, targetId: "" })}
            >
              Cancel
            </Button>
            <Button
              disabled={pending || !merge.sourceId || !merge.targetId}
              onClick={() =>
                run(
                  () => mergeStores(merge.sourceId!, merge.targetId),
                  "Stores merged",
                )
              }
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Merge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
