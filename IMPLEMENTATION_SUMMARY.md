# Implementation summary: Hospital Recommendation, Medicine Explorer, Report → Medicine

Implemented end-to-end (frontend → backend → database → external APIs →
recommendation engine → UI) on top of the existing TanStack Start /
Supabase / Clerk / Gemini stack, reusing existing conventions (server
functions in `src/lib/*.functions.ts`, RLS-scoped Supabase access,
Vercel AI SDK for Gemini, shadcn/ui components) rather than introducing a
second way of doing any of this.

## Files created

**Database**
- `supabase/migrations/20260913100000_hospital_medicine_explorer.sql` —
  `specialties`, `symptoms`, `medicines`, `medicine_symptoms`, `hospitals`,
  `hospital_specialties`, `hospital_search_cache` + seed data.

**Pure logic + unit tests** (`src/lib/`)
- `geo.ts` / `geo.test.ts` — haversine distance, cache-key coordinate rounding.
- `hospital-scoring.ts` / `.test.ts` — configurable weighted ranking
  (distance 35% / specialty 35% / rating 15% / reviews 10% / facility 5%).
- `medicine-normalize.ts` / `.test.ts` — "Tab. Paracetamol 500 mg" → `{name, strength}`.
- `specialty-map.ts` / `.test.ts` — keyword fallback triage (specialty + urgency).
- `medicine-search-url.ts` / `.test.ts` — external "Find Medicine" search URLs.
- `ai.server.ts` — Gemini provider + JSON-parsing helpers, extracted out of
  `health.functions.ts` so hospital triage and symptom/document analysis
  share one implementation instead of two.

**Providers** (`src/lib/providers/`) — `types.ts`,
`geocoding.nominatim.server.ts`, `places.serpapi.server.ts`, `routing.ts`
(OSM + a Google-routing variant ready for later).

**Services + server functions**
- `hospital-cache.server.ts`, `hospital-service.server.ts`,
  `hospital.functions.ts`
- `medicine-service.server.ts`, `medicine.functions.ts`

**REST API** — `src/routes/api/hospitals/{nearby,recommend}.ts`,
`src/routes/api/medicines/{index,$id,search,by-symptom}.ts`.

**UI** — `src/components/FindMedicineButton.tsx`,
`src/components/hospital/{HospitalMap,HospitalMap.leaflet,HospitalMarker,
HospitalRecommendationCard,HospitalRecommendationList,HospitalDetails,
LocationInput}.tsx`, `src/routes/_authenticated/explore/{route,index,
hospitals}.tsx`, `.../explore/medicines/$id.tsx`, `.../explore/symptoms/$name.tsx`.

**Config** — `vitest.config.ts`.

**Medicine dataset** — `data/medicines-500.json` (500-entry medicine
reference catalog: generic drugs + well-known brand names + common
fixed-dose combinations, grouped into ~48 therapeutic categories) and
`scripts/seed-medicines.mjs` (idempotent Node script that loads it into
`medicines`/`symptoms`/`medicine_symptoms` — see "Setup instructions").

## Files modified

- `src/lib/health.functions.ts` — `analyzeSymptoms` now also returns
  `recommended_specialty` (+ a server-derived `urgency`); `analyzeDocument`
  now also extracts, normalizes, and DB-verifies medicine mentions and
  returns `recommended_specialty` / `urgency`. Shares `ai.server.ts` instead
  of duplicating the Gemini/JSON-parsing helpers.
- `src/lib/assistant.functions.ts` — updated its `gateway`/`MODEL` import to
  `ai.server.ts` (was importing from `health.functions.ts`).
- `src/integrations/supabase/types.ts` — hand-extended with the 7 new
  tables (see "Known limitations" — regenerate this via the Supabase CLI
  once you can run it, which will produce the same shape).
- `src/components/AppShell.tsx` — added an "Explore" nav item.
- `src/routes/_authenticated/analyze.tsx` — emergency banner, "Relevant
  specialty" section + "Find Nearby Hospitals" link.
- `src/routes/_authenticated/documents.tsx` — emergency banner, "Relevant
  specialty" + "Find Nearby Hospitals" link, extracted-medicines section
  with `FindMedicineButton`.
- `package.json` — added `leaflet`, `react-leaflet`, `@types/leaflet`,
  `vitest`; added `test` / `test:watch` scripts.
- `.env.example`, `README.md` — documented below.

## Database changes

7 new tables (see migration for full DDL): `specialties`, `symptoms`,
`medicines`, `medicine_symptoms` (public-read reference data, seeded with
~16 illustrative medicines and their symptom relationships), `hospitals` +
`hospital_specialties` (persisted normalized search results), and
`hospital_search_cache` (server-only query cache). **Run this migration**
(paste into the Supabase SQL editor, same as the existing migrations) before
using Explore or hospital search — see "Troubleshooting" below if you're
seeing `PGRST205` errors, that's exactly this step being skipped.

On top of the migration's small illustrative seed, `data/medicines-500.json`
+ `scripts/seed-medicines.mjs` load a much larger 500-medicine catalog (see
"Setup instructions") — same table, same columns, just more rows plus the
symptom tags/links needed for the "browse by symptom" feature to have
something to show.

## APIs added

- `GET /api/hospitals/nearby?lat=&lng=&radius=&specialty=&location=`
- `POST /api/hospitals/recommend` — `{symptoms?, specialty?, documentId?, latitude?, longitude?, locationQuery?, radiusKm?}`
- `GET /api/medicines`, `/api/medicines/:id`, `/api/medicines/search?q=`, `/api/medicines/by-symptom?symptom=`

These are public JSON endpoints matching the spec's literal contract. The
in-app UI instead calls the auth'd server functions in
`hospital.functions.ts` / `medicine.functions.ts`, which share the exact
same service layer — no duplicated logic between the two.

## Environment variables

- `SERPAPI_API_KEY` (optional) — already set in your local `.env`. Without
  it, hospital search returns an empty list with a clear "not configured"
  message rather than fabricating results.
- `HOSPITAL_CACHE_TTL_MINUTES` (optional, default 360).

## External services / free-MVP stack

- Map: Leaflet + OpenStreetMap tiles (no API key).
- Geocoding: Nominatim (no API key; rate-limited per its usage policy — only
  called on-demand from user input, never batched).
- Hospital discovery: SerpApi (Google Maps engine) — server-only key,
  cached in Supabase to stay within the free tier's monthly quota.
- Directions: a deep link to OpenStreetMap's own directions UI (no API call).

## Production upgrade path

Every one of the above is behind an interface in `src/lib/providers/types.ts`
(`PlacesProvider`, `GeocodingProvider`, `RoutingProvider`) plus `MapProvider`
as a frontend concern (`HospitalMap`). Swapping SerpApi → Google Places,
Nominatim → Google Geocoding, or Leaflet → Google Maps means adding one new
provider file and changing which one gets constructed — the ranking
(`hospital-scoring.ts`) and caching (`hospital-cache.server.ts`) layers
never change. See the README's new "Hospital recommendation architecture"
section.

## Tests executed

`npm test` (Vitest) covers the pure logic exhaustively: haversine distance,
cache-key rounding, ranking math (including the documented 35/35/15/10/5
weights and each ranking-reason label), medicine name/strength
normalization (dosage forms, route/frequency stripping, combination
strengths), the keyword-based triage fallback, and the external
search-URL builder.

**I could not run `npm install` or `npm test` myself**: this device's
sandboxed shell has no outbound network access (confirmed: `npm view
leaflet` returns 403), so the new dependencies can't be installed from
here. Run `npm install --legacy-peer-deps` from your own Terminal, then
`npm test`, to install and execute them.

I *did* verify everything else this environment could check without those
packages: the **entire project type-checks cleanly** with `npx tsc --noEmit`
(the only errors are "cannot find module leaflet/react-leaflet/vitest",
exactly the three uninstalled packages), and `npx eslint` is clean across
every file I touched. I also managed to run `npm run dev` once — it
progressed far enough to regenerate `src/routeTree.gen.ts` with all the new
routes correctly registered before failing on a pre-existing, unrelated
issue: this sandbox's `node_modules` has a Linux-arm64 rollup binary
mismatch, the exact issue already documented in this README ("Cannot find
module @rollup/rollup-<platform>-<arch>"). That's a `node_modules`/platform
issue, not something in the code — running `npm install --legacy-peer-deps`
from your own Mac Terminal (not through this sandboxed session) will use
the correct native binary and `npm run dev` should work normally there.

## Known limitations

- Even the 500-entry dataset (`data/medicines-500.json`) is a hand-curated
  educational reference set (generic names, well-known real brand names,
  common fixed-dose combinations), not a licensed/authoritative drug
  database — `description`, `precautions`, and `side_effects` are
  intentionally left blank for every seeded row (rather than invented) since
  those are exactly the kind of specific clinical facts that shouldn't be
  hard-coded without a real pharmacopeia source. Fill them in from a
  licensed dataset before relying on this for anything beyond a demo.
- The dataset's `common_uses`/`category` tags (e.g. `mild_to_moderate_pain`,
  `antidiabetic_oral`) are humanized into sentence case for `common_uses` /
  `drug_class` on the way into the DB (matching the existing seed's
  display style), since the Explorer UI renders `common_uses` directly.
- `specialtyMatch` for a hospital is a **name-based heuristic** (SerpApi
  doesn't return structured medical specialties) — it's shown as "not
  confirmed" rather than hidden, never as a false claim of certainty.
- `matchMedicineByName` loads the whole `medicines` table per lookup; fine
  for this dataset's size, not for a large one (swap in `pg_trgm`/indexed
  search if it grows).
- `src/integrations/supabase/types.ts` was hand-extended (no Supabase CLI/
  network access here) rather than generated — regenerate it with
  `supabase gen types typescript` once you have CLI access, which will
  produce the same shape from the applied migration.
- I noticed two pre-existing, uncommitted local changes unrelated to this
  work (`src/lib/chat.functions.ts` and `src/routes/_authenticated/chat.tsx`,
  using `.validator` instead of `.inputValidator`) — left untouched since
  they're outside this task's scope.
- A stray `.git/index.lock` (0 bytes) exists from an earlier process; if
  `git` complains about a lock file, `rm .git/index.lock` clears it.

## Security considerations

- `SERPAPI_API_KEY` is read only in `.server.ts` files, never sent to the
  client.
- All new Supabase tables have RLS enabled; reference tables are
  public-read/service-write-only, `hospital_search_cache` has no client
  policy at all (service-role only).
- Medicine matching never lets the AI invent drug facts — it only extracts
  raw text mentions, which are matched against the structured table; an
  unverified mention gets no purchase link, only a clear "could not be
  verified" label.
- `documentId`-based hospital lookups are scoped to `user_id` (no
  cross-account document access).
- All new inputs (REST query/body, server-fn inputs) are validated with zod.

## Setup instructions (in addition to the existing README steps)

1. `npm install --legacy-peer-deps` (picks up leaflet/react-leaflet/vitest).
2. Apply `supabase/migrations/20260913100000_hospital_medicine_explorer.sql`
   (Supabase SQL editor, or `supabase db push`) — **required for Hospitals**
   (`/explore/hospitals`), which persists/caches search results in
   `hospitals`/`hospital_search_cache`. **Not required for the Explorer**
   (medicines/symptoms) anymore — see below.
3. `SERPAPI_API_KEY` is already set in your local `.env`.
4. `npm run dev` (restart it if it was already running, so it picks up the
   `tsconfig.json`/JSON-import change below), then visit `/explore` and
   `/explore/hospitals`.
5. `npm test` to run the unit tests.

## Medicine & Symptom Explorer now reads `data/medicines-500.json` directly (no DB, no seeding)

This replaces the Supabase-backed approach from earlier in this build.
What changed and why:

- `/explore` was repeatedly showing "No medicines found" and an empty
  "Explore by symptom" row because `public.medicines`/`public.symptoms`
  either didn't exist yet (`PGRST205`) or existed but were never
  successfully seeded — two manual steps (apply migration, then run
  `node scripts/seed-medicines.mjs`) that kept going wrong in practice.
- Per your explicit ask ("use the medicine.json"), `medicine-service.server.ts`
  now reads `data/medicines-500.json` straight from disk (a normal static
  `import`, bundled by Vite like any other module — `tsconfig.json` gained
  `resolveJsonModule: true` and `data/**/*.json` in `include` to support
  this) and builds the medicines/symptoms/matching logic from it in memory.
  There is nothing left to apply or seed for this feature — it works the
  moment the app starts, in any environment, with zero Supabase dependency.
- `listPopularMedicines`, `listSymptoms`, `getMedicineById`,
  `searchMedicines`, `listMedicineNames`, `listMedicinesBySymptom`, and
  `matchMedicineByName` (the Report → Medicine verification step, Feature
  C) are all now dataset-backed with the exact same signatures, so nothing
  in the routes/UI/REST API had to change except two id validators that
  assumed a Supabase UUID (`getMedicineDetailFn` in `medicine.functions.ts`,
  and `GET /api/medicines/:id`) — medicine ids are now the dataset's plain
  numeric-string ids (`"1"`, `"42"`, ...), so those became `z.string().min(1)`.
- The `medicines`/`symptoms`/`medicine_symptoms` tables and
  `scripts/seed-medicines.mjs` from the migration still exist and are
  harmless, but nothing in the app reads them anymore — they're safe to
  ignore (or repurpose later if you want admin-editable data instead of a
  static file).
- Symptom names, `common_uses`, and `drug_class` are still humanized from
  the dataset's `snake_case` tags the same way the seed script did
  (`mild_to_moderate_pain` → "Mild to moderate pain"), and `description`/
  `precautions`/`side_effects` are still intentionally left blank rather
  than invented (see "Known limitations").

## Medicine search: typo tolerance + predefined suggestions

Two follow-up fixes to the Explorer search box, independent of the change
above:

- `src/lib/fuzzy-match.ts` (+ `.test.ts`) — a small dependency-free
  edit-distance matcher. `searchMedicines` now ranks name/generic_name/brand
  substring matches first, then falls back to a bounded typo match once
  that's empty, so "parachetamol" still finds "Paracetamol" instead of "No
  medicines found".
- The Explorer search box now also fetches a lightweight `{id, name,
  generic_name}` list of every medicine once on mount
  (`listMedicineNamesFn`) and shows a live suggestions dropdown ranked by
  the same fuzzy matcher — pick one and it corrects the typo and opens
  that medicine directly, addressing "use the predefined ... medicine name
  ... so the user gets a result" without a round trip per keystroke.

The "Explore by symptom" chips were already meant to work the same way (a
fixed, predefined list you click rather than type); with the dataset-backed
switch above, that list now always has ~100 entries derived from every
unique `common_uses` tag across the 500 medicines.

## Color system replaced: professional healthcare/AI palette (blue -> teal -> emerald)

Follow-up to the redesign above: the initial violet/fuchsia/cyan palette
was replaced end-to-end with a professional healthcare/AI direction, per
explicit exact hex specs (no pink/fuchsia/magenta/purple as brand colors).
Because every component reads color through the CSS custom properties in
`src/styles.css` rather than hardcoding hues, this was a single-file
token swap -- no `.tsx` changes were needed to propagate it (verified via
`grep -rniE 'fuchsia|violet|pink|magenta' src/` returning no component
matches before this change).

- **Brand gradient**: Blue `#2563EB`/`#60A5FA` (dark) -> Teal
  `#0891B2`/`#22D3EE` -> Emerald `#059669`/`#34D399`, same hue families in
  both themes, brightened in dark mode for a subtle neon-tech look against
  the new dark-navy background (`#07111F`).
- **Neutral surfaces**: background/card/secondary/muted/border are now
  plain slate tones (`#F8FAFC`, `#FFFFFF`, `#F1F5F9`, `#E2E8F0`, ...) with
  no brand tint -- "most surfaces stay clean and neutral," brand color is
  reserved for primary CTAs, important headings, active nav state,
  AI-related highlights (the floating assistant, `/chat`), and decorative
  blobs.
- **New `--warning` token** (`#F59E0B` / `#FBBF24` dark) added alongside
  the existing success/info/destructive tokens (`--color-warning` /
  `--color-warning-foreground` in the `@theme` block, so `bg-warning`
  etc. work) -- available for future "proceed with caution" states,
  distinct from `--destructive` (true errors/emergencies).
- **Accessibility**: every brand/semantic color was checked against WCAG
  contrast math (relative luminance + contrast ratio, computed directly
  rather than eyeballed). Flat semantic surfaces (success/info/warning/
  destructive/primary badges) use whichever of white or dark-navy ink
  text passes 4.5:1+ against that exact color in that theme -- in every
  case here that's a dark-navy ink (`#0F172A`), confirmed at 4.7:1-10.7:1
  across all eight color/theme combinations. The one exception is
  `--primary-foreground`, which stays near-white in light mode
  (`#2563EB` + white = 5.17:1) since that pairing is used by Clerk's own
  themed sign-in/sign-up buttons. For the 3-stop brand gradient (where no
  single text color perfectly fits every stop), dark-navy ink was chosen
  as the one consistent choice -- worst case 3.3:1 against the lightest
  light-mode stop, which still clears the WCAG large-text/UI-component
  threshold (3:1), and 6.7:1+ everywhere else.
- **Gradient usage was also dialed back**, not just recolored, per "avoid
  applying the gradient excessively": `Badge`'s default/destructive
  variants and `Checkbox`'s checked state went from a brand-gradient fill
  to a flat `bg-primary` / `bg-destructive` fill (a small tag or checkbox
  doesn't need a 3-stop gradient, and a red-to-teal blend on the old
  destructive button/badge didn't make semantic sense once teal became a
  primary brand hue). `AuthShell`'s marketing panel went from a full
  gradient-wash background to a solid deep-navy panel (`#0B1B3A`) with
  gradient reserved for its heading text, its small logo mark, and the
  existing decorative blobs. Dashboard stat-tile numbers went from
  gradient text to solid `text-primary`. Gradient fills remain on: the
  primary button, the landing hero heading/CTA banner, active nav state,
  the floating AI assistant + `/chat` message bubbles (AI-related
  highlights), feature-card/quick-link icon badges, and the aurora
  background blobs.

## Full "advanced" UI redesign (vibrant gradient + glassmorphism)

A site-wide visual redesign, requested as "make the UI advanced, crazy" --
scope: global theme + every page, style: vibrant gradient + glassmorphism,
motion: heavy (CSS-driven, no new animation library added -- see note
below). No business logic, data-fetching, or server functions were
touched; this is a styling-only pass.

- `src/styles.css` -- new vivid multi-hue OKLCH palette (violet -> fuchsia
  -> cyan `--brand-1/2/3`, plus a matching `--brand-foreground` for
  readable text on solid gradient surfaces in both themes), and a much
  larger utility layer: `.glass` / `.glass-strong` / `.glass-card`
  (backdrop-blur variants), `.text-gradient` / `.gradient-text-animated`,
  `.glow-ring` / `.glow-brand` / `.glow-brand-lg`, `.hover-lift`,
  `.gradient-border`, `.shimmer`, plus new keyframes (`gradient-pan`,
  `float-y`, `glow-pulse`, `shimmer-slide`) and a `prefers-reduced-motion`
  block that disables all of it. All existing semantic tokens
  (`--primary`, `--card`, `--border`, ...) still work exactly as before --
  only their values changed, so nothing that reads them needed updating.
- `src/components/AuroraBackground.tsx` (new) -- shared fixed/blurred
  animated gradient-blob backdrop, reused by `AppShell`, `AuthShell`, and
  the marketing landing page so glass panels have color behind them to
  blur.
- Core UI primitives (`src/components/ui/button.tsx`, `card.tsx`,
  `badge.tsx`, `input.tsx`, `textarea.tsx`, `checkbox.tsx`, `select.tsx`,
  `dialog.tsx`) -- pill-shaped gradient buttons/badges, glass cards and
  inputs with a glowing focus ring, frosted dialog/select surfaces. Same
  props/variants/behavior as before, classes only.
- `AppShell.tsx` / `AuthShell.tsx` -- glass nav with a gradient logo and
  glowing active nav pill; full-bleed animated gradient hero panel behind
  sign-in/sign-up, wrapped in a `glass-card`.
- `routes/index.tsx` (marketing landing page) -- animated gradient
  headline, glass feature cards with hover glow, gradient step badges,
  bigger gradient CTA banner.
- `DashboardContent.tsx` -- glass stat tiles with gradient numbers, glass
  quick-link cards, glass chart panels (the SVG/bar-chart logic itself is
  untouched -- it already reads `var(--chart-1)` etc., so it picked up the
  new vivid palette automatically).
- Visual-only pass across `analyze.tsx`, `explore/*`, `documents.tsx`,
  `chat.tsx`, `FloatingChatbot.tsx`, and `HospitalRecommendationCard.tsx`:
  swapped the old flat `border bg-card` panels for `glass-card`, added
  gradient page headings, and gradient message bubbles in both chat
  surfaces.

**Note on motion**: the user asked for heavy animation. Rather than adding
a new runtime dependency (e.g. Framer Motion) that I could not visually
verify in this environment (this sandbox's Linux VM can't run `npm run
dev` -- see the pre-existing arm64/rollup note earlier in this doc), I
implemented the heavy-motion look entirely with CSS keyframes/transitions,
extending the animation utilities (`animate-fade-up`, `animate-blob`,
...) that were already used this way in the codebase before this change.
Everything here is verified with `tsc --noEmit` and `eslint` (both clean
across every changed file), but **please run `npm run dev` locally and
look it over** -- I could not render the app myself to sanity-check
contrast, spacing, or the animations in motion.

## "HealthBuddy helper" floating widget now runs on Groq

The small floating chat bubble (`FloatingChatbot.tsx` / `askFloatingAssistant`
in `src/lib/assistant.functions.ts`) now calls Groq instead of the shared
Gemini gateway every other AI feature (symptom check, document explainer,
`/chat`, hospital triage) still uses.

- `src/lib/ai.server.ts` gained a second provider, `groqGateway()` +
  `GROQ_MODEL` (default `llama-3.3-70b-versatile`, overridable via the
  `GROQ_MODEL` env var), built with `@ai-sdk/openai-compatible` (already a
  project dependency) pointed at Groq's OpenAI-compatible endpoint
  (`https://api.groq.com/openai/v1`) -- no dedicated Groq SDK needed. The
  existing `gateway()`/`MODEL` (Gemini) are untouched and still used
  everywhere else.
- `assistant.functions.ts` swapped its `gateway()`/`MODEL` call for
  `groqGateway()`/`GROQ_MODEL`; nothing else about the handler (system
  prompt, validation, best-effort history save, fallback reply on error)
  changed.
- `.env.example` documents `GROQ_API_KEY` (required) and `GROQ_MODEL`
  (optional) -- `GROQ_API_KEY` was already present in this project's
  `.env`.
- Verified with `tsc --noEmit` and `eslint` (both clean). I could not make
  a live call to `api.groq.com` from this sandbox to confirm end-to-end
  (same network restriction noted earlier in this doc for Supabase calls
  from this environment) -- please try the widget after `npm run dev` and
  let me know if it errors. The model ID (`llama-3.3-70b-versatile`) was
  confirmed current against Groq's own docs at the time of writing.

## Symptom Check now survives tab switches / remounts (persisted report)

`analyze.tsx` previously kept its whole flow (`stage`, `form`, `result`,
`analyzedAt`) in local `useState` only. `analyzeSymptoms` already wrote
every generated report to `public.symptom_analyses` (see
`health.functions.ts`), but nothing ever read that table back, so
navigating to another tab and back remounted the component with
`stage = "input"` and an empty `result` -- the report looked "removed"
even though it was safely in the database the whole time, and the only way
to see it again was to answer the whole flow and pay for a fresh AI call.

Fix, no schema change needed:

- `src/lib/health.functions.ts` -- added `getLatestSymptomAnalysis`
  (`GET`, `requireAuth`), following the same `context.supabase`/`userId`
  pattern as `listDashboard`: selects the single most recent
  `symptom_analyses` row for the signed-in user and reshapes it back into
  the form fields + `result` the page needs (`null` if the user has never
  run a check). Exported `SymptomAnalysisResult` as a named type so both
  `analyzeSymptoms`'s return value and this function's `result` field are
  guaranteed to match.
- `src/routes/_authenticated/analyze.tsx` -- on mount, calls
  `getLatestSymptomAnalysis`; if a saved report exists, restores `form`,
  `selected`, `result`, and `analyzedAt` and jumps straight to
  `stage = "result"` instead of defaulting to the blank input form. A
  brief "Loading your last check…" state covers the round trip so the
  input form never flashes first. "New check" still works exactly as
  before (clears local state back to the input stage); it doesn't delete
  the saved row, so a check that's abandoned mid-flow still restores the
  last *completed* report if you leave and come back, and a newly
  completed check simply becomes the new "latest".

## Open item: `/explore/hospitals` "This page didn't load"

I re-audited the entire render path for this route (`hospitals.tsx`,
`HospitalMap`/`HospitalMap.leaflet`/`HospitalMarker`, `LocationInput`,
`HospitalDetails`, `HospitalRecommendationList`/`Card`,
`hospital.functions.ts`, `hospital-service.server.ts`, and every provider
under `src/lib/providers/`) and confirmed: everything Leaflet-related is
still behind the SSR-safe dynamic-import wrapper; nothing reads
`window`/`navigator`/env vars at module-evaluation time outside a function
body; and the page itself makes **no** server-function call on initial
load (`getHospitalRecommendation` only runs after you resolve a location),
so a crash on bare page-load without any interaction is surprising.
`tsc`/`eslint` are clean for every file in this chain, and I confirmed
`leaflet`/`react-leaflet` are actually installed in `node_modules`. I
could not reproduce it myself: this sandbox can't run `npm run dev` (see
the pre-existing rollup/arm64 note above), so I have no way to trigger and
see the real server-side exception directly.

**What I need to fix this**: your terminal's actual output (not the
browser's generic message) from the moment you navigate to
`/explore/hospitals` — `vite dev` prints the real stack trace there even
though the browser only shows "This page didn't load". Paste that and I
can pinpoint it precisely instead of guessing further.

Once that succeeds, run `node scripts/seed-medicines.mjs` (step 3) to
populate the full 500-medicine catalog, then reload `/explore` — the
generic "This page didn't load" SSR error screen you saw is the downstream
symptom of these queries failing during server-side rendering, and should
disappear once the tables exist.
