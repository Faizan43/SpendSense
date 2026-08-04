/**
 * The twelve seeded categories. Every user gets their own rows (so names,
 * colours and icons stay editable) but the slugs are stable and are what the
 * receipt extractor is asked to choose between.
 */

export const CATEGORY_SLUGS = [
  "fruit-vegetables",
  "dairy",
  "meat-seafood",
  "bakery",
  "snacks",
  "beverages",
  "frozen",
  "household",
  "personal-care",
  "baby",
  "cleaning",
  "other",
] as const;

export type CategorySlug = (typeof CATEGORY_SLUGS)[number];

/**
 * `chartSlot` indexes the validated 8-hue categorical palette (see
 * app/globals.css). Eight is the maximum number of hues that stay separable
 * under colour-vision deficiency, so the last three categories reuse the
 * opening slots and "other" takes the reserved neutral. Every chart also
 * carries a legend or direct labels, so hue is never the only channel.
 */
export const SYSTEM_CATEGORIES: Array<{
  slug: CategorySlug;
  name: string;
  icon: string;
  chartSlot: number; // 1-8, or 0 for the reserved neutral
  sortOrder: number;
}> = [
  { slug: "fruit-vegetables", name: "Fruit & Vegetables", icon: "carrot", chartSlot: 1, sortOrder: 0 },
  { slug: "dairy", name: "Dairy", icon: "milk", chartSlot: 2, sortOrder: 1 },
  { slug: "meat-seafood", name: "Meat & Seafood", icon: "beef", chartSlot: 3, sortOrder: 2 },
  { slug: "bakery", name: "Bakery", icon: "croissant", chartSlot: 4, sortOrder: 3 },
  { slug: "snacks", name: "Snacks", icon: "cookie", chartSlot: 5, sortOrder: 4 },
  { slug: "beverages", name: "Beverages", icon: "cup-soda", chartSlot: 6, sortOrder: 5 },
  { slug: "frozen", name: "Frozen Foods", icon: "snowflake", chartSlot: 7, sortOrder: 6 },
  { slug: "household", name: "Household Supplies", icon: "lamp", chartSlot: 8, sortOrder: 7 },
  { slug: "personal-care", name: "Personal Care", icon: "hand-heart", chartSlot: 1, sortOrder: 8 },
  { slug: "baby", name: "Baby Products", icon: "baby", chartSlot: 2, sortOrder: 9 },
  { slug: "cleaning", name: "Cleaning Products", icon: "spray-can", chartSlot: 3, sortOrder: 10 },
  { slug: "other", name: "Other", icon: "package", chartSlot: 0, sortOrder: 11 },
];

/** CSS custom property holding this slot's hue in the current theme. */
export function chartSlotColor(slot: number | null | undefined): string {
  if (!slot || slot < 1 || slot > 8) return "var(--chart-other)";
  return `var(--chart-${slot})`;
}

export const OTHER_BUCKET_COLOR = "var(--chart-other)";

/**
 * Part-to-whole reads at a glance only up to about six segments, and more than
 * eight hues stop being separable at all. The donut therefore shows the leading
 * categories and folds the tail into a single neutral "Other" slice; the full
 * twelve are available as a bar chart and in every table view.
 */
export const MAX_CHART_SERIES = 5;

export type CategoryLike = {
  id: string;
  name: string;
  slug: string;
  chart_slot: number | null;
};

export type FoldedSlice<T> = {
  key: string;
  name: string;
  color: string;
  value: number;
  items: T[];
  isOtherBucket: boolean;
};

/**
 * Sort by value, keep the leading `max`, and merge the remainder into one
 * neutral bucket. Colours come from each category's own fixed slot, so a
 * category keeps its hue when filters change which categories are on screen.
 */
export function foldToChartSeries<
  T extends { categoryId: string | null; categoryName: string; chartSlot: number | null; value: number },
>(rows: T[], max = MAX_CHART_SERIES): FoldedSlice<T>[] {
  const sorted = [...rows].sort((a, b) => b.value - a.value);
  const head = sorted.slice(0, max);
  const tail = sorted.slice(max);

  const slices: FoldedSlice<T>[] = head.map((r) => ({
    key: r.categoryId ?? r.categoryName,
    name: r.categoryName,
    color: chartSlotColor(r.chartSlot),
    value: r.value,
    items: [r],
    isOtherBucket: false,
  }));

  if (tail.length > 0) {
    slices.push({
      key: "__other__",
      name: tail.length === 1 ? tail[0].categoryName : `Other (${tail.length})`,
      color: OTHER_BUCKET_COLOR,
      value: tail.reduce((sum, r) => sum + r.value, 0),
      items: tail,
      isOtherBucket: true,
    });
  }

  return slices;
}
