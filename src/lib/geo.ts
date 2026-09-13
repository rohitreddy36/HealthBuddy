// Pure geo helpers shared by the hospital recommendation pipeline. No env
// access, no I/O -- safe to import from client or server code and to unit
// test directly (see geo.test.ts).

const EARTH_RADIUS_KM = 6371;

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

/** Great-circle distance between two coordinates, in kilometers. */
export function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/**
 * Rounds a coordinate to a fixed precision so nearby GPS points collapse to
 * the same cache bucket instead of missing the cache on every tiny jitter.
 * 2 decimal places is ~1.1km of latitude resolution -- coarse enough to
 * reuse hospital search results for "basically the same place", fine enough
 * that recommendations still feel local.
 */
export function roundCoordinate(value: number, precision = 2): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

export interface HospitalCacheKeyInput {
  latitude: number;
  longitude: number;
  radiusKm: number;
  specialty?: string | null;
}

/** Builds a stable cache key for a rounded location + radius + specialty. */
export function buildHospitalCacheKey({
  latitude,
  longitude,
  radiusKm,
  specialty,
}: HospitalCacheKeyInput): string {
  const lat = roundCoordinate(latitude);
  const lng = roundCoordinate(longitude);
  const radius = Math.round(radiusKm);
  const spec = specialty?.trim().toLowerCase() || "any";
  return `hospital:${lat}:${lng}:${radius}:${spec}`;
}

export function isValidCoordinate(latitude: unknown, longitude: unknown): boolean {
  return (
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}
