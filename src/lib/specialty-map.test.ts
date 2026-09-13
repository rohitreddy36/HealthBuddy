import { describe, expect, it } from "vitest";

import { fallbackTriage, splitSymptomsList } from "./specialty-map";

describe("fallbackTriage", () => {
  it("flags breathing difficulty as an emergency and routes to Pulmonology", () => {
    const result = fallbackTriage("Fever, persistent cough and difficulty breathing");
    expect(result.recommended_specialty).toBe("Pulmonology");
    expect(result.urgency).toBe("emergency");
  });

  it("keeps a mild, isolated symptom as routine", () => {
    const result = fallbackTriage("Mild headache since this morning");
    expect(result.recommended_specialty).toBe("Neurology");
    expect(result.urgency).toBe("routine");
  });

  it("bumps urgency to soon for a high fever without emergency keywords", () => {
    const result = fallbackTriage("High fever and body ache for two days");
    expect(result.urgency).toBe("soon");
  });

  it("falls back to General Medicine when nothing matches", () => {
    const result = fallbackTriage("Feeling generally unwell");
    expect(result.recommended_specialty).toBe("General Medicine");
    expect(result.urgency).toBe("routine");
  });

  it("is case-insensitive", () => {
    const result = fallbackTriage("SEVERE RASH AND ITCHING");
    expect(result.recommended_specialty).toBe("Dermatology");
  });
});

describe("splitSymptomsList", () => {
  it("splits on commas and 'and'", () => {
    expect(splitSymptomsList("Fever, persistent cough and difficulty breathing")).toEqual([
      "Fever",
      "persistent cough",
      "difficulty breathing",
    ]);
  });

  it("filters empty segments", () => {
    expect(splitSymptomsList("Fever,, cough")).toEqual(["Fever", "cough"]);
  });
});
