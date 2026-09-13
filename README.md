# HealthBuddy (AIL Health Advisor)

Calm, careful AI health guidance — a symptom checker, health chat, and medical
report explainer built with TanStack Start, Supabase, and Google Gemini.

> **Disclaimer:** HealthBuddy provides general wellness guidance only. It is
> not a substitute for professional medical diagnosis, treatment, or
> emergency care.

## Features

- **Symptom Check** (`/analyze`) — a two-stage flow: Gemini suggests a
  follow-up checklist based on your initial symptoms, then returns a
  structured summary (possible concerns, self-care, a diet plan, exercise
  advice, and an urgency flag). Saved to `symptom_analyses`.
- **AI Assistant** (`/chat`) — a conversational health chat backed by
  Gemini, with history persisted to `chat_messages`.
- **Report Explainer** (`/documents`) — upload a medical report, prescription,
  or scan (text, image, or PDF) and get a plain-language explanation: key
  findings, values to watch, and questions to ask your doctor. Saved to
  `documents`.
- **Dashboard** (`/dashboard`) — a summary of your recent analyses,
  documents, and profile.
- **Email reminders** — after a symptom check, click "Email me this" to get
  the guidance (what to avoid, self-care, urgency) sent to your inbox
  immediately, or let it send automatically every day at 5:30 AM IST. See
  [Email reminders](#6-optional-set-up-daily-email-reminders) below.
- **Download as PDF** — the symptom-check result screen has a "Download as
  PDF" button (uses the browser's native print-to-PDF, no extra
  dependency) that includes your email and the generation time.
- **Homepage = your dashboard** — signed-in visitors land on `/` and see
  their dashboard directly (recent symptom checks, reports, and quick
  questions asked via the floating chat). Logged-out visitors see the
  marketing page instead.
- **Explore** (`/explore`) — a Health Explorer for browsing the medicine &
  symptom reference database (search, popular medicines, browse by
  symptom), plus **Find nearby hospitals** (`/explore/hospitals`): enter
  symptoms or a location and get a relevant specialty (never a diagnosis)
  and a ranked list of nearby hospitals on a free Leaflet/OpenStreetMap map.
  Both the symptom checker and the report explainer link straight into this
  with the relevant specialty pre-filled ("Find Nearby Hospitals").
- **Report → Medicine** — the report explainer now also extracts medicine
  mentions (e.g. "Tab. Paracetamol 500 mg"), normalizes them, and checks
  them against the medicines table. A verified match gets "Buy Online" /
  "Pharmacy Near Me" search links (plain external search — HealthBuddy never
  processes payments or claims real-time stock); an unverified one is
  clearly labeled instead of linked.
- **Emergency handling** — both the symptom checker and the report
  explainer flag potentially urgent symptoms with a prominent banner
  recommending immediate emergency care, and it takes priority over normal
  hospital ranking in `/explore/hospitals`.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | [TanStack Start](https://tanstack.com/start) (React 19, SSR) on Vite 7 |
| Routing | TanStack Router (file-based, `src/routes/`) |
| Styling | Tailwind CSS 4 + [shadcn/ui](https://ui.shadcn.com) (`src/components/ui/`) |
| Auth | [Clerk](https://clerk.com) — sign-in/sign-up, session management |
| Database | [Supabase](https://supabase.com) (Postgres) with Row Level Security |
| AI | Google Gemini 3.8 Flash via the [Vercel AI SDK](https://ai-sdk.dev) |
| Email | [Nodemailer](https://nodemailer.com) over Gmail SMTP |
| Data fetching | TanStack Query |

### How auth + data fit together

Clerk is the identity provider. Supabase stays the database and keeps
enforcing Row Level Security, but validates the *Clerk* session token
instead of its own (Supabase's "Third Party Auth" integration) — so every
row-ownership check in Postgres compares against `auth.jwt() ->> 'sub'`
(the Clerk user id) rather than `auth.uid()`. See
`src/integrations/supabase/auth-middleware.ts` for the server-side glue,
and `supabase/migrations/20260911193000_clerk_auth.sql` for the schema/RLS
changes this required (ownership columns are `TEXT`, not `UUID`, since
Clerk ids look like `user_2abc...`).

On a user's first authenticated request, their email/name is fetched from
Clerk's API and upserted into `profiles` — no webhook required.

## Getting started

### 1. Install dependencies

```bash
npm install --legacy-peer-deps
```

> **Why `--legacy-peer-deps`:** one devDependency (`nitro`) is pinned to an
> exact beta version that can trail behind what `@lovable.dev/vite-tanstack-config`
> asks for as a peer. This flag tells npm to accept it rather than hard-fail;
> it's cosmetic, not a real incompatibility.
>
> **If you hit `Cannot find module @rollup/rollup-<platform>-<arch>`:**
> delete `node_modules` and `package-lock.json` and reinstall from the exact
> machine/OS you intend to run `npm run dev` on. Rollup's optional native
> bindings are platform-specific — a `node_modules` produced on one OS/arch
> (e.g. an x86 Linux CI box or a sandboxed VM) won't run on another (e.g.
> your Mac's own Terminal), even if they share the same files on disk.

### 2. Configure environment variables

Copy the template and fill in real values:

```bash
cp .env.example .env
```

| Variable | Where to get it |
|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | [Clerk dashboard](https://dashboard.clerk.com) → API Keys |
| `SUPABASE_URL`, `VITE_SUPABASE_URL` | Supabase dashboard → Settings → API → Project URL |
| `SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase dashboard → Settings → API → anon/publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase dashboard → Settings → API → service_role key (**server-only, never expose to the client**) |
| `GEMINI_API_KEY`, `VITE_GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/apikey) |
| `SMTP_USER`, `SMTP_PASS` | A Gmail address + a [Gmail App Password](https://myaccount.google.com/apppasswords) (only needed for email reminders — see below) |
| `REMINDER_CRON_SECRET` | Any random string you generate yourself, e.g. `openssl rand -hex 32` (only needed for email reminders) |

`VITE_`-prefixed variables are readable from the browser; the bare
(non-`VITE_`) versions are the server-only fallbacks read via `process.env`.
Never put a secret in a `VITE_`-prefixed variable.

### 3. Connect Clerk and Supabase

In your Supabase project: **Authentication → Sign In / Providers → Third
Party Auth**, add Clerk, and paste your Clerk domain (found on your Clerk
app's "Connect with Supabase" page, or decode it from your publishable
key — it's the part after `pk_test_`/`pk_live_`, base64-decoded).

### 4. Apply the database migrations

Paste the contents of `supabase/migrations/*.sql` into the Supabase SQL
editor and run them, in order (or use `supabase db push` if you have the
CLI + Docker set up locally):

- `20260911193000_clerk_auth.sql` switches the schema over to Clerk-based
  ownership — run it even on a fresh project.
- `20260912070000_email_reminders.sql` adds the
  `profiles.email_reminders_enabled` opt-out flag used by the daily
  reminder job — only needed if you're using email reminders (step 6).
- `20260913090000_assistant_messages.sql` adds the `assistant_messages`
  table that stores the floating chat widget's history for signed-in
  users (logged-out visitors can still use the widget, nothing is saved
  for them).
- `20260913100000_hospital_medicine_explorer.sql` adds the Explore/Hospital
  Recommendation schema: `specialties`, `symptoms`, `medicines`,
  `medicine_symptoms` (all public-read reference data, seeded with a small
  illustrative dataset), plus `hospitals` / `hospital_specialties`
  (persisted search results) and the server-only `hospital_search_cache`.
  Run this migration for the Explore section and hospital search to work.

### 5. Run the dev server

```bash
npm run dev
```

### 6. (Optional) Set up daily email reminders

The "Email me this" button and the automatic 5:30 AM email both send
through your own Gmail account via SMTP — nothing external to sign up for,
but note this is **not unlimited**: a regular Gmail account caps outgoing
mail at roughly 500 messages/day (Google Workspace accounts get ~2,000/day),
and Google can throttle or flag an account that sends a lot of automated
mail. That's plenty for personal/small-scale use, but worth knowing before
you rely on it for many users.

**a) Create a Gmail App Password**

App Passwords only work if 2-Step Verification is turned on for the Google
account you're sending from.

1. Turn on 2-Step Verification: <https://myaccount.google.com/security>
2. Create an App Password: <https://myaccount.google.com/apppasswords>
   (choose "Mail" / "Other", name it e.g. "HealthBuddy")
3. Copy the 16-character password Google gives you.

**b) Set the SMTP environment variables**

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your.address@gmail.com
SMTP_PASS=<the 16-character app password, no spaces>
SMTP_FROM_NAME=AIL Health
REMINDER_CRON_SECRET=<any long random string>
```

`REMINDER_CRON_SECRET` is not an email setting — it's the bearer token that
protects `/api/reminders/daily` (the batch-send endpoint) from being called
by anyone but your own scheduler.

**c) Apply the migration**

Run `20260912070000_email_reminders.sql` (see step 4) so `profiles` has the
`email_reminders_enabled` column the daily job filters on.

**d) Install nodemailer**

Already listed in `package.json` — a normal `npm install` (step 1) pulls it
in.

**e) Wire up the 5:30 AM auto-send**

`.github/workflows/daily-reminder.yml` is already set up to POST to
`/api/reminders/daily` every day at 00:00 UTC (05:30 IST) using GitHub
Actions' scheduler — no server of your own needed to run the cron. To
activate it, add two repository secrets under **Settings → Secrets and
variables → Actions**:

| Secret | Value |
|---|---|
| `REMINDER_ENDPOINT` | Your deployed app's full URL to the endpoint, e.g. `https://your-app.example.com/api/reminders/daily` |
| `REMINDER_CRON_SECRET` | The exact same value you set for `REMINDER_CRON_SECRET` in your deployment's environment variables |

You can trigger it manually any time from the Actions tab (`workflow_dispatch`)
to test it without waiting for 5:30 AM. Each run emails everyone with
`email_reminders_enabled = true`, an email on file, and at least one saved
symptom check — built from their most recent analysis.

## Environment variables reference

See `.env.example` for the full list with inline comments. In short:

- **Clerk**: `VITE_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, plus the
  `VITE_CLERK_SIGN_IN_URL` / `VITE_CLERK_SIGN_UP_URL` / fallback-redirect
  pair (already pointed at `/sign-in`, `/sign-up`, `/`).
- **Supabase**: `SUPABASE_URL` / `VITE_SUPABASE_URL`,
  `SUPABASE_PUBLISHABLE_KEY` / `VITE_SUPABASE_PUBLISHABLE_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`.
- **Gemini**: `GEMINI_API_KEY`, `VITE_GEMINI_API_KEY`.
- **Email reminders (optional)**: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`,
  `SMTP_PASS`, `SMTP_FROM_NAME`, `REMINDER_CRON_SECRET`.
- **Hospital discovery (optional)**: `SERPAPI_API_KEY` (get one at
  [serpapi.com](https://serpapi.com)), `HOSPITAL_CACHE_TTL_MINUTES`
  (default 360). Without a key, `/explore/hospitals` and the hospital API
  routes still work end-to-end but return an empty result with a clear
  "not configured" message instead of live hospitals — nothing is
  fabricated. No Google Maps key is required: the map is Leaflet +
  OpenStreetMap tiles, geocoding is Nominatim, and "Get Directions" links
  to OpenStreetMap's own directions UI. See "Hospital recommendation
  architecture" below for the provider-swap path to Google Maps/Places
  later.

## Project structure

```
src/
  routes/                 File-based routes (TanStack Router)
    index.tsx              Landing page
    sign-in.$.tsx           Clerk sign-in
    sign-up.$.tsx           Clerk sign-up
    auth.tsx                Legacy redirect -> /sign-in
    _authenticated/         Layout + guard for signed-in routes
      dashboard.tsx
      analyze.tsx            Symptom checker
      chat.tsx                AI assistant
      documents.tsx           Report explainer
      explore/                Health Explorer + hospital finder (see below)
    api/chat.ts              Streaming chat endpoint (Gemini)
    api/hospitals/           Public REST API: nearby / recommend
    api/medicines/           Public REST API: list / :id / search / by-symptom
  lib/
    health.functions.ts     Server functions: follow-ups, symptom analysis,
                             document analysis (now also extracts + verifies
                             medicines and a recommended specialty/urgency),
                             dashboard data
    ai.server.ts            Shared Gemini provider + resilient JSON-from-text
                             helpers used by every AI-backed feature
    chat.functions.ts       Server functions: chat history read/write
    reminder.functions.ts   Server function: send "email me this" on demand
    email.server.ts         Nodemailer transport + HTML/text email template
    assistant.functions.ts  Server functions for the floating chat widget
                            (answers everyone, saves history for signed-in users)
    geo.ts                  Haversine distance, cache-key rounding (pure, tested)
    hospital-scoring.ts     Configurable weighted hospital ranking (pure, tested)
    medicine-normalize.ts   Medicine mention name/strength parsing (pure, tested)
    specialty-map.ts        Keyword fallback for specialty/urgency triage (pure, tested)
    medicine-search-url.ts  "Find Medicine" external search URL builder (pure, tested)
    hospital-service.server.ts   Feature A: triage, location resolution, search+rank
    medicine-service.server.ts   Feature B/C: medicine/symptom queries, DB matching
    hospital-cache.server.ts     Supabase-backed cache for hospital searches
    hospital.functions.ts / medicine.functions.ts   Server-fn wrappers used by the UI
    providers/               MapProvider/PlacesProvider/RoutingProvider/
                              GeocodingProvider abstraction (SerpApi + Nominatim +
                              OSM today; swap in Google Places/Routes/Geocoding
                              later without touching the ranking/caching logic)
  routes/api/
    reminders/daily.ts      Bearer-token-protected endpoint the daily cron
                             hits to email everyone opted in
  integrations/
    supabase/
      client.ts             Browser Supabase client (legacy, mostly unused
                             now that data access goes through server fns)
      client.server.ts      Service-role ("admin") Supabase client
      auth-middleware.ts     requireAuth / optionalAuth: verify (or softly
                             check) a Clerk session, build an RLS-scoped
                             Supabase client, sync profile email
      types.ts               Generated Supabase types
  components/
    AppShell.tsx             Authenticated layout chrome (nav + UserButton)
    AuthShell.tsx             Branded wrapper around Clerk's sign-in/up
    DashboardContent.tsx      Shared dashboard body, rendered at both "/"
                              (signed-in homepage) and /dashboard
    FloatingChatbot.tsx       Site-wide floating help widget
    FindMedicineButton.tsx    Reusable "Find Medicine" external-search button
    hospital/                 HospitalMap (Leaflet, lazy/SSR-safe), HospitalMarker,
                              HospitalRecommendationCard/List, HospitalDetails,
                              LocationInput (geolocation with manual fallback)
    ui/                       shadcn/ui components
supabase/
  migrations/                SQL migrations, applied in filename order
.github/
  workflows/
    daily-reminder.yml       GitHub Actions cron: POSTs to
                              /api/reminders/daily at 05:30 IST daily
```

## Hospital recommendation architecture

Feature A never talks to a specific map/places vendor directly -- everything
goes through the provider interfaces in `src/lib/providers/types.ts`:

```
PlacesProvider    -> SerpApiPlacesProvider today   -> GooglePlacesProvider later
GeocodingProvider -> NominatimGeocodingProvider today -> GoogleGeocodingProvider later
RoutingProvider   -> OSM/OSRM directions link today -> GoogleRoutesProvider later
MapProvider       -> HospitalMap renders Leaflet/OSM tiles today -> swap that one component for Google Maps later
```

`hospital-service.server.ts` (triage -> location resolution -> cached/live
search -> `hospital-scoring.ts` ranking) only ever depends on these
interfaces and on the normalized `Hospital` shape, so switching vendors
later means adding one new provider file, not touching the ranking or
caching logic. Hospital search results are cached in Supabase
(`hospital_search_cache`, keyed by rounded lat/lng + radius + specialty --
see `geo.ts`) so repeat searches for "basically the same place" don't
re-hit SerpApi's free-tier quota; hospitals returned by a live search are
also upserted into `public.hospitals` for reuse. Ranking weights
(distance 35% / specialty match 35% / rating 15% / review count 10% /
facility match 5%) live in `hospital-scoring.ts`, not in any UI component,
so they can be tuned without touching React code.

## Testing

Pure logic (distance/ranking math, medicine name normalization, the
keyword-based triage fallback, cache-key rounding, external search URL
building) has unit tests under `src/lib/*.test.ts`, run with
[Vitest](https://vitest.dev):

```bash
npm test          # run once
npm run test:watch
```

This intentionally does not test the Supabase-backed services or API
routes end-to-end (that needs a real/seeded database and API keys) --
those are covered by manually exercising `/explore`, `/explore/hospitals`,
and the report explainer against a project with the migrations applied.

## Deployment

The build targets Cloudflare via Nitro by default (see `vite.config.ts`).
Set the same environment variables in your hosting provider, and make sure
the Supabase Third Party Auth (Clerk) integration and migrations are applied
against whichever Supabase project you point production at.
