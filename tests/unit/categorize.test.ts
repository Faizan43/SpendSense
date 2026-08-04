import { describe, expect, it } from "vitest";

import { createResolver } from "@/lib/categorize/resolve";
import type { CategoryRow, CategoryRuleRow } from "@/lib/types/database";

const now = new Date().toISOString();

function category(slug: string, name: string): CategoryRow {
  return {
    id: `cat-${slug}`,
    user_id: "user-1",
    slug,
    name,
    icon: "package",
    chart_slot: 1,
    is_system: true,
    sort_order: 0,
    created_at: now,
    updated_at: now,
  };
}

function rule(
  pattern: string,
  slug: string,
  source: CategoryRuleRow["source"],
  priority: number,
): CategoryRuleRow {
  return {
    id: `rule-${pattern}-${source}`,
    user_id: "user-1",
    category_id: `cat-${slug}`,
    pattern,
    match_type: "contains",
    priority,
    source,
    created_at: now,
    updated_at: now,
  };
}

const categories = [
  category("dairy", "Dairy"),
  category("snacks", "Snacks"),
  category("beverages", "Beverages"),
  category("frozen", "Frozen"),
  category("fruit-vegetables", "Fruit & Vegetables"),
  category("other", "Other"),
];

const systemRules = [
  rule("milk", "dairy", "system", 100),
  rule("chocolate", "snacks", "system", 100),
  rule("hot chocolate", "beverages", "system", 100),
  rule("peas", "fruit-vegetables", "system", 100),
  rule("frozen peas", "frozen", "system", 100),
];

describe("category resolution order", () => {
  it("prefers a rule the user wrote over everything else", () => {
    const resolver = createResolver({
      categories,
      rules: [...systemRules, rule("milk", "beverages", "user", 10)],
      products: [{ normalized_name: "milk", default_category_id: "cat-dairy" }],
    });

    const result = resolver.resolve("Milk", "dairy", 0.99);
    expect(result.categoryId).toBe("cat-beverages");
    expect(result.source).toBe("user");
  });

  it("falls back to what this product was filed under last time", () => {
    const resolver = createResolver({
      categories,
      rules: systemRules,
      products: [
        { normalized_name: "kombucha", default_category_id: "cat-beverages" },
      ],
    });

    const result = resolver.resolve("Kombucha", "snacks", 0.9);
    expect(result.categoryId).toBe("cat-beverages");
    expect(result.source).toBe("product");
  });

  it("uses the longest matching keyword, so specific beats general", () => {
    const resolver = createResolver({
      categories,
      rules: systemRules,
      products: [],
    });

    expect(resolver.resolve("Hot chocolate sachets").categoryId).toBe(
      "cat-beverages",
    );
    expect(resolver.resolve("Dark chocolate bar").categoryId).toBe("cat-snacks");
    expect(resolver.resolve("Frozen peas 1kg").categoryId).toBe("cat-frozen");
    expect(resolver.resolve("Garden peas").categoryId).toBe(
      "cat-fruit-vegetables",
    );
  });

  it("uses the receipt's suggestion only when no rule matches", () => {
    const resolver = createResolver({
      categories,
      rules: systemRules,
      products: [],
    });

    const result = resolver.resolve("Sriracha", "other", 0.4);
    expect(result.source).toBe("ai");
    expect(result.categoryId).toBe("cat-other");
    expect(result.confidence).toBe(0.4);
  });

  it("falls back to Other when nothing matches at all", () => {
    const resolver = createResolver({
      categories,
      rules: systemRules,
      products: [],
    });

    const result = resolver.resolve("Zzzz unknown thing");
    expect(result.categoryId).toBe("cat-other");
    expect(result.source).toBe("fallback");
  });

  it("ignores pack sizes when matching a remembered product", () => {
    const resolver = createResolver({
      categories,
      rules: [],
      products: [
        { normalized_name: "oat drink", default_category_id: "cat-dairy" },
      ],
    });

    expect(resolver.resolve("Oat Drink 1L").categoryId).toBe("cat-dairy");
    expect(resolver.resolve("OAT DRINK 500ml").categoryId).toBe("cat-dairy");
  });
});
