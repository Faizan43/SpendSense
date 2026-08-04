"use client";

import { ArrowDown, ArrowUp, ChevronsUpDown, Loader2, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { deleteItems, updateItemsCategory } from "@/app/(app)/expenses/actions";
import { CategoryChip } from "@/components/category-chip";
import { useMoney } from "@/components/money-provider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { NativeSelect } from "@/components/ui/native-select";
import { formatDate } from "@/lib/date";
import type { SortKey } from "@/lib/filters";
import type { CategoryRow } from "@/lib/types/database";
import { cn } from "@/lib/utils";

export type ExpenseRow = {
  id: string;
  transactionId: string;
  name: string;
  notes: string | null;
  quantity: number;
  unit: string | null;
  unitPriceMinor: number | null;
  totalPriceMinor: number;
  purchaseDate: string;
  storeName: string | null;
  categoryId: string | null;
  categoryName: string;
  chartSlot: number;
  categorySource: string;
};

const COLUMNS: Array<{ key: SortKey; label: string; numeric?: boolean }> = [
  { key: "date", label: "Date" },
  { key: "name", label: "Item" },
  { key: "category", label: "Category" },
  { key: "store", label: "Store" },
  { key: "quantity", label: "Qty", numeric: true },
  { key: "unit_price", label: "Unit price", numeric: true },
  { key: "total", label: "Total", numeric: true },
];

export function ExpensesTable({
  rows,
  categories,
  total,
  page,
  pageCount,
  sortKey,
  ascending,
}: {
  rows: ExpenseRow[];
  categories: CategoryRow[];
  total: number;
  page: number;
  pageCount: number;
  sortKey: SortKey;
  ascending: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { format } = useMoney();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  function href(changes: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) next.delete(key);
      else next.set(key, value);
    }
    return `${pathname}${next.toString() ? `?${next}` : ""}`;
  }

  function sortHref(key: SortKey) {
    const nextAscending = key === sortKey ? !ascending : key !== "date";
    return href({ sort: key, dir: nextAscending ? "asc" : "desc", page: null });
  }

  const allSelected = rows.length > 0 && selected.size === rows.length;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)));
  }

  function toggleOne(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function applyCategory(categoryId: string) {
    if (!categoryId || selected.size === 0) return;
    startTransition(async () => {
      const result = await updateItemsCategory({
        itemIds: [...selected],
        categoryId,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        `Re-filed ${result.count} ${result.count === 1 ? "item" : "items"} — future shops will follow suit.`,
      );
      setSelected(new Set());
      router.refresh();
    });
  }

  function removeSelected() {
    if (selected.size === 0) return;
    startTransition(async () => {
      const result = await deleteItems([...selected]);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Deleted ${result.count} items`);
      setSelected(new Set());
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {selected.size > 0 ? (
        <div className="bg-accent text-accent-foreground flex flex-wrap items-center gap-3 rounded-lg px-3 py-2 text-sm">
          <span className="font-medium tabular-nums">
            {selected.size} selected
          </span>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Move to</span>
            <NativeSelect
              size="sm"
              className="w-44"
              aria-label="Move selected items to category"
              defaultValue=""
              disabled={pending}
              onChange={(e) => applyCategory(e.target.value)}
            >
              <option value="">Choose a category…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </NativeSelect>
          </div>
          <Button
            size="sm"
            variant="destructive"
            onClick={removeSelected}
            disabled={pending}
          >
            {pending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Trash2 className="size-3.5" />
            )}
            Delete
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
            Clear
          </Button>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="w-10 px-3 py-2">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleAll}
                  aria-label="Select all items on this page"
                />
              </th>
              {COLUMNS.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    "px-3 py-2 font-medium",
                    column.numeric ? "text-right" : "text-left",
                  )}
                >
                  <Link
                    href={sortHref(column.key)}
                    className="hover:text-foreground inline-flex items-center gap-1"
                    aria-label={`Sort by ${column.label}`}
                  >
                    {column.label}
                    {sortKey === column.key ? (
                      ascending ? (
                        <ArrowUp className="size-3" />
                      ) : (
                        <ArrowDown className="size-3" />
                      )
                    ) : (
                      <ChevronsUpDown className="size-3 opacity-40" />
                    )}
                  </Link>
                </th>
              ))}
              <th className="w-10 px-3 py-2">
                <span className="sr-only">Edit</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className={cn(
                  "hover:bg-muted/40 border-t",
                  selected.has(row.id) && "bg-accent/40",
                )}
              >
                <td className="px-3 py-2">
                  <Checkbox
                    checked={selected.has(row.id)}
                    onCheckedChange={() => toggleOne(row.id)}
                    aria-label={`Select ${row.name}`}
                  />
                </td>
                <td className="text-muted-foreground px-3 py-2 whitespace-nowrap">
                  {formatDate(row.purchaseDate)}
                </td>
                <td className="max-w-[22ch] px-3 py-2">
                  <span className="block truncate font-medium">{row.name}</span>
                  {row.notes ? (
                    <span className="text-muted-foreground block truncate text-xs">
                      {row.notes}
                    </span>
                  ) : null}
                </td>
                <td className="px-3 py-2">
                  <CategoryChip
                    name={row.categoryName}
                    chartSlot={row.chartSlot}
                  />
                </td>
                <td className="text-muted-foreground max-w-[16ch] truncate px-3 py-2">
                  {row.storeName ?? "—"}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {row.quantity}
                  {row.unit ? (
                    <span className="text-muted-foreground"> {row.unit}</span>
                  ) : null}
                </td>
                <td className="text-muted-foreground px-3 py-2 text-right tabular-nums">
                  {row.unitPriceMinor != null ? format(row.unitPriceMinor) : "—"}
                </td>
                <td className="px-3 py-2 text-right font-medium tabular-nums">
                  {format(row.totalPriceMinor)}
                </td>
                <td className="px-3 py-2">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    render={
                      <Link
                        href={`/expenses/${row.transactionId}`}
                        aria-label={`Edit the shop containing ${row.name}`}
                      />
                    }
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm tabular-nums">
          {total.toLocaleString()} items · page {page} of {pageCount}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            render={
              <Link
                href={href({ page: page > 2 ? String(page - 1) : null })}
                aria-disabled={page <= 1}
              />
            }
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pageCount}
            render={
              <Link
                href={href({ page: String(page + 1) })}
                aria-disabled={page >= pageCount}
              />
            }
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
