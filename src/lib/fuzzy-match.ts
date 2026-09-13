// Small, dependency-free typo-tolerant matching used by both the medicine
// search server function (medicine-service.server.ts) and the Explore UI's
// live suggestions dropdown (explore/index.tsx). Pure logic, no DB/network,
// so it's safe to import from either side -- same pattern as geo.ts /
// hospital-scoring.ts.
//
// Why this exists: a plain ILIKE substring search (the original
// implementation) finds nothing for a one-letter typo like "parachetamol"
// -> "Paracetamol", which is exactly the kind of miss a medicine lookup
// tool shouldn't have. Rather than asking users to spell drug names
// perfectly, matching falls back to bounded edit-distance once a
// substring/prefix match comes up empty.

/** Classic Levenshtein edit distance (insertions/deletions/substitutions), case-sensitive -- callers should lowercase both inputs first. */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let prevRow = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const currRow = [i];
    for (let j = 1; j <= b.length; j++) {
      currRow.push(
        a[i - 1] === b[j - 1]
          ? prevRow[j - 1]
          : 1 + Math.min(prevRow[j - 1], prevRow[j], currRow[j - 1]),
      );
    }
    prevRow = currRow;
  }
  return prevRow[b.length];
}

/** How many edits are still "close enough" to count as a typo, scaled by query length so short queries don't match everything. */
export function fuzzyMatchThreshold(queryLength: number): number {
  if (queryLength <= 4) return 1;
  if (queryLength <= 8) return 2;
  return 3;
}

export interface FuzzyMatchable {
  name: string;
  generic_name?: string | null;
  brand_names?: readonly string[] | null;
}

/**
 * Ranks `items` against `query`: exact prefix match first, then substring
 * match (name/generic_name/brand), then a bounded-edit-distance ("typo")
 * fallback against name/generic_name only. Returns at most `limit` items,
 * best match first; items with no match at all (not even within the typo
 * threshold) are dropped rather than returned in some arbitrary order.
 */
export function rankBySimilarity<T extends FuzzyMatchable>(
  query: string,
  items: readonly T[],
  limit = 20,
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const threshold = fuzzyMatchThreshold(q.length);

  const scored = items
    .map((item) => {
      const name = item.name.toLowerCase();
      const generic = item.generic_name?.toLowerCase();
      const brands = item.brand_names?.map((b) => b.toLowerCase()) ?? [];

      let score: number;
      if (name.startsWith(q) || generic?.startsWith(q)) {
        score = 0;
      } else if (name.includes(q) || generic?.includes(q) || brands.some((b) => b.includes(q))) {
        score = 1;
      } else {
        const distance = Math.min(
          levenshteinDistance(q, name),
          generic ? levenshteinDistance(q, generic) : Infinity,
        );
        score = distance <= threshold ? 2 + distance : Infinity;
      }
      return { item, score };
    })
    .filter((s) => s.score !== Infinity)
    .sort((a, b) => a.score - b.score)
    .slice(0, limit);

  return scored.map((s) => s.item);
}
