/**
 * Mirror of public.normalize_name() in supabase/migrations/0001_schema.sql.
 * Both sides must agree or the same shop will appear twice in the store list.
 */
export function normalizeName(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    // Apostrophes are dropped rather than turned into a space, so
    // "Sainsbury's" and "Sainsburys" collapse to the same key.
    .replace(/['’`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Receipt headers are noisy: "TESCO EXTRA 4471", "SAINSBURY'S LOCAL - CAMDEN".
 * Strip the branch identifiers so trips to the same chain group together, while
 * keeping the original text as the display name.
 */
const STORE_NOISE = [
  /\b(store|branch|ltd|limited|plc|uk|the)\b/g,
  /\b(extra|express|local|metro|superstore|megastore|supermarket|market)\b/g,
  /\b\d{2,}\b/g,
];

export function normalizeStoreName(input: string | null | undefined): string {
  let s = normalizeName(input);
  for (const pattern of STORE_NOISE) s = s.replace(pattern, " ");
  s = s.replace(/\s+/g, " ").trim();
  // If stripping left nothing (a shop genuinely called "The Market"), fall back
  // to the plain normalisation rather than collapsing it to an empty key.
  return s || normalizeName(input);
}

/**
 * Product lines carry weights, multipliers and offer text. Removing them lets
 * "Milk 2L", "MILK 2 L" and "Milk 2L *" share one price history.
 */
export function normalizeProductName(input: string | null | undefined): string {
  let s = normalizeName(input);
  s = s
    .replace(/\b\d+(\.\d+)?\s?(kg|g|mg|l|ml|cl|oz|lb|pk|pack|ct|x)\b/g, " ")
    .replace(/\b\d+\s?x\s?\d+\b/g, " ")
    .replace(
      /\b(offer|multibuy|clubcard|nectar|price|match|reduced|save|was|now)\b/g,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();
  return s || normalizeName(input);
}

/** Title-case a normalized name for display when no original text survives. */
export function titleCase(input: string): string {
  return input.replace(/\b[a-z]/g, (c) => c.toUpperCase());
}
