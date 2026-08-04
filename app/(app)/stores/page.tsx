import type { Metadata } from "next";

import { StoreBars } from "@/components/charts/store-bars";
import { EmptyState } from "@/components/empty-state";
import { FilterBar } from "@/components/filters/filter-bar";
import { PageHeader } from "@/components/layout/page-header";
import { StoreTable } from "@/components/stores/store-table";
import { getStoreComparison } from "@/lib/analytics/queries";
import { parseFilters, type SearchParams } from "@/lib/filters";
import { getCategories, getStores } from "@/lib/profile";

export const metadata: Metadata = { title: "Stores" };

export default async function StoresPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const filters = parseFilters(params, "last-12-months");

  const [comparison, categories, allStores] = await Promise.all([
    getStoreComparison(filters),
    getCategories(),
    getStores(),
  ]);

  const rows = comparison
    .filter((row): row is typeof row & { store_id: string } =>
      Boolean(row.store_id),
    )
    .map((row) => ({
      id: row.store_id,
      name: row.store_name,
      totalMinor: row.total_minor,
      tripCount: row.trip_count,
      avgTripMinor: row.avg_trip_minor,
      itemCount: row.item_count,
    }));

  return (
    <>
      <PageHeader
        title="Stores"
        description="Where the money goes, and which shop quietly has the bigger basket. Receipts get grouped automatically, but you can rename or merge anything that slipped through."
      />

      <FilterBar
        stores={allStores.map((s) => ({ id: s.id, label: s.name }))}
        categories={categories.map((c) => ({ id: c.id, label: c.name }))}
        showAmount={false}
      />

      {rows.length === 0 ? (
        <EmptyState
          icon="store"
          title="No stores yet"
          description="Stores are created from your receipts and manual entries automatically."
        />
      ) : (
        <>
          <StoreBars
            data={comparison}
            limit={12}
            title="Spending by store"
            description="Total spent in the selected period."
          />
          <StoreTable stores={rows} />
        </>
      )}
    </>
  );
}
