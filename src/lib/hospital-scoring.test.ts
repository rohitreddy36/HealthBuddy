import { describe, expect, it } from "vitest";

import {
  computeHospitalScore,
  DEFAULT_HOSPITAL_SCORING_WEIGHTS,
  distanceScore,
  facilityScore,
  ratingScore,
  reviewScore,
  specialtyScore,
} from "./hospital-scoring";

describe("distanceScore", () => {
  it("is 100 at zero distance and 0 at/after the radius", () => {
    expect(distanceScore(0, 15)).toBe(100);
    expect(distanceScore(15, 15)).toBe(0);
    expect(distanceScore(50, 15)).toBe(0);
  });

  it("decreases linearly within the radius", () => {
    expect(distanceScore(7.5, 15)).toBeCloseTo(50, 5);
  });
});

describe("ratingScore", () => {
  it("is neutral (50) when unknown", () => {
    expect(ratingScore(null)).toBe(50);
  });
  it("scales 0-5 stars to 0-100", () => {
    expect(ratingScore(5)).toBe(100);
    expect(ratingScore(0)).toBe(0);
    expect(ratingScore(2.5)).toBe(50);
  });
});

describe("reviewScore", () => {
  it("is 0 for no reviews", () => {
    expect(reviewScore(null)).toBe(0);
    expect(reviewScore(0)).toBe(0);
  });
  it("saturates near 1000+ reviews", () => {
    expect(reviewScore(1000)).toBeGreaterThanOrEqual(99);
    expect(reviewScore(5000)).toBe(100);
  });
});

describe("specialtyScore / facilityScore", () => {
  it("rewards a confirmed match, penalizes a confirmed non-match, stays neutral when unknown", () => {
    expect(specialtyScore(true)).toBe(100);
    expect(specialtyScore(false)).toBe(30);
    expect(specialtyScore(null)).toBe(50);
    expect(facilityScore(true)).toBe(100);
    expect(facilityScore(false)).toBe(0);
    expect(facilityScore(undefined)).toBe(50);
  });
});

describe("computeHospitalScore", () => {
  it("weights default to the documented 35/35/15/10/5 split", () => {
    expect(DEFAULT_HOSPITAL_SCORING_WEIGHTS).toEqual({
      distance: 0.35,
      specialty: 0.35,
      rating: 0.15,
      review: 0.1,
      facility: 0.05,
    });
  });

  it("scores a close, specialty-matched, well-rated hospital highly with a 'Best match' reason", () => {
    const result = computeHospitalScore({
      distanceKm: 1,
      specialtyMatch: true,
      rating: 4.6,
      reviewCount: 500,
    });
    expect(result.score).toBeGreaterThan(85);
    expect(result.ranking_reason).toMatch(/Best match/i);
  });

  it("labels a very close hospital as the closest relevant one when specialty isn't a strong match", () => {
    const result = computeHospitalScore({
      distanceKm: 0.5,
      specialtyMatch: false,
      rating: null,
      reviewCount: null,
    });
    expect(result.ranking_reason).toMatch(/closest relevant hospital/i);
  });

  it("labels a distant but highly-rated, well-reviewed hospital as highly rated nearby", () => {
    const result = computeHospitalScore({
      distanceKm: 10,
      specialtyMatch: null,
      rating: 4.9,
      reviewCount: 2000,
    });
    expect(result.ranking_reason).toMatch(/highly rated/i);
  });

  it("respects custom weights", () => {
    const distanceOnly = computeHospitalScore(
      { distanceKm: 0, specialtyMatch: false, rating: null, reviewCount: null },
      { distance: 1, specialty: 0, rating: 0, review: 0, facility: 0 },
    );
    expect(distanceOnly.score).toBe(100);
  });

  it("never returns a score outside 0-100", () => {
    const result = computeHospitalScore({
      distanceKm: 1000,
      specialtyMatch: false,
      rating: 0,
      reviewCount: 0,
      facilityMatch: false,
    });
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});
