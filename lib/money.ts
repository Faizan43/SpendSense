/**
 * Money is stored and passed around as an integer number of minor units
 * (pence for GBP, cents for USD/EUR). Floats are never used to hold an amount —
 * they only appear at the display edge, inside Intl formatting.
 */

export const MINOR_UNITS_PER_MAJOR = 100;

/** Currencies the app offers. `symbol` is only for compact inline hints. */
export const CURRENCIES = [
  { code: "GBP", symbol: "£", label: "British Pound" },
  { code: "USD", symbol: "$", label: "US Dollar" },
  { code: "EUR", symbol: "€", label: "Euro" },
  { code: "CAD", symbol: "$", label: "Canadian Dollar" },
  { code: "AUD", symbol: "$", label: "Australian Dollar" },
  { code: "INR", symbol: "₹", label: "Indian Rupee" },
  { code: "PKR", symbol: "₨", label: "Pakistani Rupee" },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]["code"];

export const DEFAULT_CURRENCY: CurrencyCode = "GBP";

export function currencySymbol(code: string): string {
  return CURRENCIES.find((c) => c.code === code)?.symbol ?? "";
}

/**
 * Parse user/OCR input into minor units without ever multiplying a float.
 * Accepts "12.34", "£12.34", "1,234.56", "1.234,56", "12", 12.34.
 * Returns null for blank/unparseable input so callers can distinguish
 * "not provided" from zero.
 */
export function parseMoneyToMinor(
  raw: string | number | null | undefined,
): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number") {
    if (!Number.isFinite(raw)) return null;
    return Math.round(raw * MINOR_UNITS_PER_MAJOR);
  }

  const cleaned = raw.trim().replace(/[^\d.,-]/g, "");
  if (cleaned === "" || cleaned === "-" || cleaned === "." || cleaned === ",") {
    return null;
  }

  const negative = cleaned.startsWith("-");
  const digits = cleaned.replace(/-/g, "");

  const lastComma = digits.lastIndexOf(",");
  const lastDot = digits.lastIndexOf(".");
  // With both separators present, whichever comes last is the decimal point.
  // With only one, a comma followed by exactly three digits is a thousands
  // separator ("1,234" = 1234) while a dot is always decimal ("1.005" = 1.01),
  // because a bare dot is the decimal point in the locales this app targets
  // and reading it as thousands would inflate an amount a hundredfold.
  let decimalSep = "";
  if (lastComma >= 0 && lastDot >= 0) {
    decimalSep = lastComma > lastDot ? "," : ".";
  } else if (lastComma >= 0 || lastDot >= 0) {
    const sep = lastComma >= 0 ? "," : ".";
    const tail = digits.slice(digits.lastIndexOf(sep) + 1);
    const isThousands =
      sep === "," && tail.length === 3 && digits.split(sep).length === 2;
    decimalSep = isThousands ? "" : sep;
  }

  let intPart = digits;
  let fracPart = "";
  if (decimalSep) {
    const idx = digits.lastIndexOf(decimalSep);
    intPart = digits.slice(0, idx);
    fracPart = digits.slice(idx + 1);
  }
  intPart = intPart.replace(/[.,]/g, "");
  fracPart = fracPart.replace(/[.,]/g, "");

  if (intPart === "" && fracPart === "") return null;
  if (!/^\d*$/.test(intPart) || !/^\d*$/.test(fracPart)) return null;

  // Round rather than truncate when more than 2 decimals are supplied.
  const roundUp = fracPart.length > 2 && Number(fracPart[2]) >= 5;
  const twoDp = (fracPart + "00").slice(0, 2);

  const minor =
    Number(intPart || "0") * MINOR_UNITS_PER_MAJOR +
    Number(twoDp) +
    (roundUp ? 1 : 0);

  if (!Number.isSafeInteger(minor)) return null;
  return negative ? -minor : minor;
}

/** Minor units as a plain decimal number, for chart axes and calculations. */
export function toMajor(minor: number): number {
  return minor / MINOR_UNITS_PER_MAJOR;
}

/** Minor units as an editable "12.34" string for form inputs. */
export function minorToInput(minor: number | null | undefined): string {
  if (minor === null || minor === undefined) return "";
  const sign = minor < 0 ? "-" : "";
  const abs = Math.abs(minor);
  const whole = Math.floor(abs / MINOR_UNITS_PER_MAJOR);
  const frac = String(abs % MINOR_UNITS_PER_MAJOR).padStart(2, "0");
  return `${sign}${whole}.${frac}`;
}

export function formatMoney(
  minor: number | null | undefined,
  currency: string = DEFAULT_CURRENCY,
  locale = "en-GB",
): string {
  const value = toMajor(minor ?? 0);
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/** Compact form for chart axes and tight cards: £1.2k, £340 */
export function formatMoneyCompact(
  minor: number | null | undefined,
  currency: string = DEFAULT_CURRENCY,
  locale = "en-GB",
): string {
  const value = toMajor(minor ?? 0);
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    notation: Math.abs(value) >= 10_000 ? "compact" : "standard",
    maximumFractionDigits: Math.abs(value) >= 1000 ? 0 : 2,
    minimumFractionDigits: 0,
  }).format(value);
}

/** quantity × unit price, rounded to the nearest minor unit. */
export function lineTotalMinor(
  unitPriceMinor: number | null | undefined,
  quantity: number | null | undefined,
): number | null {
  if (unitPriceMinor === null || unitPriceMinor === undefined) return null;
  const qty = quantity ?? 1;
  if (!Number.isFinite(qty)) return null;
  return Math.round(unitPriceMinor * qty);
}

/** total ÷ quantity, rounded — used when a receipt only prints line totals. */
export function unitPriceMinor(
  totalMinor: number | null | undefined,
  quantity: number | null | undefined,
): number | null {
  if (totalMinor === null || totalMinor === undefined) return null;
  const qty = quantity ?? 1;
  if (!Number.isFinite(qty) || qty === 0) return null;
  return Math.round(totalMinor / qty);
}

export function sumMinor(values: Array<number | null | undefined>): number {
  return values.reduce<number>((acc, v) => acc + (v ?? 0), 0);
}

/** Percentage of budget used, clamped at 0 and uncapped above 100. */
export function percentOf(spentMinor: number, budgetMinor: number): number {
  if (budgetMinor <= 0) return 0;
  return Math.max(0, (spentMinor / budgetMinor) * 100);
}

export type BudgetStatus = "on-track" | "warning" | "danger" | "over";

export function budgetStatus(percent: number): BudgetStatus {
  if (percent > 100) return "over";
  if (percent >= 90) return "danger";
  if (percent >= 70) return "warning";
  return "on-track";
}

export const BUDGET_STATUS_CLASSES: Record<
  BudgetStatus,
  { bar: string; text: string; label: string }
> = {
  "on-track": {
    bar: "bg-success",
    text: "text-success",
    label: "On track",
  },
  warning: { bar: "bg-warning", text: "text-warning", label: "Approaching" },
  danger: {
    bar: "bg-destructive",
    text: "text-destructive",
    label: "Nearly spent",
  },
  over: { bar: "bg-destructive", text: "text-destructive", label: "Over" },
};
