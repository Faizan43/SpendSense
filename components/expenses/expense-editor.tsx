"use client";

import { Copy, Loader2, Plus, Trash2, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { saveExpense } from "@/app/(app)/expenses/actions";
import { useMoney } from "@/components/money-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { todayString } from "@/lib/date";
import {
  currencySymbol,
  lineTotalMinor,
  minorToInput,
  parseMoneyToMinor,
  unitPriceMinor as computeUnitPrice,
} from "@/lib/money";
import type { CategoryRow } from "@/lib/types/database";
import { cn } from "@/lib/utils";

export type EditorItem = {
  key: string;
  id?: string;
  name: string;
  rawText?: string | null;
  categoryId: string | null;
  quantity: string;
  unit: string;
  unitPrice: string;
  totalPrice: string;
  notes: string;
  aiCategorySlug?: string | null;
  aiConfidence?: number | null;
  categoryChosenByUser?: boolean;
  /** Renders the row amber: the extractor wasn't sure about this line. */
  needsAttention?: boolean;
};

export type ProductSuggestion = {
  name: string;
  categoryId: string | null;
  lastUnitPriceMinor: number | null;
  unit: string | null;
};

let keyCounter = 0;
const nextKey = () => `row-${++keyCounter}-${Date.now()}`;

export function blankItem(): EditorItem {
  return {
    key: nextKey(),
    name: "",
    categoryId: null,
    quantity: "1",
    unit: "",
    unitPrice: "",
    totalPrice: "",
    notes: "",
  };
}

export function ExpenseEditor({
  categories,
  stores,
  suggestions,
  initial,
  receiptId,
  source = "manual",
  printedTotalMinor,
  submitLabel = "Save shop",
  redirectTo = "/expenses",
  compact = false,
}: {
  categories: CategoryRow[];
  stores: Array<{ id: string; name: string }>;
  suggestions: ProductSuggestion[];
  initial?: {
    id?: string;
    storeId?: string | null;
    storeName?: string | null;
    purchaseDate?: string;
    notes?: string | null;
    items?: EditorItem[];
  };
  receiptId?: string | null;
  source?: "manual" | "receipt" | "import";
  /** The total printed on the receipt, if there is one, for reconciliation. */
  printedTotalMinor?: number | null;
  submitLabel?: string;
  redirectTo?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const { format, currency } = useMoney();
  const [pending, startTransition] = useTransition();

  const [storeName, setStoreName] = useState(initial?.storeName ?? "");
  const [purchaseDate, setPurchaseDate] = useState(
    initial?.purchaseDate ?? todayString(),
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [items, setItems] = useState<EditorItem[]>(
    initial?.items?.length ? initial.items : [blankItem()],
  );
  const [error, setError] = useState<string | null>(null);

  const suggestionByName = useMemo(() => {
    const map = new Map<string, ProductSuggestion>();
    for (const s of suggestions) map.set(s.name.toLowerCase(), s);
    return map;
  }, [suggestions]);

  const runningTotal = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + (parseMoneyToMinor(item.totalPrice) ?? 0),
        0,
      ),
    [items],
  );

  const totalGap =
    printedTotalMinor != null ? printedTotalMinor - runningTotal : null;

  function patch(key: string, changes: Partial<EditorItem>) {
    setItems((rows) =>
      rows.map((row) => (row.key === key ? { ...row, ...changes } : row)),
    );
  }

  /** Quantity × unit price fills the line total, unless the user typed one in. */
  function recalcFromUnit(key: string, next: Partial<EditorItem>) {
    setItems((rows) =>
      rows.map((row) => {
        if (row.key !== key) return row;
        const merged = { ...row, ...next };
        const unit = parseMoneyToMinor(merged.unitPrice);
        const qty = Number(merged.quantity);
        if (unit != null && Number.isFinite(qty) && qty > 0) {
          const total = lineTotalMinor(unit, qty);
          if (total != null) merged.totalPrice = minorToInput(total);
        }
        return merged;
      }),
    );
  }

  /** Typing a line total back-fills the unit price so price history still works. */
  function recalcFromTotal(key: string, value: string) {
    setItems((rows) =>
      rows.map((row) => {
        if (row.key !== key) return row;
        const merged = { ...row, totalPrice: value };
        const total = parseMoneyToMinor(value);
        const qty = Number(merged.quantity);
        if (total != null && Number.isFinite(qty) && qty > 0) {
          const unit = computeUnitPrice(total, qty);
          if (unit != null) merged.unitPrice = minorToInput(unit);
        }
        return merged;
      }),
    );
  }

  function applySuggestion(key: string, name: string) {
    const hit = suggestionByName.get(name.trim().toLowerCase());
    if (!hit) return patch(key, { name });
    recalcFromUnit(key, {
      name,
      categoryId: hit.categoryId,
      unit: hit.unit ?? "",
      unitPrice:
        hit.lastUnitPriceMinor != null
          ? minorToInput(hit.lastUnitPriceMinor)
          : "",
    });
  }

  function addRow() {
    setItems((rows) => [...rows, blankItem()]);
  }

  function duplicateRow(key: string) {
    setItems((rows) => {
      const index = rows.findIndex((r) => r.key === key);
      if (index < 0) return rows;
      const copy = { ...rows[index], key: nextKey(), id: undefined };
      return [...rows.slice(0, index + 1), copy, ...rows.slice(index + 1)];
    });
  }

  function removeRow(key: string) {
    setItems((rows) =>
      rows.length === 1 ? [blankItem()] : rows.filter((r) => r.key !== key),
    );
  }

  function addAdjustmentLine() {
    if (totalGap == null || totalGap === 0) return;
    setItems((rows) => [
      ...rows,
      {
        ...blankItem(),
        name: totalGap > 0 ? "Unlisted charge" : "Discount",
        totalPrice: minorToInput(totalGap),
        quantity: "1",
      },
    ]);
  }

  function handleSave() {
    setError(null);

    const filled = items.filter((item) => item.name.trim() !== "");
    if (filled.length === 0) {
      setError("Add at least one item before saving.");
      return;
    }

    const missingAmount = filled.find(
      (item) => parseMoneyToMinor(item.totalPrice) == null,
    );
    if (missingAmount) {
      setError(`"${missingAmount.name}" needs an amount.`);
      return;
    }

    startTransition(async () => {
      const result = await saveExpense({
        id: initial?.id,
        storeId: initial?.storeId ?? undefined,
        storeName: storeName.trim() || null,
        purchaseDate,
        notes: notes.trim() || null,
        source,
        receiptId: receiptId ?? undefined,
        items: filled.map((item) => ({
          id: item.id,
          name: item.name.trim(),
          rawText: item.rawText ?? null,
          categoryId: item.categoryId,
          quantity: Number(item.quantity) || 1,
          unit: item.unit.trim() || null,
          unitPriceMinor: parseMoneyToMinor(item.unitPrice),
          totalPriceMinor: parseMoneyToMinor(item.totalPrice) ?? 0,
          notes: item.notes.trim() || null,
          aiCategorySlug: item.aiCategorySlug ?? null,
          aiConfidence: item.aiConfidence ?? null,
          categoryChosenByUser: item.categoryChosenByUser ?? false,
        })),
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      toast.success(
        initial?.id ? "Shop updated" : `Saved ${filled.length} items`,
      );
      router.push(redirectTo);
      router.refresh();
    });
  }

  const symbol = currencySymbol(currency);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className={cn("grid gap-4", compact ? "sm:grid-cols-2" : "sm:grid-cols-3")}>
          <div className="space-y-1.5">
            <Label htmlFor="store">Store</Label>
            <Input
              id="store"
              list="store-options"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="Tesco"
              autoComplete="off"
            />
            <datalist id="store-options">
              {stores.map((s) => (
                <option key={s.id} value={s.name} />
              ))}
            </datalist>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="purchase_date">Purchase date</Label>
            <Input
              id="purchase_date"
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              max={todayString()}
            />
          </div>

          {!compact ? (
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Weekly shop"
              />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <datalist id="product-options">
        {suggestions.slice(0, 400).map((s) => (
          <option key={s.name} value={s.name} />
        ))}
      </datalist>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left [&>th]:font-medium">
              <th className="w-[26%]">Item</th>
              <th className="w-[18%]">Category</th>
              <th className="w-[9%]">Qty</th>
              <th className="w-[9%]">Unit</th>
              <th className="w-[13%]">Unit price</th>
              <th className="w-[13%]">Total</th>
              <th className="w-[12%] text-right">
                <span className="sr-only">Row actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr
                key={item.key}
                className={cn(
                  "border-t align-top [&>td]:px-2 [&>td]:py-1.5",
                  item.needsAttention && "bg-warning/10",
                )}
              >
                <td>
                  <Input
                    aria-label={`Item ${index + 1} name`}
                    list="product-options"
                    value={item.name}
                    autoComplete="off"
                    onChange={(e) => patch(item.key, { name: e.target.value })}
                    onBlur={(e) => applySuggestion(item.key, e.target.value)}
                    placeholder="Semi-skimmed milk 2L"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && index === items.length - 1) {
                        e.preventDefault();
                        addRow();
                      }
                    }}
                  />
                  {item.rawText ? (
                    <p className="text-muted-foreground mt-1 truncate px-1 text-xs">
                      {item.rawText}
                    </p>
                  ) : null}
                </td>
                <td>
                  <NativeSelect
                    aria-label={`Item ${index + 1} category`}
                    value={item.categoryId ?? ""}
                    onChange={(e) =>
                      patch(item.key, {
                        categoryId: e.target.value || null,
                        categoryChosenByUser: true,
                        needsAttention: false,
                      })
                    }
                  >
                    <option value="">Auto</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </NativeSelect>
                </td>
                <td>
                  <Input
                    aria-label={`Item ${index + 1} quantity`}
                    inputMode="decimal"
                    value={item.quantity}
                    onChange={(e) =>
                      recalcFromUnit(item.key, { quantity: e.target.value })
                    }
                  />
                </td>
                <td>
                  <Input
                    aria-label={`Item ${index + 1} unit`}
                    value={item.unit}
                    onChange={(e) => patch(item.key, { unit: e.target.value })}
                    placeholder="kg"
                  />
                </td>
                <td>
                  <div className="relative">
                    <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-xs">
                      {symbol}
                    </span>
                    <Input
                      aria-label={`Item ${index + 1} unit price`}
                      inputMode="decimal"
                      className="pl-5"
                      value={item.unitPrice}
                      onChange={(e) =>
                        recalcFromUnit(item.key, { unitPrice: e.target.value })
                      }
                    />
                  </div>
                </td>
                <td>
                  <div className="relative">
                    <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-xs">
                      {symbol}
                    </span>
                    <Input
                      aria-label={`Item ${index + 1} total`}
                      inputMode="decimal"
                      className="pl-5 font-medium tabular-nums"
                      value={item.totalPrice}
                      onChange={(e) => recalcFromTotal(item.key, e.target.value)}
                    />
                  </div>
                </td>
                <td className="text-right whitespace-nowrap">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Duplicate item ${index + 1}`}
                    onClick={() => duplicateRow(item.key)}
                  >
                    <Copy className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove item ${index + 1}`}
                    onClick={() => removeRow(item.key)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          <Plus className="size-4" /> Add item
        </Button>

        <div className="text-right">
          <p className="text-muted-foreground text-xs">
            {items.filter((i) => i.name.trim()).length} items
          </p>
          <p className="text-lg font-semibold tabular-nums">
            {format(runningTotal)}
          </p>
        </div>
      </div>

      {totalGap != null && totalGap !== 0 ? (
        <div className="border-warning/40 bg-warning/10 flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2.5 text-sm">
          <TriangleAlert className="text-warning size-4 shrink-0" />
          <span className="flex-1">
            The receipt says {format(printedTotalMinor ?? 0)} but these items add
            up to {format(runningTotal)} — a difference of{" "}
            <strong className="tabular-nums">{format(Math.abs(totalGap))}</strong>
            . That&apos;s usually a discount, a bag charge, or a missed line.
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={addAdjustmentLine}
          >
            Add it as a line
          </Button>
        </div>
      ) : null}

      {compact ? (
        <div className="space-y-1.5">
          <Label htmlFor="notes-compact">Notes</Label>
          <Textarea
            id="notes-compact"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything worth remembering about this shop"
            rows={2}
          />
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button type="button" onClick={handleSave} disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}
