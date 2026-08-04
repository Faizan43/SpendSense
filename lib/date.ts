import {
  addDays,
  differenceInCalendarDays,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subMonths,
} from "date-fns";

/**
 * Purchase dates are calendar dates, not instants — `date` columns in Postgres
 * and `yyyy-MM-dd` strings everywhere else. Keeping them as strings avoids the
 * classic "receipt jumps to the previous day" timezone bug.
 */
export type DateString = string;

export function toDateString(d: Date): DateString {
  return format(d, "yyyy-MM-dd");
}

export function fromDateString(s: DateString): Date {
  return parseISO(s);
}

export function todayString(): DateString {
  return toDateString(new Date());
}

export function formatDate(s: DateString | null | undefined): string {
  if (!s) return "—";
  return format(parseISO(s), "d MMM yyyy");
}

export function formatDateShort(s: DateString | null | undefined): string {
  if (!s) return "—";
  return format(parseISO(s), "d MMM");
}

export function formatMonth(s: DateString): string {
  return format(parseISO(s), "MMMM yyyy");
}

export function formatMonthShort(s: DateString): string {
  return format(parseISO(s), "MMM yy");
}

/** First day of the month, as the canonical key for a budget period. */
export function monthKey(d: Date | DateString = new Date()): DateString {
  const date = typeof d === "string" ? parseISO(d) : d;
  return toDateString(startOfMonth(date));
}

export function shiftMonth(key: DateString, delta: number): DateString {
  return toDateString(subMonths(parseISO(key), -delta));
}

export type DateRange = { from: DateString; to: DateString };

export type RangePresetId =
  | "this-month"
  | "last-month"
  | "last-3-months"
  | "this-year"
  | "last-12-months"
  | "all-time"
  | "custom";

export const RANGE_PRESETS: Array<{ id: RangePresetId; label: string }> = [
  { id: "this-month", label: "This month" },
  { id: "last-month", label: "Last month" },
  { id: "last-3-months", label: "Last 3 months" },
  { id: "this-year", label: "This year" },
  { id: "last-12-months", label: "Last 12 months" },
  { id: "all-time", label: "All time" },
  { id: "custom", label: "Custom range" },
];

export function resolveRange(
  preset: RangePresetId,
  custom?: Partial<DateRange>,
): DateRange {
  const now = new Date();
  switch (preset) {
    case "last-month": {
      const m = subMonths(now, 1);
      return { from: toDateString(startOfMonth(m)), to: toDateString(endOfMonth(m)) };
    }
    case "last-3-months":
      return {
        from: toDateString(startOfMonth(subMonths(now, 2))),
        to: toDateString(endOfMonth(now)),
      };
    case "this-year":
      return {
        from: toDateString(startOfYear(now)),
        to: toDateString(endOfYear(now)),
      };
    case "last-12-months":
      return {
        from: toDateString(startOfMonth(subMonths(now, 11))),
        to: toDateString(endOfMonth(now)),
      };
    case "all-time":
      return { from: "1970-01-01", to: toDateString(endOfYear(now)) };
    case "custom":
      return {
        from: custom?.from || toDateString(startOfMonth(now)),
        to: custom?.to || toDateString(endOfMonth(now)),
      };
    case "this-month":
    default:
      return {
        from: toDateString(startOfMonth(now)),
        to: toDateString(endOfMonth(now)),
      };
  }
}

/** The equivalent window immediately before `range`, for period-over-period deltas. */
export function previousRange(range: DateRange): DateRange {
  const from = parseISO(range.from);
  const to = parseISO(range.to);
  const days = differenceInCalendarDays(to, from) + 1;
  return {
    from: toDateString(addDays(from, -days)),
    to: toDateString(addDays(to, -days)),
  };
}

export function currentMonthRange(): DateRange {
  const now = new Date();
  return {
    from: toDateString(startOfMonth(now)),
    to: toDateString(endOfMonth(now)),
  };
}

export function currentYearRange(): DateRange {
  const now = new Date();
  return {
    from: toDateString(startOfYear(now)),
    to: toDateString(endOfYear(now)),
  };
}

export function monthRange(key: DateString): DateRange {
  const d = parseISO(key);
  return { from: toDateString(startOfMonth(d)), to: toDateString(endOfMonth(d)) };
}

export function weekRange(d: Date, weekStartsOn: 0 | 1 = 1): DateRange {
  return {
    from: toDateString(startOfWeek(d, { weekStartsOn })),
    to: toDateString(endOfWeek(d, { weekStartsOn })),
  };
}

/** Days left in the month containing `d`, inclusive of today. */
export function daysRemainingInMonth(d: Date = new Date()): number {
  return differenceInCalendarDays(endOfMonth(d), d) + 1;
}

export function daysElapsedInMonth(d: Date = new Date()): number {
  return differenceInCalendarDays(d, startOfMonth(d)) + 1;
}

export function daysInMonth(d: Date = new Date()): number {
  return differenceInCalendarDays(endOfMonth(d), startOfMonth(d)) + 1;
}

export function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const seconds = Math.round((Date.now() - then) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return format(new Date(iso), "d MMM yyyy");
}
