import { describe, expect, it } from "vitest";

import { fuzzyMatchThreshold, levenshteinDistance, rankBySimilarity } from "./fuzzy-match";

describe("levenshteinDistance", () => {
  it("is 0 for identical strings", () => {
    expect(levenshteinDistance("paracetamol", "paracetamol")).toBe(0);
  });

  it("counts a single insertion", () => {
    expect(levenshteinDistance("paracetamol", "parachetamol")).toBe(1);
  });

  it("counts a single substitution", () => {
    expect(levenshteinDistance("cetirizine", "cetirizina")).toBe(1);
  });

  it("handles empty strings", () => {
    expect(levenshteinDistance("", "abc")).toBe(3);
    expect(levenshteinDistance("abc", "")).toBe(3);
  });
});

describe("fuzzyMatchThreshold", () => {
  it("scales with query length", () => {
    expect(fuzzyMatchThreshold(3)).toBe(1);
    expect(fuzzyMatchThreshold(6)).toBe(2);
    expect(fuzzyMatchThreshold(12)).toBe(3);
  });
});

describe("rankBySimilarity", () => {
  const items = [
    { name: "Paracetamol", generic_name: "Paracetamol", brand_names: ["Tylenol", "Crocin"] },
    { name: "Ibuprofen", generic_name: "Ibuprofen", brand_names: ["Advil"] },
    { name: "Cetirizine", generic_name: "Cetirizine", brand_names: ["Zyrtec"] },
  ];

  it("finds an exact-prefix match first", () => {
    const result = rankBySimilarity("Para", items);
    expect(result[0].name).toBe("Paracetamol");
  });

  it("matches a brand name", () => {
    const result = rankBySimilarity("tylenol", items);
    expect(result.map((r) => r.name)).toContain("Paracetamol");
  });

  it("tolerates a one-letter typo the way ILIKE substring matching cannot", () => {
    const result = rankBySimilarity("parachetamol", items);
    expect(result[0]?.name).toBe("Paracetamol");
  });

  it("returns nothing for an unrelated query", () => {
    const result = rankBySimilarity("xyzxyzxyz", items);
    expect(result).toHaveLength(0);
  });

  it("respects the limit", () => {
    const result = rankBySimilarity("in", items, 1);
    expect(result.length).toBeLessThanOrEqual(1);
  });
});
