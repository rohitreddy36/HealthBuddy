import type {
  NormalizedHospital,
  PlacesProvider,
  PlacesSearchParams,
  PlacesSearchResult,
} from "./types";

// SerpApi's Google Maps engine (https://serpapi.com/google-maps-api) --
// server-only, key never reaches the client. The free tier has a limited
// monthly search quota, so callers MUST go through the Supabase-backed
// cache in hospital-cache.server.ts rather than hitting this on every
// request; see spec sections 9-10 (SerpApi integration / caching).
const SERPAPI_URL = "https://serpapi.com/search.json";

interface SerpApiLocalResult {
  title?: string;
  place_id?: string;
  data_id?: string;
  gps_coordinates?: { latitude?: number; longitude?: number };
  rating?: number;
  reviews?: number;
  address?: string;
  phone?: string;
  website?: string;
}

function radiusToZoom(radiusKm: number): number {
  if (radiusKm <= 2) return 15;
  if (radiusKm <= 5) return 14;
  if (radiusKm <= 10) return 13;
  if (radiusKm <= 20) return 12;
  return 11;
}

function buildQuery(specialty?: string | null): string {
  const trimmed = specialty?.trim();
  if (trimmed && trimmed.toLowerCase() !== "general medicine") {
    return `${trimmed} hospital`;
  }
  return "hospital";
}

// Normalizes one SerpApi local_results entry into our internal Hospital
// shape. We do NOT trust the raw payload blindly (spec section 9) -- any
// entry missing coordinates or a name is dropped rather than guessed at.
function normalize(result: SerpApiLocalResult): NormalizedHospital | null {
  const lat = result.gps_coordinates?.latitude;
  const lng = result.gps_coordinates?.longitude;
  if (typeof lat !== "number" || typeof lng !== "number" || !result.title) return null;

  return {
    source: "serpapi",
    sourceId: result.place_id ?? result.data_id ?? null,
    name: result.title,
    address: result.address ?? null,
    latitude: lat,
    longitude: lng,
    rating: typeof result.rating === "number" ? result.rating : null,
    reviewCount: typeof result.reviews === "number" ? result.reviews : null,
    phone: result.phone ?? null,
    website: result.website ?? null,
  };
}

export function createSerpApiPlacesProvider(): PlacesProvider {
  return {
    name: "serpapi",
    async searchHospitals(params: PlacesSearchParams): Promise<PlacesSearchResult> {
      const apiKey = process.env.SERPAPI_API_KEY;
      if (!apiKey) {
        return {
          hospitals: [],
          providerStatus: "unconfigured",
          providerName: "serpapi",
          message:
            "Hospital discovery isn't configured yet. Add a SERPAPI_API_KEY to enable live hospital search.",
        };
      }

      const zoom = radiusToZoom(params.radiusKm);
      const url = new URL(SERPAPI_URL);
      url.searchParams.set("engine", "google_maps");
      url.searchParams.set("type", "search");
      url.searchParams.set("q", buildQuery(params.specialty));
      url.searchParams.set("ll", `@${params.latitude},${params.longitude},${zoom}z`);
      url.searchParams.set("api_key", apiKey);

      try {
        const res = await fetch(url.toString());
        if (!res.ok) {
          return {
            hospitals: [],
            providerStatus: "error",
            providerName: "serpapi",
            message: `Hospital search failed (HTTP ${res.status}).`,
          };
        }

        const body = (await res.json()) as { local_results?: SerpApiLocalResult[]; error?: string };
        if (body.error) {
          return {
            hospitals: [],
            providerStatus: "error",
            providerName: "serpapi",
            message: body.error,
          };
        }

        const hospitals = (body.local_results ?? [])
          .map(normalize)
          .filter((h): h is NormalizedHospital => h !== null);

        return { hospitals, providerStatus: "ok", providerName: "serpapi" };
      } catch (error) {
        console.error("[serpapi] hospital search failed", error);
        return {
          hospitals: [],
          providerStatus: "error",
          providerName: "serpapi",
          message: "Hospital search failed unexpectedly.",
        };
      }
    },
  };
}
