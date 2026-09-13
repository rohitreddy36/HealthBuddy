import medicinesDataset from "../../data/medicines-500.json";

import { rankBySimilarity } from "./fuzzy-match";

// Medicine & Symptom Explorer data access (spec sections 11-13) + the
// matching step of the Report -> Medicine pipeline (spec section 14).
//
// This reads from the static data/medicines-500.json dataset (see
// generate.py / IMPLEMENTATION_SUMMARY.md) instead of a Supabase table.
// That dataset ships with the codebase, so Explore/search/report-matching
// all work immediately -- no migration or seed script required, and
// nothing here can fail with "table not found in schema cache". It's
// intentionally still a thin, structured layer: the LLM is never asked to
// invent medicine facts (drug class, side effects, ...) -- it only ever
// extracts raw mentions from a report, and everything else comes straight
// from this dataset.
//
// (Supabase's public.medicines / public.symptoms / public.medicine_symptoms
// tables from the hospital_medicine_explorer migration still exist and are
// harmless, but nothing in the app reads them anymore -- this file is now
// the single source of truth for medicine/symptom reference data.)

interface MedicineJsonEntry {
  id: number;
  name: string;
  generic_name: string;
  common_uses: string[];
  category: string;
  prescription_required: boolean;
}

export interface MedicineRow {
  id: string;
  name: string;
  generic_name: string | null;
  brand_names: string[];
  drug_class: string | null;
  description: string | null;
  common_uses: string[];
  precautions: string[];
  side_effects: string[];
  prescription_required: boolean;
}

export interface SymptomRow {
  id: string;
  name: string;
  description: string | null;
}

/** "mild_to_moderate_pain" -> "Mild to moderate pain" (sentence case, matches the original hand-written seed's display style). */
function humanize(tag: string): string {
  const words = tag.replace(/_/g, " ").trim();
  if (!words) return words;
  return words.charAt(0).toUpperCase() + words.slice(1).toLowerCase();
}

/** "antidiabetic_oral" -> "Antidiabetic Oral" (title case, used for drug_class display). */
function humanizeCategory(tag: string): string {
  return tag
    .replace(/_/g, " ")
    .split(" ")
    .map((w) => (w.length ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ");
}

/** "Paracetamol (Tylenol)" -> ["Tylenol"]; "Paracetamol" -> []. */
function extractBrandNames(name: string): string[] {
  const match = name.match(/\(([^)]+)\)\s*$/);
  return match ? [match[1]] : [];
}

// Built once per server process (the dataset is static), not per request.
let cachedMedicines: MedicineRow[] | null = null;
function allMedicines(): MedicineRow[] {
  if (cachedMedicines) return cachedMedicines;
  cachedMedicines = (medicinesDataset as MedicineJsonEntry[]).map((m) => ({
    id: String(m.id),
    name: m.name,
    generic_name: m.generic_name || null,
    brand_names: extractBrandNames(m.name),
    drug_class: m.category ? humanizeCategory(m.category) : null,
    // Not fabricated -- see IMPLEMENTATION_SUMMARY.md's "Known limitations":
    // these are exactly the kind of specific clinical facts that shouldn't
    // be hard-coded without a licensed pharmacopeia source.
    description: null,
    common_uses: m.common_uses.map(humanize),
    precautions: [],
    side_effects: [],
    prescription_required: Boolean(m.prescription_required),
  }));
  return cachedMedicines;
}

let cachedSymptoms: SymptomRow[] | null = null;
function allSymptoms(): SymptomRow[] {
  if (cachedSymptoms) return cachedSymptoms;
  const names = new Set<string>();
  for (const m of allMedicines()) for (const use of m.common_uses) names.add(use);
  cachedSymptoms = [...names]
    .sort((a, b) => a.localeCompare(b))
    .map((name, i) => ({ id: `symptom-${i + 1}`, name, description: null }));
  return cachedSymptoms;
}

export async function listPopularMedicines(limit = 12): Promise<MedicineRow[]> {
  return [...allMedicines()].sort((a, b) => a.name.localeCompare(b.name)).slice(0, limit);
}

export async function listSymptoms(): Promise<SymptomRow[]> {
  return allSymptoms();
}

export async function getMedicineById(id: string): Promise<MedicineRow | null> {
  return allMedicines().find((m) => m.id === id) ?? null;
}

/**
 * Ranks name/generic_name/brand matches first (with a bounded typo-tolerant
 * fallback -- see fuzzy-match.ts -- so a misspelling like "parachetamol"
 * still finds "Paracetamol"), then treats the query as a possible
 * symptom/condition ("headache", "fever", ...) and appends medicines that
 * treat the best-matching symptom(s) -- the same lookup the "Explore by
 * symptom" chips use. This is what makes the one search box actually cover
 * its own placeholder text ("Search medicines, symptoms, or conditions"):
 * previously "headache" matched no medicine *name* and just came back
 * empty, even though clicking the "Headache" chip worked fine.
 */
export async function searchMedicines(query: string, limit = 20): Promise<MedicineRow[]> {
  const q = query.trim();
  if (!q) return [];

  const nameMatches = rankBySimilarity(q, allMedicines(), limit);
  if (nameMatches.length >= limit) return nameMatches;

  const seen = new Set(nameMatches.map((m) => m.id));
  const matchedSymptoms = rankBySimilarity(q, allSymptoms(), 2);
  const bySymptom = allMedicines()
    .filter(
      (m) =>
        !seen.has(m.id) &&
        matchedSymptoms.some((symptom) =>
          m.common_uses.some((u) => u.toLowerCase() === symptom.name.toLowerCase()),
        ),
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  return [...nameMatches, ...bySymptom].slice(0, limit);
}

/**
 * Lightweight {id, name, generic_name} list of every medicine, used to
 * drive the Explorer search box's live suggestions dropdown on the client
 * (fast, no round-trip per keystroke) -- see explore/index.tsx.
 */
export async function listMedicineNames(): Promise<
  Pick<MedicineRow, "id" | "name" | "generic_name">[]
> {
  return [...allMedicines()]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(({ id, name, generic_name }) => ({ id, name, generic_name }));
}

export async function listMedicinesBySymptom(symptomName: string): Promise<MedicineRow[]> {
  const trimmed = symptomName.trim().toLowerCase();
  if (!trimmed) return [];
  return allMedicines()
    .filter((m) => m.common_uses.some((u) => u.toLowerCase() === trimmed))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export interface MedicineMatchResult {
  medicineId: string | null;
  matchedName: string | null;
  /** true only for a confident (exact, case-insensitive) match against name/generic_name/a brand name. */
  verified: boolean;
}

/**
 * Matching + verification step of the Report -> Medicine pipeline. Only an
 * exact (case-insensitive) match against name/generic_name/brand_names
 * counts as verified -- a weaker partial match is returned for UI context
 * ("possibly similar to X") but MUST NOT be treated as verified or used to
 * build a purchase link (spec section 15).
 */
export async function matchMedicineByName(name: string): Promise<MedicineMatchResult> {
  const trimmed = name.trim();
  if (!trimmed) return { medicineId: null, matchedName: null, verified: false };
  const lower = trimmed.toLowerCase();
  const all = allMedicines();

  const exact = all.find(
    (m) =>
      m.name.toLowerCase() === lower ||
      m.generic_name?.toLowerCase() === lower ||
      m.brand_names.some((b) => b.toLowerCase() === lower),
  );
  if (exact) return { medicineId: exact.id, matchedName: exact.name, verified: true };

  const partial =
    lower.length >= 4
      ? all.find(
          (m) =>
            m.name.toLowerCase().includes(lower) ||
            lower.includes(m.name.toLowerCase()) ||
            m.brand_names.some((b) => b.toLowerCase().includes(lower)),
        )
      : undefined;
  if (partial) return { medicineId: partial.id, matchedName: partial.name, verified: false };

  return { medicineId: null, matchedName: null, verified: false };
}
