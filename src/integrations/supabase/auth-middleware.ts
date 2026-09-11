import { createMiddleware } from "@tanstack/react-start";
import { auth } from "@clerk/tanstack-react-start/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./types";
import { supabaseAdmin } from "./client.server";

async function fetchClerkUser(userId: string) {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) return null;
  try {
    const res = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      headers: { Authorization: `Bearer ${secretKey}` },
    });
    if (!res.ok) return null;
    return (await res.json()) as {
      email_addresses?: { id: string; email_address: string }[];
      primary_email_address_id?: string | null;
      first_name?: string | null;
      last_name?: string | null;
    };
  } catch (error) {
    console.error("[clerk] failed to fetch user", error);
    return null;
  }
}

// Best-effort sync of the Clerk user's email/name into profiles, so the rest
// of the app (and future features like notifications) can read it straight
// from Supabase. Skipped once profiles.email is already set for this user.
async function ensureProfile(userId: string) {
  const { data: existing } = await supabaseAdmin
    .from("profiles")
    .select("id, email")
    .eq("id", userId)
    .maybeSingle();
  if (existing?.email) return;

  const clerkUser = await fetchClerkUser(userId);
  if (!clerkUser) return;

  const primaryEmail =
    clerkUser.email_addresses?.find((e) => e.id === clerkUser.primary_email_address_id)
      ?.email_address ??
    clerkUser.email_addresses?.[0]?.email_address ??
    null;
  const fullName = [clerkUser.first_name, clerkUser.last_name].filter(Boolean).join(" ") || null;

  await supabaseAdmin.from("profiles").upsert({
    id: userId,
    email: primaryEmail,
    full_name: fullName,
  });
}

/**
 * Server-fn middleware: requires a signed-in Clerk user, and hands the
 * handler a Supabase client scoped to that user's session. Postgres RLS
 * validates the Clerk session token via Supabase's third-party auth
 * integration (Dashboard -> Authentication -> Sign In / Providers ->
 * Third Party Auth -> Clerk). See supabase/migrations for the matching
 * schema/policy changes.
 */
export const requireAuth = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const { isAuthenticated, userId, getToken } = await auth();

  if (!isAuthenticated || !userId) {
    throw new Error("Unauthorized: sign in required");
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error(
      "Missing Supabase environment variable(s): SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY",
    );
  }

  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    accessToken: async () => (await getToken()) ?? null,
    auth: { persistSession: false, autoRefreshToken: false },
  });

  ensureProfile(userId).catch((error) => console.error("[profile-sync]", error));

  return next({ context: { supabase, userId } });
});

/**
 * Server-fn middleware for routes that work for anyone, but should save
 * extra context when the caller happens to be signed in (e.g. the floating
 * chat widget, which answers logged-out visitors too but only persists
 * history for accounts). Never throws for an anonymous caller; context.
 * `supabase`/`userId` are null when there's no signed-in Clerk session.
 */
type OptionalAuthContext = { supabase: SupabaseClient<Database> | null; userId: string | null };

export const optionalAuth = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const { isAuthenticated, userId, getToken } = await auth();

  const anonymous: OptionalAuthContext = { supabase: null, userId: null };

  if (!isAuthenticated || !userId) {
    return next({ context: anonymous });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    console.error(
      "[optionalAuth] Missing Supabase environment variable(s): SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY",
    );
    return next({ context: anonymous });
  }

  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    accessToken: async () => (await getToken()) ?? null,
    auth: { persistSession: false, autoRefreshToken: false },
  });

  ensureProfile(userId).catch((error) => console.error("[profile-sync]", error));

  const signedIn: OptionalAuthContext = { supabase, userId };
  return next({ context: signedIn });
});
