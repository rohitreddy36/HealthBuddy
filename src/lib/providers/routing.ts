import type { Coordinates, RoutingProvider } from "./types";

// Free, no-API-key "Get Directions" link via OpenStreetMap's own directions
// UI (backed by OSRM). No secrets involved, so this is safe to import from
// client code too (HospitalDetails renders the link directly).
export const osmRoutingProvider: RoutingProvider = {
  name: "osm",
  buildDirectionsUrl(origin, destination) {
    const to = `${destination.latitude}%2C${destination.longitude}`;
    const from = origin ? `${origin.latitude}%2C${origin.longitude}` : "";
    return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${from}%3B${to}`;
  },
};

// Swap-in target for spec section 21 (Google Maps migration path). Also
// free of secrets (it's a deep link, not the Directions API), included here
// so callers can switch providers without an API key change either.
export const googleRoutingProvider: RoutingProvider = {
  name: "google",
  buildDirectionsUrl(origin, destination) {
    const params = new URLSearchParams({
      api: "1",
      destination: `${destination.latitude},${destination.longitude}`,
    });
    if (origin) params.set("origin", `${origin.latitude},${origin.longitude}`);
    return `https://www.google.com/maps/dir/?${params.toString()}`;
  },
};

export function getDefaultRoutingProvider(): RoutingProvider {
  return googleRoutingProvider;
}

export type { Coordinates, RoutingProvider };
