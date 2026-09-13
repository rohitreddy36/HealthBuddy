import { describe, expect, it } from "vitest";

import { buildMedicineSearchUrls } from "./medicine-search-url";

describe("buildMedicineSearchUrls", () => {
  it("includes the medicine name and strength in both queries", () => {
    const urls = buildMedicineSearchUrls("Paracetamol", "500 mg");
    expect(decodeURIComponent(urls.buyOnline)).toContain("Paracetamol 500 mg buy online");
    expect(decodeURIComponent(urls.pharmacyNearMe)).toContain(
      "Paracetamol 500 mg pharmacy near me",
    );
  });

  it("only points at google.com/search", () => {
    const urls = buildMedicineSearchUrls("Ibuprofen");
    expect(urls.buyOnline.startsWith("https://www.google.com/search?q=")).toBe(true);
    expect(urls.pharmacyNearMe.startsWith("https://www.google.com/search?q=")).toBe(true);
  });

  it("handles a missing strength gracefully", () => {
    const urls = buildMedicineSearchUrls("Vitamin C", null);
    expect(decodeURIComponent(urls.buyOnline)).toBe(
      "https://www.google.com/search?q=Vitamin C buy online",
    );
  });
});
