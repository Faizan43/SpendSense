import {
  RANGE_PRESETS,
  resolveRange,
  type DateRange,
  type RangePresetId,
} from "@/lib/date";
import { parseMoneyToMinor } from "@/lib/money";

/**
 * Filters live in the URL, so a filtered view is shareable, survives a refresh,
 * and works with the back button. Every page and every widget reads the same
 * shape, which is what keeps the dashboard's numbers consistent with each
 * other when a filter is applied.
 */
export type SpendFilters = {
  preset: RangePresetId;
  range: DateRange;
  storeIds: string[];
  categoryIds: string[];
  minMinor: number | null;
  maxMinor: number | null;
  search: string;
};

export type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function list(value: string | string[] | undefined): string[] {
  if (!value) return [];
  const raw = Array.isArray(value) ? value : [value];
  return raw
    .flatMap((v) => v.split(","))
    .map((v) => v.trim())
    .filter(Boolean);
}

const PRESET_IDS = new Set(RANGE_PRESETS.map((p) => p.id));

export function parseFilters(
  params: SearchParams,
  fallbackPreset: RangePresetId = "this-month",
): SpendFilters {
  const rawPreset = first(params.preset);
  const preset: RangePresetId =
    rawPreset && PRESET_IDS.has(rawPreset as RangePresetId)
      ? (rawPreset as RangePresetId)
      : fallbackPreset;

  const range = resolveRange(preset, {
    from: first(params.from),
    to: first(params.to),
  });

  return {
    preset,
    range,
    storeIds: list(params.stores),
    categoryIds: list(params.categories),
    minMinor: parseMoneyToMinor(first(params.min) ?? ""),
    maxMinor: parseMoneyToMinor(first(params.max) ?? ""),
    search: (first(params.q) ?? "").trim(),
  };
}

/** Arguments shared by every analytics function, derived once. */
export function rpcFilterArgs(filters: SpendFilters) {
  return {
    p_from: filters.range.from,
    p_to: filters.range.to,
    p_store_ids: filters.storeIds.length ? filters.storeIds : null,
    p_category_ids: filters.categoryIds.length ? filters.categoryIds : null,
    p_min_minor: filters.minMinor,
    p_max_minor: filters.maxMinor,
    p_search: filters.search || null,
  };
}

export function hasActiveFilters(filters: SpendFilters): boolean {
  return (
    filters.storeIds.length > 0 ||
    filters.categoryIds.length > 0 ||
    filters.minMinor !== null ||
    filters.maxMinor !== null ||
    filters.search !== ""
  );
}

/** Builds a query string, dropping empty values so URLs stay readable. */
export function buildQuery(
  current: SearchParams,
  changes: Record<string, string | string[] | null | undefined>,
): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(current)) {
    if (value === undefined) continue;
    const values = Array.isArray(value) ? value : [value];
    for (const v of values) if (v) params.append(key, v);
  }

  for (const [key, value] of Object.entries(changes)) {
    params.delete(key);
    if (value === null || value === undefined || value === "") continue;
    const values = Array.isArray(value) ? value : [value];
    for (const v of values) if (v) params.append(key, v);
  }

  // A new filter always sends you back to page one; staying on page 7 of a
  // result set that now has two pages is a dead end.
  if (!("page" in changes)) params.delete("page");

  const query = params.toString();
  return query ? `?${query}` : "";
}

export type SortKey =
  | "date"
  | "name"
  | "store"
  | "category"
  | "quantity"
  | "unit_price"
  | "total";

export const SORT_COLUMNS: Record<SortKey, string> = {
  date: "transactions(purchase_date)",
  name: "name",
  store: "transactions(store_id)",
  category: "category_id",
  quantity: "quantity",
  unit_price: "unit_price_minor",
  total: "total_price_minor",
};

export function parseSort(params: SearchParams): {
  key: SortKey;
  ascending: boolean;
} {
  const raw = first(params.sort) ?? "date";
  const key = (raw in SORT_COLUMNS ? raw : "date") as SortKey;
  return { key, ascending: first(params.dir) === "asc" };
}

export function parsePage(params: SearchParams): number {
  const raw = Number(first(params.page) ?? "1");
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 1;
}
