import { describe, expect, it } from "vitest";

import {
  buildHospitalCacheKey,
  haversineDistanceKm,
  isValidCoordinate,
  roundCoordinate,
} from "./geo";

describe("haversineDistanceKm", () => {
  it("returns ~0 for identical coordinates", () => {
    expect(haversineDistanceKm(12.9716, 77.5946, 12.9716, 77.5946)).toBeCloseTo(0, 5);
  });

  it("matches a known distance (Bangalore MG Road to Whitefield, ~15.5km)", () => {
    const d = haversineDistanceKm(12.9758, 77.6081, 12.9698, 77.75);
    expect(d).toBeGreaterThan(14);
    expect(d).toBeLessThan(17);
  });

  it("is symmetric", () => {
    const a = haversineDistanceKm(12.97, 77.59, 13.08, 80.27);
    const b = haversineDistanceKm(13.08, 80.27, 12.97, 77.59);
    expect(a).toBeCloseTo(b, 8);
  });
});

describe("roundCoordinate", () => {
  it("rounds to 2 decimals by default", () => {
    expect(roundCoordinate(12.97164512)).toBe(12.97);
    expect(roundCoordinate(77.594612)).toBe(77.59);
  });

  it("collapses tiny GPS jitter to the same value", () => {
    expect(roundCoordinate(12.97161)).toBe(roundCoordinate(12.97159));
  });
});

describe("buildHospitalCacheKey", () => {
  it("rounds coordinates and normalizes specialty casing", () => {
    const a = buildHospitalCacheKey({
      latitude: 12.97161,
      longitude: 77.59459,
      radiusKm: 10,
      specialty: "Pulmonology",
    });
    const b = buildHospitalCacheKey({
      latitude: 12.97159,
      longitude: 77.59461,
      radiusKm: 10,
      specialty: "pulmonology",
    });
    expect(a).toBe(b);
  });

  it("defaults specialty to 'any' when omitted", () => {
    const key = buildHospitalCacheKey({ latitude: 1, longitude: 2, radiusKm: 5 });
    expect(key).toBe("hospital:1:2:5:any");
  });
});

describe("isValidCoordinate", () => {
  it("accepts valid lat/lng pairs", () => {
    expect(isValidCoordinate(12.97, 77.59)).toBe(true);
    expect(isValidCoordinate(-90, -180)).toBe(true);
    expect(isValidCoordinate(90, 180)).toBe(true);
  });

  it("rejects out-of-range or non-numeric values", () => {
    expect(isValidCoordinate(91, 0)).toBe(false);
    expect(isValidCoordinate(0, 181)).toBe(false);
    expect(isValidCoordinate(NaN, 0)).toBe(false);
    expect(isValidCoordinate("12.9", 77.5)).toBe(false);
    expect(isValidCoordinate(undefined, undefined)).toBe(false);
  });
});
