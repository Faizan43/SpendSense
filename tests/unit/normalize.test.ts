import { describe, expect, it } from "vitest";

import {
  normalizeName,
  normalizeProductName,
  normalizeStoreName,
  titleCase,
} from "@/lib/normalize";

describe("normalizeName", () => {
  it("lowercases and collapses punctuation", () => {
    // The apostrophe is dropped, not spaced, so possessives match their
    // apostrophe-free spelling.
    expect(normalizeName("Sainsbury's Local!")).toBe("sainsburys local");
    expect(normalizeName("  double   spaces  ")).toBe("double spaces");
  });

  it("strips accents so café and cafe match", () => {
    expect(normalizeName("Café")).toBe(normalizeName("Cafe"));
  });

  it("handles empty input", () => {
    expect(normalizeName("")).toBe("");
    expect(normalizeName(null)).toBe("");
  });
});

describe("normalizeStoreName", () => {
  it("groups branches of the same chain", () => {
    expect(normalizeStoreName("TESCO EXTRA 4471")).toBe(
      normalizeStoreName("Tesco"),
    );
    expect(normalizeStoreName("Sainsbury's Local")).toBe(
      normalizeStoreName("SAINSBURYS"),
    );
  });

  it("does not collapse a shop whose whole name is noise words", () => {
    expect(normalizeStoreName("The Market")).not.toBe("");
  });
});

describe("normalizeProductName", () => {
  it("drops pack sizes so price history joins up", () => {
    expect(normalizeProductName("Semi Skimmed Milk 2L")).toBe(
      normalizeProductName("SEMI SKIMMED MILK"),
    );
    expect(normalizeProductName("Eggs 6 pack")).toBe(
      normalizeProductName("eggs"),
    );
  });

  it("drops promotional noise", () => {
    expect(normalizeProductName("Butter Clubcard Price")).toBe("butter");
  });

  it("never returns an empty key for a real product", () => {
    expect(normalizeProductName("500g")).not.toBe("");
  });
});

describe("titleCase", () => {
  it("capitalises each word", () => {
    expect(titleCase("semi skimmed milk")).toBe("Semi Skimmed Milk");
  });
});
