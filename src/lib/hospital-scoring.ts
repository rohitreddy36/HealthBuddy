// Pure hospital ranking logic. Distance alone is a bad proxy for "the right
// hospital", so this blends distance, specialty match, rating, review
// volume, and (optionally) facility/service match into one configurable
// score -- see README "Hospital ranking" for the rationale. Weights are
// data, not something baked into a UI component, so they can be tuned
// (or made an env/config value) without touching any React code.

export interface HospitalScoringWeights {
  distance: number;
  specialty: number;
  rating: number;
  review: number;
  facility: number;
}

// distance 35% + specialty match 35% + rating 15% + review count 10% +
// facility/service match 5%, per the product spec.
export const DEFAULT_HOSPITAL_SCORING_WEIGHTS: HospitalScoringWeights = {
  distance: 0.35,
  specialty: 0.35,
  rating: 0.15,
  review: 0.1,
  facility: 0.05,
};

export interface HospitalScoringInput {
  distanceKm: number;
  /** true = confirmed match, false = confirmed non-match, null = not evaluated. */
  specialtyMatch: boolean | null;
  /** 0-5 star rating, or null if unknown. */
  rating: number | null;
  reviewCount: number | null;
  facilityMatch?: boolean | null;
}

export interface HospitalScoreBreakdown {
  distance: number;
  specialty: number;
  rating: number;
  review: number;
  facility: number;
}

export interface HospitalScoreResult {
  score: number;
  breakdown: HospitalScoreBreakdown;
  ranking_reason: string;
}

const DEFAULT_MAX_RADIUS_KM = 15;

function clamp(n: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, n));
}

/** 100 at 0km, linearly down to 0 at maxRadiusKm (and beyond). */
export function distanceScore(distanceKm: number, maxRadiusKm = DEFAULT_MAX_RADIUS_KM): number {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) return 0;
  if (maxRadiusKm <= 0) return distanceKm === 0 ? 100 : 0;
  return clamp(100 * (1 - distanceKm / maxRadiusKm));
}

/** Unknown rating is scored neutrally (50) rather than punished. */
export function ratingScore(rating: number | null): number {
  if (rating == null || !Number.isFinite(rating)) return 50;
  return clamp((rating / 5) * 100);
}

/** Log-scaled so 1000+ reviews saturates the score instead of dominating it. */
export function reviewScore(reviewCount: number | null): number {
  if (!reviewCount || reviewCount <= 0) return 0;
  return clamp((100 * Math.log10(reviewCount + 1)) / Math.log10(1000));
}

export function specialtyScore(specialtyMatch: boolean | null): number {
  if (specialtyMatch === true) return 100;
  if (specialtyMatch === false) return 30;
  return 50;
}

export function facilityScore(facilityMatch: boolean | null | undefined): number {
  if (facilityMatch === true) return 100;
  if (facilityMatch === false) return 0;
  return 50;
}

// Human-readable label a card can show under the score. Deliberately avoids
// unsupported superlatives like "best hospital in the city" -- see spec
// section 7 ("Hospital map UI").
function buildRankingReason(
  breakdown: HospitalScoreBreakdown,
  distanceKm: number,
  specialtyMatch: boolean | null,
): string {
  const strongSpecialty = breakdown.specialty >= 90;
  const veryClose = distanceKm <= 3;

  if (strongSpecialty && veryClose) {
    return "Best match — strong specialty match and close to your location";
  }
  if (strongSpecialty) return "Strong specialty match nearby";
  if (veryClose) return "Closest relevant hospital to your location";
  if (breakdown.rating >= 85 && breakdown.review >= 60) {
    return "Highly rated nearby, with many reviews";
  }
  if (breakdown.rating >= 85) return "Highly rated nearby";
  if (specialtyMatch === false) return "General hospital nearby — specialty match not confirmed";
  return "Reasonable balance of distance and rating";
}

export function computeHospitalScore(
  input: HospitalScoringInput,
  weights: HospitalScoringWeights = DEFAULT_HOSPITAL_SCORING_WEIGHTS,
  maxRadiusKm = DEFAULT_MAX_RADIUS_KM,
): HospitalScoreResult {
  const breakdown: HospitalScoreBreakdown = {
    distance: distanceScore(input.distanceKm, maxRadiusKm),
    specialty: specialtyScore(input.specialtyMatch),
    rating: ratingScore(input.rating),
    review: reviewScore(input.reviewCount),
    facility: facilityScore(input.facilityMatch),
  };

  const weightSum =
    weights.distance + weights.specialty + weights.rating + weights.review + weights.facility || 1;

  const rawScore =
    breakdown.distance * weights.distance +
    breakdown.specialty * weights.specialty +
    breakdown.rating * weights.rating +
    breakdown.review * weights.review +
    breakdown.facility * weights.facility;

  const score = Math.round((rawScore / weightSum) * 10) / 10;

  return {
    score,
    breakdown,
    ranking_reason: buildRankingReason(breakdown, input.distanceKm, input.specialtyMatch),
  };
}
