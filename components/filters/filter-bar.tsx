"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RANGE_PRESETS } from "@/lib/date";
import { currencySymbol } from "@/lib/money";
import { useMoney } from "@/components/money-provider";

type Option = { id: string; label: string };

export function FilterBar({
  stores,
  categories,
  showAmount = true,
  showSearch = true,
}: {
  stores: Option[];
  categories: Option[];
  showAmount?: boolean;
  showSearch?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const { currency } = useMoney();

  const params = useMemo(
    () => new URLSearchParams(searchParams.toString()),
    [searchParams],
  );

  const preset = params.get("preset") ?? "this-month";
  const selectedStores = (params.get("stores") ?? "").split(",").filter(Boolean);
  const selectedCategories = (params.get("categories") ?? "")
    .split(",")
    .filter(Boolean);

  // The search box is uncontrolled and re-keyed on the URL, so navigating
  // (back button, cleared filters, a shared link) resets it without an effect
  // syncing state that the URL already owns.
  const searchKey = params.get("q") ?? "";

  function apply(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
    }
    next.delete("page");
    startTransition(() => {
      router.push(`${pathname}${next.toString() ? `?${next}` : ""}`);
    });
  }

  function toggle(key: "stores" | "categories", id: string) {
    const current = (params.get(key) ?? "").split(",").filter(Boolean);
    const next = current.includes(id)
      ? current.filter((v) => v !== id)
      : [...current, id];
    apply({ [key]: next.join(",") || null });
  }

  const activeCount =
    selectedStores.length +
    selectedCategories.length +
    (params.get("min") ? 1 : 0) +
    (params.get("max") ? 1 : 0) +
    (params.get("q") ? 1 : 0);

  return (
    <div className="flex flex-wrap items-end gap-2" data-pending={pending || undefined}>
      <div className="space-y-1">
        <Label htmlFor="range-preset" className="text-muted-foreground text-xs">
          Period
        </Label>
        <NativeSelect
          id="range-preset"
          className="w-44"
          value={preset}
          onChange={(e) => apply({ preset: e.target.value })}
        >
          {RANGE_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </NativeSelect>
      </div>

      {preset === "custom" ? (
        <>
          <div className="space-y-1">
            <Label htmlFor="range-from" className="text-muted-foreground text-xs">
              From
            </Label>
            <Input
              id="range-from"
              type="date"
              className="w-40"
              defaultValue={params.get("from") ?? ""}
              onChange={(e) => apply({ from: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="range-to" className="text-muted-foreground text-xs">
              To
            </Label>
            <Input
              id="range-to"
              type="date"
              className="w-40"
              defaultValue={params.get("to") ?? ""}
              onChange={(e) => apply({ to: e.target.value })}
            />
          </div>
        </>
      ) : null}

      <MultiSelect
        label="Stores"
        options={stores}
        selected={selectedStores}
        onToggle={(id) => toggle("stores", id)}
        onClear={() => apply({ stores: null })}
      />

      <MultiSelect
        label="Categories"
        options={categories}
        selected={selectedCategories}
        onToggle={(id) => toggle("categories", id)}
        onClear={() => apply({ categories: null })}
      />

      {showAmount ? (
        <Popover>
          <PopoverTrigger
            render={
              <Button variant="outline" size="default">
                <SlidersHorizontal className="size-4" />
                Amount
              </Button>
            }
          />
          <PopoverContent className="w-64 space-y-3 p-3">
            <div className="space-y-1.5">
              <Label htmlFor="min-amount">Minimum item amount</Label>
              <div className="relative">
                <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm">
                  {currencySymbol(currency)}
                </span>
                <Input
                  id="min-amount"
                  inputMode="decimal"
                  className="pl-6"
                  defaultValue={params.get("min") ?? ""}
                  onBlur={(e) => apply({ min: e.target.value || null })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="max-amount">Maximum item amount</Label>
              <div className="relative">
                <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm">
                  {currencySymbol(currency)}
                </span>
                <Input
                  id="max-amount"
                  inputMode="decimal"
                  className="pl-6"
                  defaultValue={params.get("max") ?? ""}
                  onBlur={(e) => apply({ max: e.target.value || null })}
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>
      ) : null}

      {showSearch ? (
        <form
          className="relative"
          onSubmit={(e) => {
            e.preventDefault();
            const value = new FormData(e.currentTarget).get("q");
            apply({ q: typeof value === "string" && value ? value : null });
          }}
        >
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            key={searchKey}
            name="q"
            aria-label="Search items"
            className="w-52 pl-8"
            placeholder="Search items…"
            defaultValue={searchKey}
          />
        </form>
      ) : null}

      {activeCount > 0 ? (
        <Button
          variant="ghost"
          onClick={() =>
            apply({
              stores: null,
              categories: null,
              min: null,
              max: null,
              q: null,
            })
          }
        >
          <X className="size-4" />
          Clear {activeCount}
        </Button>
      ) : null}
    </div>
  );
}

function MultiSelect({
  label,
  options,
  selected,
  onToggle,
  onClear,
}: {
  label: string;
  options: Option[];
  selected: string[];
  onToggle: (id: string) => void;
  onClear: () => void;
}) {
  if (options.length === 0) return null;

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="outline">
            {label}
            {selected.length > 0 ? (
              <Badge variant="secondary" className="tabular-nums">
                {selected.length}
              </Badge>
            ) : null}
          </Button>
        }
      />
      <PopoverContent className="w-60 p-0">
        <div className="max-h-64 overflow-y-auto p-1">
          {options.map((option) => (
            <label
              key={option.id}
              className="hover:bg-muted flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm"
            >
              <Checkbox
                checked={selected.includes(option.id)}
                onCheckedChange={() => onToggle(option.id)}
              />
              <span className="truncate">{option.label}</span>
            </label>
          ))}
        </div>
        {selected.length > 0 ? (
          <div className="border-t p-1">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={onClear}
            >
              <X className="size-3.5" /> Clear {label.toLowerCase()}
            </Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
