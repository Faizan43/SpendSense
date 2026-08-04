import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import { NextResponse, type NextRequest } from "next/server";
import React from "react";

import { getPeriodSummary, getSpendByCategory } from "@/lib/analytics/queries";
import { formatDate, formatMonth } from "@/lib/date";
import { queryFilteredItems } from "@/lib/expenses/query-items";
import { parseFilters } from "@/lib/filters";
import { formatMoney } from "@/lib/money";
import { getMoneyFormat, getProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 120;

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 9, color: "#0b0b0b", fontFamily: "Helvetica" },
  h1: { fontSize: 18, marginBottom: 2, fontFamily: "Helvetica-Bold" },
  meta: { fontSize: 9, color: "#52514e", marginBottom: 16 },
  sectionTitle: {
    fontSize: 11,
    marginTop: 18,
    marginBottom: 6,
    fontFamily: "Helvetica-Bold",
  },
  cards: { flexDirection: "row", gap: 8, marginBottom: 4 },
  card: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e1e0d9",
    borderRadius: 4,
    padding: 8,
  },
  cardLabel: { fontSize: 8, color: "#52514e", marginBottom: 3 },
  cardValue: { fontSize: 13, fontFamily: "Helvetica-Bold" },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#eeede8",
    paddingVertical: 4,
  },
  headRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#c3c2b7",
    paddingBottom: 4,
    marginTop: 2,
  },
  th: { fontSize: 8, color: "#52514e", fontFamily: "Helvetica-Bold" },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 36,
    right: 36,
    fontSize: 8,
    color: "#898781",
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

const COL = {
  date: { width: "12%" },
  store: { width: "16%" },
  item: { width: "30%" },
  category: { width: "18%" },
  qty: { width: "8%", textAlign: "right" as const },
  total: { width: "16%", textAlign: "right" as const },
};

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const filters = parseFilters(params, "this-month");

  const [rows, summary, byCategory, money, profile] = await Promise.all([
    // A PDF is for reading, not archiving — the CSV export carries everything.
    queryFilteredItems(filters, 600),
    getPeriodSummary(filters),
    getSpendByCategory(filters),
    getMoneyFormat(),
    getProfile(),
  ]);

  const fmt = (minor: number) =>
    formatMoney(minor, money.currency, money.locale);

  const e = React.createElement;

  const document = e(
    Document,
    { title: "Spending report" },
    e(
      Page,
      { size: "A4", style: styles.page },
      e(Text, { style: styles.h1 }, "Spending"),
      e(
        Text,
        { style: styles.meta },
        `${formatDate(filters.range.from)} — ${formatDate(filters.range.to)}` +
          (profile?.display_name ? ` · ${profile.display_name}` : ""),
      ),

      e(
        View,
        { style: styles.cards },
        e(
          View,
          { style: styles.card },
          e(Text, { style: styles.cardLabel }, "Total spent"),
          e(Text, { style: styles.cardValue }, fmt(summary.total_minor)),
        ),
        e(
          View,
          { style: styles.card },
          e(Text, { style: styles.cardLabel }, "Shopping trips"),
          e(Text, { style: styles.cardValue }, String(summary.trip_count)),
        ),
        e(
          View,
          { style: styles.card },
          e(Text, { style: styles.cardLabel }, "Average per trip"),
          e(Text, { style: styles.cardValue }, fmt(summary.avg_trip_minor)),
        ),
        e(
          View,
          { style: styles.card },
          e(Text, { style: styles.cardLabel }, "Items"),
          e(Text, { style: styles.cardValue }, String(summary.item_count)),
        ),
      ),

      e(Text, { style: styles.sectionTitle }, "By category"),
      e(
        View,
        { style: styles.headRow },
        e(Text, { style: [styles.th, { width: "60%" }] }, "Category"),
        e(Text, { style: [styles.th, { width: "20%", textAlign: "right" }] }, "Items"),
        e(Text, { style: [styles.th, { width: "20%", textAlign: "right" }] }, "Spent"),
      ),
      ...byCategory
        .filter((c) => c.total_minor > 0)
        .map((category, index) =>
          e(
            View,
            { key: `cat-${index}`, style: styles.row },
            e(Text, { style: { width: "60%" } }, category.category_name),
            e(
              Text,
              { style: { width: "20%", textAlign: "right" } },
              String(category.item_count),
            ),
            e(
              Text,
              { style: { width: "20%", textAlign: "right" } },
              fmt(category.total_minor),
            ),
          ),
        ),

      e(
        Text,
        { style: styles.sectionTitle },
        `Items (${rows.length}${rows.length === 600 ? " shown — export the CSV for the full list" : ""})`,
      ),
      e(
        View,
        { style: styles.headRow, fixed: true },
        e(Text, { style: [styles.th, COL.date] }, "Date"),
        e(Text, { style: [styles.th, COL.store] }, "Store"),
        e(Text, { style: [styles.th, COL.item] }, "Item"),
        e(Text, { style: [styles.th, COL.category] }, "Category"),
        e(Text, { style: [styles.th, COL.qty] }, "Qty"),
        e(Text, { style: [styles.th, COL.total] }, "Total"),
      ),
      ...rows.map((row) =>
        e(
          View,
          { key: row.id, style: styles.row, wrap: false },
          e(Text, { style: COL.date }, formatDate(row.purchaseDate)),
          e(Text, { style: COL.store }, row.storeName ?? "—"),
          e(Text, { style: COL.item }, row.name),
          e(Text, { style: COL.category }, row.categoryName),
          e(Text, { style: COL.qty }, String(row.quantity)),
          e(Text, { style: COL.total }, fmt(row.totalPriceMinor)),
        ),
      ),

      e(
        View,
        { style: styles.footer, fixed: true },
        e(Text, {}, `Generated ${formatMonth(new Date().toISOString().slice(0, 10))}`),
        e(Text, {
          render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
            `${pageNumber} / ${totalPages}`,
        }),
      ),
    ),
  );

  const buffer = await renderToBuffer(document);
  const filename = `spending-report-${filters.range.from}-to-${filters.range.to}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
