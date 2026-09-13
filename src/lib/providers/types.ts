// Provider abstraction for map/places/routing/geocoding (spec section 4 &
// 21). The hospital recommendation engine (hospital-service.server.ts) only
// ever talks to these interfaces, never to a specific vendor SDK -- so
// swapping SerpApi -> Google Places, or OSM -> Google Maps, later is a
// matter of writing one new file and changing which provider gets
// constructed, not touching the ranking/caching logic.
//
//   PlacesProvider    -> SerpApiPlacesProvider today, GooglePlacesProvider later
//   GeocodingProvider -> NominatimGeocodingProvider today, GoogleGeocodingProvider later
//   RoutingProvider   -> OSM/OSRM directions link today, GoogleRoutesProvider later
//   MapProvider       -> a frontend concern: HospitalMap renders Leaflet/OSM
//                        tiles today; swapping to Google Maps means swapping
//                        that one component, not this data layer.

export interface NormalizedHospital {
  /** Internal DB id once persisted to public.hospitals -- absent for a fresh, unpersisted provider result. */
  id?: string;
  source: string;
  sourceId: string | null;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  rating: number | null;
  reviewCount: number | null;
  phone: string | null;
  website: string | null;
}

export interface PlacesSearchParams {
  latitude: number;
  longitude: number;
  radiusKm: number;
  specialty?: string | null;
}

export type ProviderStatus = "ok" | "unconfigured" | "error";

export interface PlacesSearchResult {
  hospitals: NormalizedHospital[];
  providerStatus: ProviderStatus;
  providerName: string;
  message?: string;
}

export interface PlacesProvider {
  name: string;
  searchHospitals(params: PlacesSearchParams): Promise<PlacesSearchResult>;
}

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  displayName: string;
}

export interface GeocodingProvider {
  name: string;
  geocode(query: string): Promise<GeocodeResult | null>;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface RoutingProvider {
  name: string;
  buildDirectionsUrl(origin: Coordinates | null, destination: Coordinates): string;
}
