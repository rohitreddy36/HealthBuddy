// Builds outbound "Find Medicine" search links (spec section 16). HealthBuddy
// never processes payments, stores payment info, purchases medicine, or
// claims real-time stock -- this only ever produces a plain external search
// URL the user opens themselves.

export interface MedicineSearchUrls {
  buyOnline: string;
  pharmacyNearMe: string;
}

function googleSearchUrl(query: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

/** Builds the two external search links FindMedicineButton offers. Never call this for an unverified medicine -- see medicine-service.server.ts. */
export function buildMedicineSearchUrls(
  name: string,
  strength?: string | null,
): MedicineSearchUrls {
  const label = [name.trim(), strength?.trim()].filter(Boolean).join(" ");
  return {
    buyOnline: googleSearchUrl(`${label} buy online`),
    pharmacyNearMe: googleSearchUrl(`${label} pharmacy near me`),
  };
}
