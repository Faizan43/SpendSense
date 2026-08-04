import { describe, expect, it } from "vitest";

import { previousRange, resolveRange } from "@/lib/date";
import { foldToChartSeries } from "@/lib/categories";
import { buildQuery, hasActiveFilters, parseFilters } from "@/lib/filters";

describe("parseFilters", () => {
  it("defaults to the fallback preset when none is given", () => {
    const filters = parseFilters({}, "last-3-months");
    expect(filters.preset).toBe("last-3-months");
    expect(filters.range.from <= filters.range.to).toBe(true);
  });

  it("ignores a preset it doesn't recognise", () => {
    const filters = parseFilters({ preset: "since-forever" });
    expect(filters.preset).toBe("this-month");
  });

  it("reads comma-separated and repeated multi-select params", () => {
    expect(parseFilters({ stores: "a,b" }).storeIds).toEqual(["a", "b"]);
    expect(parseFilters({ categories: ["a", "b"] }).categoryIds).toEqual([
      "a",
      "b",
    ]);
  });

  it("parses amount bounds as minor units", () => {
    const filters = parseFilters({ min: "1.50", max: "20" });
    expect(filters.minMinor).toBe(150);
    expect(filters.maxMinor).toBe(2000);
  });

  it("knows when nothing beyond the date range is applied", () => {
    expect(hasActiveFilters(parseFilters({}))).toBe(false);
    expect(hasActiveFilters(parseFilters({ q: "milk" }))).toBe(true);
  });
});

describe("buildQuery", () => {
  it("drops empty values and resets pagination when a filter changes", () => {
    expect(buildQuery({ page: "3", preset: "this-month" }, { q: "milk" })).toBe(
      "?preset=this-month&q=milk",
    );
  });

  it("keeps the page when the page itself is what changed", () => {
    expect(buildQuery({ preset: "this-month" }, { page: "2" })).toBe(
      "?preset=this-month&page=2",
    );
  });

  it("removes a param when set to null", () => {
    expect(buildQuery({ q: "milk", preset: "this-month" }, { q: null })).toBe(
      "?preset=this-month",
    );
  });
});

describe("previousRange", () => {
  it("shifts back by exactly the window length", () => {
    const range = { from: "2026-03-01", to: "2026-03-31" };
    expect(previousRange(range)).toEqual({
      from: "2026-01-29",
      to: "2026-02-28",
    });
  });

  it("is the same length as the range it mirrors", () => {
    const range = resolveRange("last-3-months");
    const previous = previousRange(range);
    const days = (r: { from: string; to: string }) =>
      (Date.parse(r.to) - Date.parse(r.from)) / 86_400_000;
    expect(days(previous)).toBeCloseTo(days(range));
  });
});

describe("foldToChartSeries", () => {
  const row = (name: string, value: number, slot: number) => ({
    categoryId: name,
    categoryName: name,
    chartSlot: slot,
    value,
  });

  it("keeps everything when it fits inside the hue budget", () => {
    const slices = foldToChartSeries([row("a", 3, 1), row("b", 2, 2)]);
    expect(slices).toHaveLength(2);
    expect(slices[0].name).toBe("a");
  });

  it("folds the tail into a single Other bucket", () => {
    const slices = foldToChartSeries(
      Array.from({ length: 9 }, (_, i) => row(`c${i}`, 9 - i, (i % 8) + 1)),
    );
    expect(slices).toHaveLength(6);
    const other = slices.at(-1)!;
    expect(other.isOtherBucket).toBe(true);
    // 4 + 3 + 2 + 1 for the four smallest of nine.
    expect(other.value).toBe(10);
  });

  it("preserves the total when folding", () => {
    const rows = Array.from({ length: 12 }, (_, i) => row(`c${i}`, i + 1, 1));
    const total = rows.reduce((sum, r) => sum + r.value, 0);
    const folded = foldToChartSeries(rows).reduce((sum, s) => sum + s.value, 0);
    expect(folded).toBe(total);
  });
});
