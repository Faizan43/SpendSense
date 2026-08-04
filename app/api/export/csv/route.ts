import { NextResponse, type NextRequest } from "next/server";

import { parseFilters } from "@/lib/filters";
import { queryFilteredItems } from "@/lib/expenses/query-items";
import { minorToInput } from "@/lib/money";
import { getMoneyFormat } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** RFC 4180 quoting: double the quotes, wrap anything with a separator. */
function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const filters = parseFilters(params, "last-12-months");
  const [rows, money] = await Promise.all([
    queryFilteredItems(filters),
    getMoneyFormat(),
  ]);

  const header = [
    "Date",
    "Store",
    "Item",
    "Category",
    "Quantity",
    "Unit",
    `Unit price (${money.currency})`,
    `Total (${money.currency})`,
    "Notes",
  ];

  // Amounts export as plain decimals rather than formatted currency so the
  // file opens in a spreadsheet as numbers you can sum.
  const lines = [
    header.join(","),
    ...rows.map((row) =>
      [
        row.purchaseDate,
        row.storeName ?? "",
        row.name,
        row.categoryName,
        row.quantity,
        row.unit ?? "",
        row.unitPriceMinor != null ? minorToInput(row.unitPriceMinor) : "",
        minorToInput(row.totalPriceMinor),
        row.notes ?? "",
      ]
        .map(csvCell)
        .join(","),
    ),
  ];

  // A BOM so Excel opens UTF-8 names (café, jalapeño) correctly.
  const body = `﻿${lines.join("\r\n")}\r\n`;
  const filename = `expenses-${filters.range.from}-to-${filters.range.to}.csv`;

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
