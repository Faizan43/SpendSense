import "server-only";

import { getBudgetProgress, getStoreComparison } from "@/lib/analytics/queries";
import {
  currentMonthRange,
  daysElapsedInMonth,
  daysInMonth,
  formatMonth,
  monthKey,
  resolveRange,
} from "@/lib/date";
import { formatMoney, percentOf } from "@/lib/money";
import { getMoneyFormat } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

export type Insight = {
  id: string;
  tone: "neutral" | "good" | "warning";
  title: string;
  body: string;
  href?: string;
  linkLabel?: string;
};

const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

/**
 * Observations are rule-based rather than model-generated: they have to be
 * exactly right about the user's own numbers, and "your snacks spending is up
 * 34%" is only useful if 34% is the actual figure.
 */
export async function generateInsights(): Promise<Insight[]> {
  const supabase = await createClient();
  const { currency, locale } = await getMoneyFormat();
  const fmt = (minor: number) => formatMoney(minor, currency, locale);

  const month = monthKey();
  const monthRange = currentMonthRange();
  const yearRange = resolveRange("last-12-months");

  const [movers, priceMovers, weekday, budgets, stores] = await Promise.all([
    supabase.rpc("fn_category_movers", { p_month: month }),
    supabase.rpc("fn_price_movers", {
      p_lookback_days: 180,
      p_min_purchases: 3,
      p_limit: 5,
    }),
    supabase.rpc("fn_weekday_pattern", {
      p_from: yearRange.from,
      p_to: yearRange.to,
    }),
    getBudgetProgress(month),
    getStoreComparison({
      preset: "last-12-months",
      range: yearRange,
      storeIds: [],
      categoryIds: [],
      minMinor: null,
      maxMinor: null,
      search: "",
    }),
  ]);

  const insights: Insight[] = [];

  // --- Budget pace ---------------------------------------------------------
  const overall = budgets.find((b) => b.category_id === null);
  if (overall) {
    const elapsed = daysElapsedInMonth();
    const projected = Math.round(
      (overall.spent_minor / Math.max(1, elapsed)) * daysInMonth(),
    );
    const pct = percentOf(projected, overall.amount_minor);

    insights.push({
      id: "budget-pace",
      tone: pct > 100 ? "warning" : "good",
      title:
        pct > 100
          ? `On pace to overspend by ${fmt(projected - overall.amount_minor)}`
          : `On pace to come in ${fmt(overall.amount_minor - projected)} under budget`,
      body: `You've spent ${fmt(overall.spent_minor)} of ${fmt(overall.amount_minor)} so far this month. Carrying on at this rate lands you at ${fmt(projected)} by the end of ${formatMonth(month)}.`,
      href: "/budgets",
      linkLabel: "Review budgets",
    });
  } else {
    insights.push({
      id: "no-budget",
      tone: "neutral",
      title: "No budget set for this month",
      body: "A monthly cap is what turns this from a record of the past into something that changes the next shop.",
      href: "/budgets",
      linkLabel: "Set a budget",
    });
  }

  // --- Category movers -----------------------------------------------------
  const significant = (movers.data ?? [])
    .filter((m) => m.previous_minor > 0 && Math.abs(m.delta_minor) > 500)
    .slice(0, 3);

  for (const mover of significant) {
    const pct = Math.round((mover.delta_minor / mover.previous_minor) * 100);
    if (Math.abs(pct) < 15) continue;

    insights.push({
      id: `mover-${mover.category_id ?? mover.category_name}`,
      tone: mover.delta_minor > 0 ? "warning" : "good",
      title: `${mover.category_name} is ${pct > 0 ? "up" : "down"} ${Math.abs(pct)}% this month`,
      body: `${fmt(mover.current_minor)} so far, against ${fmt(mover.previous_minor)} last month — a ${mover.delta_minor > 0 ? "rise" : "drop"} of ${fmt(Math.abs(mover.delta_minor))}.`,
      href: `/expenses?preset=this-month&categories=${mover.category_id ?? ""}`,
      linkLabel: "See the items",
    });
  }

  // --- Price movers --------------------------------------------------------
  for (const product of (priceMovers.data ?? []).slice(0, 3)) {
    const pct = Number(product.change_pct);
    if (Math.abs(pct) < 8) continue;

    insights.push({
      id: `price-${product.product_key}`,
      tone: pct > 0 ? "warning" : "good",
      title: `${product.product_name} is ${pct > 0 ? "up" : "down"} ${Math.abs(pct)}%`,
      body: `From ${fmt(product.first_unit_price_minor)} to ${fmt(product.last_unit_price_minor)} per unit across ${product.purchases} purchases in the last six months.`,
      href: `/products/${encodeURIComponent(product.product_key)}`,
      linkLabel: "See price history",
    });
  }

  // --- Store comparison ----------------------------------------------------
  const rankedStores = stores.filter((s) => s.trip_count >= 3);
  if (rankedStores.length >= 2) {
    const cheapest = [...rankedStores].sort(
      (a, b) => a.avg_trip_minor - b.avg_trip_minor,
    )[0];
    const dearest = [...rankedStores].sort(
      (a, b) => b.avg_trip_minor - a.avg_trip_minor,
    )[0];

    if (cheapest.store_id !== dearest.store_id) {
      const gap = dearest.avg_trip_minor - cheapest.avg_trip_minor;
      insights.push({
        id: "store-gap",
        tone: "neutral",
        title: `Your basket at ${dearest.store_name} averages ${fmt(gap)} more than at ${cheapest.store_name}`,
        body: `${fmt(dearest.avg_trip_minor)} versus ${fmt(cheapest.avg_trip_minor)} per trip. Basket sizes differ, so this is a prompt to look rather than a like-for-like price comparison.`,
        href: "/stores",
        linkLabel: "Compare stores",
      });
    }
  }

  // --- Weekday pattern -----------------------------------------------------
  const days = (weekday.data ?? []).filter((d) => d.trip_count > 0);
  if (days.length >= 3) {
    const busiest = [...days].sort((a, b) => b.total_minor - a.total_minor)[0];
    const share =
      busiest.total_minor /
      days.reduce((sum, d) => sum + d.total_minor, 0);

    if (share > 0.3) {
      insights.push({
        id: "weekday",
        tone: "neutral",
        title: `${WEEKDAYS[busiest.weekday - 1]} is your big shopping day`,
        body: `${Math.round(share * 100)}% of your spending happens on a ${WEEKDAYS[busiest.weekday - 1]}, across ${busiest.trip_count} trips.`,
      });
    }
  }

  // --- Uncategorised backlog ----------------------------------------------
  const { count: uncategorised } = await supabase
    .from("transaction_items")
    .select("id", { count: "exact", head: true })
    .is("category_id", null)
    .limit(1);

  if (uncategorised && uncategorised > 0) {
    insights.push({
      id: "uncategorised",
      tone: "neutral",
      title: `${uncategorised} items have no category`,
      body: "They still count towards your totals, but they won't show up in any category breakdown until they're filed.",
      href: "/expenses?categories=",
      linkLabel: "Sort them out",
    });
  }

  // Nothing to say is a legitimate outcome — better than padding with noise.
  if (insights.length === 0 && monthRange) {
    insights.push({
      id: "quiet",
      tone: "neutral",
      title: "Nothing unusual this month",
      body: "No big category swings, no notable price rises on the things you buy regularly.",
    });
  }

  return insights;
}
