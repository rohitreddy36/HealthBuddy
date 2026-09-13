import { generateText } from "ai";
import { z } from "zod";

import { supabaseAdmin } from "@/integrations/supabase/client.server";

import { gateway, isGeminiConfigured, MODEL, parseAiJson } from "./ai.server";
import { buildHospitalCacheKey, haversineDistanceKm, isValidCoordinate } from "./geo";
import { readHospitalCache, writeHospitalCache } from "./hospital-cache.server";
import {
  computeHospitalScore,
  DEFAULT_HOSPITAL_SCORING_WEIGHTS,
  type HospitalScoringWeights,
} from "./hospital-scoring";
import { nominatimGeocodingProvider } from "./providers/geocoding.nominatim.server";
import { createSerpApiPlacesProvider } from "./providers/places.serpapi.server";
import type { NormalizedHospital, PlacesSearchResult, ProviderStatus } from "./providers/types";
import { fallbackTriage, splitSymptomsList, type TriageUrgency } from "./specialty-map";

// Feature A: Smart Nearby Hospital Recommendation.
//
// Pipeline: symptoms/specialty/report -> triage (specialty + urgency,
// never a diagnosis) -> resolve location -> cached/live places search ->
// distance + ranking -> response. See spec sections 2-10.

const DEFAULT_RADIUS_KM = 10;
const MAX_RADIUS_KM = 50;
const MAX_RESULTS = 15;

export const LOCATION_REQUIRED_MESSAGE =
  "Location access was not provided. Enter your city or area to find nearby hospitals.";

export const EMERGENCY_GUIDANCE =
  "Your symptoms may require urgent medical attention. Please seek emergency care immediately or call your local emergency number.";

// ---- Triage (Feature A step 1) -----------------------------------------

const triageSchema = z.object({
  symptoms: z.array(z.string()),
  possible_conditions: z.array(z.string()),
  recommended_specialty: z.string(),
  urgency: z.enum(["routine", "soon", "emergency"]),
});

export type HospitalTriage = z.infer<typeof triageSchema>;

const KNOWN_SPECIALTIES = [
  "General Medicine",
  "Emergency Medicine",
  "Pulmonology",
  "Cardiology",
  "ENT",
  "Gastroenterology",
  "Neurology",
  "Dermatology",
  "Orthopedics",
  "Pediatrics",
  "Gynecology",
  "Psychiatry",
];

function fallbackTriageResult(symptomsText: string): HospitalTriage {
  const fb = fallbackTriage(symptomsText);
  return {
    symptoms: splitSymptomsList(symptomsText),
    possible_conditions: [],
    recommended_specialty: fb.recommended_specialty,
    urgency: fb.urgency,
  };
}

/**
 * Structured, non-diagnostic triage from free-text symptoms. Never returns
 * a definite diagnosis -- only a relevant specialty and an urgency level,
 * per spec section 2 ("Use terminology such as... Never tell the user
 * 'You definitely have X disease.'").
 */
export async function triageForHospital(symptomsText: string): Promise<HospitalTriage> {
  if (!isGeminiConfigured()) return fallbackTriageResult(symptomsText);

  try {
    const provider = gateway();
    const { text } = await generateText({
      model: provider(MODEL),
      prompt: `Return ONLY valid JSON with this exact shape:
{"symptoms":["short symptom phrase"],"possible_conditions":["string"],"recommended_specialty":"string","urgency":"routine|soon|emergency"}

A user reports these symptoms: "${symptomsText}".

- List each individual symptom mentioned, in the user's own words where possible.
- List general possible conditions using neutral, non-diagnostic language (e.g. "possible viral infection", "possible seasonal allergy"). NEVER state a definite diagnosis. This can be an empty array if nothing specific comes to mind.
- Recommend exactly ONE relevant medical specialty from this list: ${KNOWN_SPECIALTIES.join(", ")}.
- Set "urgency" to "emergency" if the symptoms could indicate a medical emergency (e.g. severe difficulty breathing, chest pain, heavy bleeding, loss of consciousness, stroke signs), "soon" if a doctor should be seen within a day or two, otherwise "routine".`,
    });

    const parsed = parseAiJson(text, triageSchema);
    if (parsed && KNOWN_SPECIALTIES.includes(parsed.recommended_specialty)) return parsed;
    if (parsed) return { ...parsed, recommended_specialty: "General Medicine" };
  } catch (error) {
    console.error("[hospital-service] triage AI call failed", error);
  }

  return fallbackTriageResult(symptomsText);
}

// ---- Specialty match heuristic ------------------------------------------

// SerpApi/Google Maps results rarely carry structured medical-specialty
// tags, so this is a best-effort heuristic based on the hospital's name
// only. It intentionally returns `false` (not just "unknown") when a
// specialty has known hints and none matched, since most general hospitals
// won't spell out every department they run in their listed name -- see
// the "specialty match not confirmed" ranking reason this produces.
const SPECIALTY_NAME_HINTS: Record<string, string[]> = {
  Cardiology: ["heart", "cardiac", "cardio"],
  Pulmonology: ["chest", "lung", "pulmo", "respiratory"],
  ENT: ["ent ", "ear nose throat"],
  Orthopedics: ["ortho", "bone", "joint"],
  Pediatrics: ["children", "child", "kids", "pediatric", "paediatric"],
  Gynecology: ["women", "maternity", "obstetric", "gynec"],
  Dermatology: ["skin", "derma"],
  Neurology: ["neuro", "brain"],
  Gastroenterology: ["gastro", "digestive"],
  "Emergency Medicine": ["emergency", "trauma"],
};

export function matchesSpecialty(hospitalName: string, specialty: string | null): boolean | null {
  if (!specialty || specialty === "General Medicine") return null;
  const hints = SPECIALTY_NAME_HINTS[specialty];
  if (!hints) return null;
  const lower = hospitalName.toLowerCase();
  return hints.some((h) => lower.includes(h));
}

// ---- Location resolution -------------------------------------------------

export interface ResolvedLocation {
  latitude: number;
  longitude: number;
  resolvedFrom: "coordinates" | "geocoded";
  displayName?: string;
}

async function resolveLocation(input: {
  latitude?: number;
  longitude?: number;
  locationQuery?: string;
}): Promise<ResolvedLocation | null> {
  if (isValidCoordinate(input.latitude, input.longitude)) {
    return {
      latitude: input.latitude as number,
      longitude: input.longitude as number,
      resolvedFrom: "coordinates",
    };
  }
  if (input.locationQuery?.trim()) {
    const geo = await nominatimGeocodingProvider.geocode(input.locationQuery);
    if (geo) {
      return {
        latitude: geo.latitude,
        longitude: geo.longitude,
        resolvedFrom: "geocoded",
        displayName: geo.displayName,
      };
    }
  }
  return null;
}

// ---- Search + rank --------------------------------------------------------

export interface HospitalResultItem extends NormalizedHospital {
  distanceKm: number;
  specialtyMatch: boolean | null;
  score: number;
  ranking_reason: string;
}

async function persistHospitals(hospitals: NormalizedHospital[]): Promise<void> {
  const rows = hospitals
    .filter((h) => h.sourceId)
    .map((h) => ({
      source: h.source,
      source_id: h.sourceId,
      name: h.name,
      address: h.address,
      latitude: h.latitude,
      longitude: h.longitude,
      rating: h.rating,
      review_count: h.reviewCount,
      phone: h.phone,
      website: h.website,
    }));
  if (rows.length === 0) return;

  const { error } = await supabaseAdmin
    .from("hospitals")
    .upsert(rows, { onConflict: "source,source_id" });
  if (error) console.error("[hospital-service] failed to persist hospitals", error);
}

async function fetchAndRankHospitals(
  params: { latitude: number; longitude: number; radiusKm: number; specialty: string | null },
  weights: HospitalScoringWeights = DEFAULT_HOSPITAL_SCORING_WEIGHTS,
): Promise<{ hospitals: HospitalResultItem[]; providerStatus: ProviderStatus; message?: string }> {
  const cacheKey = buildHospitalCacheKey(params);
  let searchResult = await readHospitalCache<PlacesSearchResult>(cacheKey);

  if (!searchResult) {
    const provider = createSerpApiPlacesProvider();
    searchResult = await provider.searchHospitals(params);
    if (searchResult.providerStatus === "ok") {
      await writeHospitalCache(cacheKey, searchResult);
      void persistHospitals(searchResult.hospitals);
    }
  }

  const ranked = searchResult.hospitals
    .map((h) => {
      const distanceKm = haversineDistanceKm(
        params.latitude,
        params.longitude,
        h.latitude,
        h.longitude,
      );
      const specialtyMatch = matchesSpecialty(h.name, params.specialty);
      const { score, ranking_reason } = computeHospitalScore(
        { distanceKm, specialtyMatch, rating: h.rating, reviewCount: h.reviewCount },
        weights,
        Math.max(params.radiusKm, 5),
      );
      return {
        ...h,
        distanceKm: Math.round(distanceKm * 10) / 10,
        specialtyMatch,
        score,
        ranking_reason,
      };
    })
    // The provider's search radius is zoom-based (approximate), so trim
    // obvious outliers rather than trusting it exactly.
    .filter((h) => h.distanceKm <= params.radiusKm * 1.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RESULTS);

  return {
    hospitals: ranked,
    providerStatus: searchResult.providerStatus,
    message: searchResult.message,
  };
}

export interface HospitalSearchResponse {
  specialty: string;
  urgency: TriageUrgency;
  possibleConditions: string[];
  symptoms: string[];
  hospitals: HospitalResultItem[];
  providerStatus: ProviderStatus | "location_required";
  message?: string;
  emergency: boolean;
  location: ResolvedLocation | null;
}

function clampRadius(radiusKm?: number): number {
  if (!radiusKm || !Number.isFinite(radiusKm) || radiusKm <= 0) return DEFAULT_RADIUS_KM;
  return Math.min(radiusKm, MAX_RADIUS_KM);
}

export interface NearbyHospitalsInput {
  latitude?: number;
  longitude?: number;
  locationQuery?: string;
  radiusKm?: number;
  specialty?: string;
}

/** GET /api/hospitals/nearby: a plain lat/lng/radius/specialty search, no triage. */
export async function nearbyHospitals(
  input: NearbyHospitalsInput,
): Promise<HospitalSearchResponse> {
  const radiusKm = clampRadius(input.radiusKm);
  const specialty = input.specialty?.trim() || null;
  const location = await resolveLocation(input);

  if (!location) {
    return {
      specialty: specialty ?? "General Medicine",
      urgency: "routine",
      possibleConditions: [],
      symptoms: [],
      hospitals: [],
      providerStatus: "location_required",
      message: LOCATION_REQUIRED_MESSAGE,
      emergency: false,
      location: null,
    };
  }

  const { hospitals, providerStatus, message } = await fetchAndRankHospitals({
    latitude: location.latitude,
    longitude: location.longitude,
    radiusKm,
    specialty,
  });

  return {
    specialty: specialty ?? "General Medicine",
    urgency: "routine",
    possibleConditions: [],
    symptoms: [],
    hospitals,
    providerStatus,
    message,
    emergency: false,
    location,
  };
}

export interface RecommendHospitalsInput {
  symptoms?: string;
  specialty?: string;
  documentId?: string;
  userId?: string | null;
  latitude?: number;
  longitude?: number;
  locationQuery?: string;
  radiusKm?: number;
}

/**
 * POST /api/hospitals/recommend: symptoms and/or a report drive the
 * specialty + urgency (Feature A + the Feature C "Report -> Hospital" link,
 * spec section 17), then hospitals are searched and ranked exactly like
 * nearbyHospitals.
 */
export async function recommendHospitals(
  input: RecommendHospitalsInput,
): Promise<HospitalSearchResponse> {
  const radiusKm = clampRadius(input.radiusKm);

  let specialty = input.specialty?.trim() || null;
  let urgency: TriageUrgency = "routine";
  let possibleConditions: string[] = [];
  let symptomsList: string[] = [];

  if (!specialty && input.documentId && input.userId) {
    const { data: doc } = await supabaseAdmin
      .from("documents")
      .select("analysis")
      .eq("id", input.documentId)
      .eq("user_id", input.userId)
      .maybeSingle();
    const analysis = doc?.analysis as
      { recommended_specialty?: string; urgency?: TriageUrgency } | null | undefined;
    if (analysis?.recommended_specialty) {
      specialty = analysis.recommended_specialty;
      urgency = analysis.urgency ?? "routine";
    }
  }

  if (!specialty && input.symptoms?.trim()) {
    const triage = await triageForHospital(input.symptoms);
    specialty = triage.recommended_specialty;
    urgency = triage.urgency;
    possibleConditions = triage.possible_conditions;
    symptomsList = triage.symptoms;
  }

  specialty = specialty || "General Medicine";

  const location = await resolveLocation(input);
  if (!location) {
    return {
      specialty,
      urgency,
      possibleConditions,
      symptoms: symptomsList,
      hospitals: [],
      providerStatus: "location_required",
      message: LOCATION_REQUIRED_MESSAGE,
      emergency: urgency === "emergency",
      location: null,
    };
  }

  const { hospitals, providerStatus, message } = await fetchAndRankHospitals({
    latitude: location.latitude,
    longitude: location.longitude,
    radiusKm,
    specialty,
  });

  return {
    specialty,
    urgency,
    possibleConditions,
    symptoms: symptomsList,
    hospitals,
    providerStatus,
    message,
    emergency: urgency === "emergency",
    location,
  };
}
