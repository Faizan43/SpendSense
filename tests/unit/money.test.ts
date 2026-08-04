import { describe, expect, it } from "vitest";

import {
  budgetStatus,
  formatMoney,
  lineTotalMinor,
  minorToInput,
  parseMoneyToMinor,
  percentOf,
  sumMinor,
  unitPriceMinor,
} from "@/lib/money";

describe("parseMoneyToMinor", () => {
  it("parses plain decimals exactly", () => {
    expect(parseMoneyToMinor("12.34")).toBe(1234);
    expect(parseMoneyToMinor("0.05")).toBe(5);
    expect(parseMoneyToMinor("100")).toBe(10000);
  });

  it("does not lose a penny to floating point", () => {
    // 19.99 * 100 is 1998.9999999999998 in IEEE754 — the string path avoids it.
    expect(parseMoneyToMinor("19.99")).toBe(1999);
    expect(parseMoneyToMinor("0.29")).toBe(29);
    expect(parseMoneyToMinor("1.10")).toBe(110);
  });

  it("strips currency symbols and spaces", () => {
    expect(parseMoneyToMinor("£12.34")).toBe(1234);
    expect(parseMoneyToMinor(" $ 7.50 ")).toBe(750);
  });

  it("handles thousands separators in both conventions", () => {
    expect(parseMoneyToMinor("1,234.56")).toBe(123456);
    expect(parseMoneyToMinor("1.234,56")).toBe(123456);
    expect(parseMoneyToMinor("1,234")).toBe(123400);
  });

  it("rounds beyond two decimal places", () => {
    expect(parseMoneyToMinor("1.005")).toBe(101);
    expect(parseMoneyToMinor("1.004")).toBe(100);
  });

  it("handles negatives for discount lines", () => {
    expect(parseMoneyToMinor("-2.50")).toBe(-250);
  });

  it("returns null for blank or unparseable input", () => {
    expect(parseMoneyToMinor("")).toBeNull();
    expect(parseMoneyToMinor(null)).toBeNull();
    expect(parseMoneyToMinor(undefined)).toBeNull();
    expect(parseMoneyToMinor("abc")).toBeNull();
    expect(parseMoneyToMinor("-")).toBeNull();
  });

  it("round-trips through the input formatter", () => {
    for (const value of ["0.01", "9.99", "1234.05", "-2.50"]) {
      const minor = parseMoneyToMinor(value)!;
      expect(parseMoneyToMinor(minorToInput(minor))).toBe(minor);
    }
  });
});

describe("line arithmetic", () => {
  it("multiplies quantity by unit price and rounds to the penny", () => {
    expect(lineTotalMinor(129, 3)).toBe(387);
    expect(lineTotalMinor(100, 0.75)).toBe(75);
    expect(lineTotalMinor(333, 3)).toBe(999);
  });

  it("derives a unit price from a printed line total", () => {
    expect(unitPriceMinor(387, 3)).toBe(129);
    expect(unitPriceMinor(100, 3)).toBe(33);
    expect(unitPriceMinor(100, 0)).toBeNull();
  });

  it("sums nullable amounts without producing NaN", () => {
    expect(sumMinor([100, null, 250, undefined])).toBe(350);
    expect(sumMinor([])).toBe(0);
  });
});

describe("budget maths", () => {
  it("computes percentage used", () => {
    expect(percentOf(32000, 40000)).toBe(80);
    expect(percentOf(0, 40000)).toBe(0);
    expect(percentOf(50000, 40000)).toBeCloseTo(125);
  });

  it("treats a zero budget as not started rather than dividing by zero", () => {
    expect(percentOf(1000, 0)).toBe(0);
  });

  it("bands the status", () => {
    expect(budgetStatus(10)).toBe("on-track");
    expect(budgetStatus(75)).toBe("warning");
    expect(budgetStatus(95)).toBe("danger");
    expect(budgetStatus(120)).toBe("over");
  });
});

describe("formatMoney", () => {
  it("formats to the currency and locale", () => {
    expect(formatMoney(123456, "GBP", "en-GB")).toBe("£1,234.56");
    expect(formatMoney(0, "GBP", "en-GB")).toBe("£0.00");
  });
});
