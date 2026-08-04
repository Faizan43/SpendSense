import { normalizeProductName } from "@/lib/normalize";
import type {
  CategoryRow,
  CategoryRuleRow,
  CategorySource,
} from "@/lib/types/database";

export type CategoryResolution = {
  categoryId: string | null;
  source: CategorySource;
  confidence: number | null;
  /** Which rule or product matched, for the "why is this in Snacks?" tooltip. */
  matchedOn: string | null;
};

type ProductMemory = { normalized_name: string; default_category_id: string | null };

export type ResolverInput = {
  categories: CategoryRow[];
  rules: CategoryRuleRow[];
  products: ProductMemory[];
};

/**
 * Decides an item's category from cheapest, most certain signal to weakest:
 *
 *   1. an explicit rule the user wrote
 *   2. what this exact product was filed under last time
 *   3. the seeded keyword rules (and rules learned from past corrections)
 *   4. whatever the receipt extractor suggested
 *   5. Other
 *
 * Within a band the longest pattern wins, so "hot chocolate" beats "chocolate"
 * and "frozen peas" beats "peas" without hand-tuned priorities.
 */
export function createResolver({ categories, rules, products }: ResolverInput) {
  const bySlug = new Map(categories.map((c) => [c.slug, c]));
  const otherId = bySlug.get("other")?.id ?? categories[0]?.id ?? null;

  const productByName = new Map(
    products
      .filter((p) => p.default_category_id)
      .map((p) => [p.normalized_name, p.default_category_id as string]),
  );

  const sortRules = (list: CategoryRuleRow[]) =>
    [...list].sort(
      (a, b) => a.priority - b.priority || b.pattern.length - a.pattern.length,
    );

  const userRules = sortRules(rules.filter((r) => r.source === "user"));
  const otherRules = sortRules(rules.filter((r) => r.source !== "user"));

  const matches = (rule: CategoryRuleRow, haystack: string) => {
    const needle = rule.pattern.toLowerCase().trim();
    if (!needle) return false;
    switch (rule.match_type) {
      case "exact":
        return haystack === needle;
      case "prefix":
        return haystack.startsWith(needle);
      default:
        return haystack.includes(needle);
    }
  };

  return {
    otherCategoryId: otherId,

    resolve(
      rawName: string,
      aiCategorySlug?: string | null,
      aiConfidence?: number | null,
    ): CategoryResolution {
      const normalized = normalizeProductName(rawName);
      const haystack = normalized || rawName.toLowerCase().trim();

      for (const rule of userRules) {
        if (matches(rule, haystack)) {
          return {
            categoryId: rule.category_id,
            source: "user",
            confidence: 1,
            matchedOn: `your rule "${rule.pattern}"`,
          };
        }
      }

      const remembered = productByName.get(normalized);
      if (remembered) {
        return {
          categoryId: remembered,
          source: "product",
          confidence: 0.95,
          matchedOn: "how you filed this product before",
        };
      }

      for (const rule of otherRules) {
        if (matches(rule, haystack)) {
          return {
            categoryId: rule.category_id,
            source: "rule",
            confidence: rule.source === "learned" ? 0.9 : 0.7,
            matchedOn:
              rule.source === "learned"
                ? `a correction you made ("${rule.pattern}")`
                : `keyword "${rule.pattern}"`,
          };
        }
      }

      if (aiCategorySlug) {
        const category = bySlug.get(aiCategorySlug);
        if (category) {
          return {
            categoryId: category.id,
            source: "ai",
            confidence: aiConfidence ?? 0.6,
            matchedOn: "read from the receipt",
          };
        }
      }

      return {
        categoryId: otherId,
        source: "fallback",
        confidence: null,
        matchedOn: null,
      };
    },
  };
}

export type Resolver = ReturnType<typeof createResolver>;
