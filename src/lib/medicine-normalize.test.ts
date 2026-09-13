import { describe, expect, it } from "vitest";

import { extractMedicineMentionLines, normalizeMedicineMention } from "./medicine-normalize";

describe("normalizeMedicineMention", () => {
  it("strips a leading dosage form and formats spaced strength", () => {
    expect(normalizeMedicineMention("Tab. Paracetamol 500 mg")).toEqual({
      name: "Paracetamol",
      strength: "500 mg",
    });
  });

  it("adds a space between a number and its unit when missing", () => {
    expect(normalizeMedicineMention("Paracetamol 500mg")).toEqual({
      name: "Paracetamol",
      strength: "500 mg",
    });
  });

  it("handles a capsule form without a period", () => {
    expect(normalizeMedicineMention("Cap Azithromycin 250 mg")).toEqual({
      name: "Azithromycin",
      strength: "250 mg",
    });
  });

  it("keeps hyphenated names intact", () => {
    expect(normalizeMedicineMention("Domstal-DT 10mg")).toEqual({
      name: "Domstal-DT",
      strength: "10 mg",
    });
  });

  it("strips a trailing route/frequency token", () => {
    expect(normalizeMedicineMention("Inj. Augmentin 1.2g IV")).toEqual({
      name: "Augmentin",
      strength: "1.2 g",
    });
  });

  it("returns a null strength when none is present", () => {
    expect(normalizeMedicineMention("Vitamin C")).toEqual({ name: "Vitamin C", strength: null });
  });

  it("handles strength appearing before the name", () => {
    expect(normalizeMedicineMention("500 mg Paracetamol")).toEqual({
      name: "Paracetamol",
      strength: "500 mg",
    });
  });

  it("returns an empty name for blank input", () => {
    expect(normalizeMedicineMention("   ")).toEqual({ name: "", strength: null });
  });

  it("formats a combination-drug strength", () => {
    const result = normalizeMedicineMention("Augmentin 625mg");
    expect(result.name).toBe("Augmentin");
    expect(result.strength).toBe("625 mg");
  });
});

describe("extractMedicineMentionLines", () => {
  it("keeps lines with a dosage form or strength and drops plain prose", () => {
    const text = [
      "Doctor recommendation:",
      "Tab. Paracetamol 500 mg",
      "Azithromycin 500 mg",
      "Take plenty of rest and fluids.",
    ].join("\n");
    const lines = extractMedicineMentionLines(text);
    expect(lines).toContain("Tab. Paracetamol 500 mg");
    expect(lines).toContain("Azithromycin 500 mg");
    expect(lines).not.toContain("Take plenty of rest and fluids.");
    expect(lines).not.toContain("Doctor recommendation:");
  });

  it("returns an empty array for text with no medicine-like lines", () => {
    expect(extractMedicineMentionLines("Just rest and drink water.")).toEqual([]);
  });
});
