"use client";

import Papa from "papaparse";
import { FileUp, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";

import {
  ExpenseEditor,
  blankItem,
  type EditorItem,
  type ProductSuggestion,
} from "@/components/expenses/expense-editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { todayString } from "@/lib/date";
import { minorToInput, parseMoneyToMinor } from "@/lib/money";
import type { CategoryRow } from "@/lib/types/database";

type Mapping = {
  name: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  totalPrice: string;
  category: string;
  notes: string;
  store: string;
  date: string;
};

const EMPTY_MAPPING: Mapping = {
  name: "",
  quantity: "",
  unit: "",
  unitPrice: "",
  totalPrice: "",
  category: "",
  notes: "",
  store: "",
  date: "",
};

/** Best-effort column matching, so most files need no manual mapping at all. */
const GUESSES: Record<keyof Mapping, string[]> = {
  name: ["item", "product", "name", "description", "title"],
  quantity: ["qty", "quantity", "amount", "count"],
  unit: ["unit", "uom", "measure"],
  unitPrice: ["unit price", "unitprice", "price", "price each", "each"],
  totalPrice: ["total", "total price", "line total", "cost", "value", "spend"],
  category: ["category", "type", "group"],
  notes: ["note", "notes", "comment"],
  store: ["store", "shop", "merchant", "retailer", "vendor"],
  date: ["date", "purchase date", "day", "when"],
};

function guessColumn(headers: string[], key: keyof Mapping): string {
  const normalized = headers.map((h) => h.toLowerCase().trim());
  for (const candidate of GUESSES[key]) {
    const exact = normalized.indexOf(candidate);
    if (exact >= 0) return headers[exact];
  }
  for (const candidate of GUESSES[key]) {
    const partial = normalized.findIndex((h) => h.includes(candidate));
    if (partial >= 0) return headers[partial];
  }
  return "";
}

/** Accepts 2026-08-01, 01/08/2026 and 1 Aug 2026; returns yyyy-MM-dd or null. */
function parseDate(raw: string | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const slash = trimmed.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (slash) {
    const [, d, m, y] = slash;
    const year = y.length === 2 ? `20${y}` : y;
    return `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return null;
}

export function CsvImport({
  categories,
  stores,
  suggestions,
}: {
  categories: CategoryRow[];
  stores: Array<{ id: string; name: string }>;
  suggestions: ProductSuggestion[];
}) {
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Mapping>(EMPTY_MAPPING);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const categoryByName = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of categories) {
      map.set(c.name.toLowerCase(), c.id);
      map.set(c.slug.toLowerCase(), c.id);
    }
    return map;
  }, [categories]);

  function handleFile(file: File) {
    setError(null);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const fields = (result.meta.fields ?? []).filter(Boolean);
        if (fields.length === 0 || result.data.length === 0) {
          setError("That file has no readable rows. Is the first row a header?");
          return;
        }
        setHeaders(fields);
        setRows(result.data);
        setMapping({
          name: guessColumn(fields, "name"),
          quantity: guessColumn(fields, "quantity"),
          unit: guessColumn(fields, "unit"),
          unitPrice: guessColumn(fields, "unitPrice"),
          totalPrice: guessColumn(fields, "totalPrice"),
          category: guessColumn(fields, "category"),
          notes: guessColumn(fields, "notes"),
          store: guessColumn(fields, "store"),
          date: guessColumn(fields, "date"),
        });
        setConfirmed(false);
      },
      error: () => setError("That file couldn't be read as CSV."),
    });
  }

  const items: EditorItem[] = useMemo(() => {
    if (!mapping.name) return [];
    return rows
      .map<EditorItem | null>((row, index) => {
        const name = (row[mapping.name] ?? "").trim();
        if (!name) return null;

        const total = mapping.totalPrice
          ? parseMoneyToMinor(row[mapping.totalPrice])
          : null;
        const unitPrice = mapping.unitPrice
          ? parseMoneyToMinor(row[mapping.unitPrice])
          : null;
        const quantity = mapping.quantity
          ? Number(row[mapping.quantity]) || 1
          : 1;

        const resolvedTotal =
          total ?? (unitPrice != null ? Math.round(unitPrice * quantity) : null);

        return {
          ...blankItem(),
          key: `csv-${index}`,
          name,
          quantity: String(quantity),
          unit: mapping.unit ? (row[mapping.unit] ?? "").trim() : "",
          unitPrice: unitPrice != null ? minorToInput(unitPrice) : "",
          totalPrice: resolvedTotal != null ? minorToInput(resolvedTotal) : "",
          notes: mapping.notes ? (row[mapping.notes] ?? "").trim() : "",
          categoryId: mapping.category
            ? (categoryByName.get(
                (row[mapping.category] ?? "").trim().toLowerCase(),
              ) ?? null)
            : null,
          categoryChosenByUser: Boolean(
            mapping.category &&
              categoryByName.get(
                (row[mapping.category] ?? "").trim().toLowerCase(),
              ),
          ),
        };
      })
      .filter((item): item is EditorItem => item !== null);
  }, [rows, mapping, categoryByName]);

  const firstStore = mapping.store ? (rows[0]?.[mapping.store] ?? "") : "";
  const firstDate = mapping.date ? parseDate(rows[0]?.[mapping.date]) : null;

  const withoutAmount = items.filter((i) => i.totalPrice === "").length;

  function reset() {
    setRows([]);
    setHeaders([]);
    setMapping(EMPTY_MAPPING);
    setConfirmed(false);
    setError(null);
  }

  if (confirmed && items.length > 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-muted-foreground text-sm">
            {items.length} rows imported. Check them over, then save.
          </p>
          <Button variant="outline" size="sm" onClick={reset}>
            <RotateCcw className="size-4" /> Start over
          </Button>
        </div>
        <ExpenseEditor
          categories={categories}
          stores={stores}
          suggestions={suggestions}
          initial={{
            storeName: firstStore || null,
            purchaseDate: firstDate ?? todayString(),
            items,
          }}
          source="import"
          submitLabel={`Import ${items.length} items`}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Choose a file</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Label
            htmlFor="csv-file"
            className="hover:bg-muted/50 flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-10 text-center transition-colors"
          >
            <FileUp className="text-muted-foreground size-6" />
            <span className="font-medium">Drop a CSV here, or browse</span>
            <span className="text-muted-foreground text-sm">
              The first row should be column headings. Everything in the file is
              treated as one shopping trip.
            </span>
          </Label>
          <Input
            id="csv-file"
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
          {error ? (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {headers.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Match up the columns</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              {(
                [
                  ["name", "Item name", true],
                  ["totalPrice", "Line total", false],
                  ["unitPrice", "Unit price", false],
                  ["quantity", "Quantity", false],
                  ["unit", "Unit", false],
                  ["category", "Category", false],
                  ["store", "Store", false],
                  ["date", "Date", false],
                  ["notes", "Notes", false],
                ] as Array<[keyof Mapping, string, boolean]>
              ).map(([key, label, required]) => (
                <div key={key} className="space-y-1.5">
                  <Label htmlFor={`map-${key}`}>
                    {label}
                    {required ? (
                      <span className="text-destructive"> *</span>
                    ) : null}
                  </Label>
                  <NativeSelect
                    id={`map-${key}`}
                    value={mapping[key]}
                    onChange={(e) =>
                      setMapping((m) => ({ ...m, [key]: e.target.value }))
                    }
                  >
                    <option value="">— not in this file —</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
              ))}
            </div>

            <div className="text-muted-foreground space-y-1 text-sm">
              <p>
                {items.length} of {rows.length} rows have an item name.
              </p>
              {withoutAmount > 0 ? (
                <p className="text-warning">
                  {withoutAmount} of them have no amount — you can fill those in
                  on the next screen.
                </p>
              ) : null}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={reset}>
                Cancel
              </Button>
              <Button
                onClick={() => setConfirmed(true)}
                disabled={!mapping.name || items.length === 0}
              >
                Review {items.length} items
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
