import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  getMedicineById,
  listMedicineNames,
  listMedicinesBySymptom,
  listPopularMedicines,
  listSymptoms,
  searchMedicines,
} from "./medicine-service.server";

// TanStack Start server-fn wrappers used by the Medicine & Symptom Explorer
// UI. Medicine/symptom reference data has no per-user ownership (RLS allows
// public SELECT -- see the migration), so these intentionally have no auth
// middleware, matching src/lib/api/example.functions.ts's plain
// createServerFn pattern. The literal REST endpoints from the product spec
// (GET /api/medicines, /api/medicines/:id, /search, /by-symptom) live in
// src/routes/api/medicines/* and call the same service functions.

export const listPopularMedicinesFn = createServerFn({ method: "GET" }).handler(async () =>
  listPopularMedicines(),
);

export const listSymptomsFn = createServerFn({ method: "GET" }).handler(async () => listSymptoms());

// Feeds the Explorer search box's live suggestions dropdown (see
// explore/index.tsx) -- a predefined-name list the user can pick from
// instead of free-typing and hitting a typo, per the product ask for
// "use the predefined ... medicine name ... so the user gets a result".
export const listMedicineNamesFn = createServerFn({ method: "GET" }).handler(async () =>
  listMedicineNames(),
);

// Medicine ids come from the static data/medicines-500.json dataset (plain
// numeric-string ids like "1", not Supabase UUIDs) -- see
// medicine-service.server.ts.
export const getMedicineDetailFn = createServerFn({ method: "GET" })
  .validator((i: unknown) => z.object({ id: z.string().min(1) }).parse(i))
  .handler(async ({ data }) => getMedicineById(data.id));

export const searchMedicinesFn = createServerFn({ method: "GET" })
  .validator((i: unknown) => z.object({ q: z.string().min(1).max(100) }).parse(i))
  .handler(async ({ data }) => searchMedicines(data.q));

export const getMedicinesBySymptomFn = createServerFn({ method: "GET" })
  .validator((i: unknown) => z.object({ symptom: z.string().min(1).max(100) }).parse(i))
  .handler(async ({ data }) => listMedicinesBySymptom(data.symptom));
