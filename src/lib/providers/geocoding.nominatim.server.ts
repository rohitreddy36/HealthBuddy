import type { GeocodeResult, GeocodingProvider } from "./types";

// Nominatim's usage policy caps unauthenticated use to ~1 request/second and
// requires a descriptive User-Agent -- fine for on-demand, user-triggered
// geocodes (typing a city/PIN code) but this must never run in a batch loop.
// https://operations.osmfoundation.org/policies/nominatim/
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "HealthBuddy-HospitalFinder/1.0 (+https://github.com/; contact via app support)";

export const nominatimGeocodingProvider: GeocodingProvider = {
  name: "nominatim",
  async geocode(query: string): Promise<GeocodeResult | null> {
    const trimmed = query.trim();
    if (!trimmed) return null;

    const url = new URL(NOMINATIM_URL);
    url.searchParams.set("q", trimmed);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "1");

    try {
      const res = await fetch(url.toString(), {
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      });
      if (!res.ok) return null;

      const results = (await res.json()) as Array<{
        lat: string;
        lon: string;
        display_name: string;
      }>;
      const first = results[0];
      if (!first) return null;

      const latitude = Number.parseFloat(first.lat);
      const longitude = Number.parseFloat(first.lon);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

      return { latitude, longitude, displayName: first.display_name };
    } catch (error) {
      console.error("[nominatim] geocode failed", error);
      return null;
    }
  },
};
