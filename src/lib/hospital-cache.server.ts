import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";

// Query-level cache for hospital search results (spec section 10). Keyed by
// rounded lat/lng + radius + specialty (see geo.ts buildHospitalCacheKey) so
// tiny GPS jitter or re-loading the same page doesn't burn another SerpApi
// call. Server-only table -- see the migration for why (no client RLS
// policy at all, so only supabaseAdmin, service_role, can touch it).
const DEFAULT_TTL_MINUTES = 360; // 6 hours

function ttlMinutes(): number {
  const raw = process.env.HOSPITAL_CACHE_TTL_MINUTES;
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TTL_MINUTES;
}

export async function readHospitalCache<T>(cacheKey: string): Promise<T | null> {
  const { data, error } = await supabaseAdmin
    .from("hospital_search_cache")
    .select("payload, expires_at")
    .eq("cache_key", cacheKey)
    .maybeSingle();

  if (error || !data) return null;
  if (new Date(data.expires_at).getTime() < Date.now()) return null;
  return data.payload as T;
}

export async function writeHospitalCache(cacheKey: string, payload: unknown): Promise<void> {
  const expiresAt = new Date(Date.now() + ttlMinutes() * 60_000).toISOString();
  const { error } = await supabaseAdmin
    .from("hospital_search_cache")
    .upsert(
      { cache_key: cacheKey, payload: payload as Json, expires_at: expiresAt },
      { onConflict: "cache_key" },
    );

  if (error) console.error("[hospital-cache] failed to write cache", error);
}
