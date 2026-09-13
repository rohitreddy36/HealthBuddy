#!/usr/bin/env node
/**
 * Seeds the 500-entry medicines reference dataset (data/medicines-500.json)
 * into Supabase: public.medicines, public.symptoms, and the
 * public.medicine_symptoms links between them.
 *
 * Prerequisites:
 *   1. supabase/migrations/20260913100000_hospital_medicine_explorer.sql
 *      must already be applied to your Supabase project (it creates the
 *      medicines/symptoms/medicine_symptoms tables). Apply it via the
 *      Supabase SQL editor, or `supabase db push` if you use the CLI.
 *   2. .env must have SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY set
 *      (same values your app already uses -- see src/integrations/supabase/client.server.ts).
 *
 * Usage (from the HealthBuddy project root):
 *   node scripts/seed-medicines.mjs
 *
 * Safe to re-run: it skips medicines/symptoms that already exist (by
 * case-insensitive name) and only inserts what's missing.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function loadEnv(envPath) {
  const env = {};
  let raw;
  try {
    raw = readFileSync(envPath, "utf8");
  } catch {
    return env;
  }
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

const fileEnv = loadEnv(path.join(ROOT, ".env"));
const SUPABASE_URL = process.env.SUPABASE_URL || fileEnv.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || fileEnv.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. Set them in .env (same values the app already uses).",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** "mild_to_moderate_pain" -> "Mild to moderate pain" (sentence case, matches the existing seed's style). */
function humanize(tag) {
  const words = tag.replace(/_/g, " ").trim();
  if (!words) return words;
  return words.charAt(0).toUpperCase() + words.slice(1).toLowerCase();
}

/** "antidiabetic_oral" -> "Antidiabetic Oral" (title case, used for drug_class display). */
function humanizeCategory(tag) {
  return tag
    .replace(/_/g, " ")
    .split(" ")
    .map((w) => (w.length ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ");
}

/** "Paracetamol (Tylenol)" -> ["Tylenol"]; "Paracetamol" -> []. */
function extractBrandNames(name) {
  const match = name.match(/\(([^)]+)\)\s*$/);
  return match ? [match[1]] : [];
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function main() {
  const seedPath = path.join(ROOT, "data", "medicines-500.json");
  const dataset = JSON.parse(readFileSync(seedPath, "utf8"));
  console.log(`Loaded ${dataset.length} medicines from ${path.relative(ROOT, seedPath)}`);

  // 1. Medicines -- skip any whose name already exists (case-insensitive).
  const { data: existingMedicines, error: existingMedicinesErr } = await supabase
    .from("medicines")
    .select("name");
  if (existingMedicinesErr) {
    console.error(
      "Could not read public.medicines -- has the migration been applied yet?",
      existingMedicinesErr.message,
    );
    process.exit(1);
  }
  const existingMedicineNames = new Set((existingMedicines ?? []).map((m) => m.name.toLowerCase()));

  const medicineRows = dataset
    .filter((m) => !existingMedicineNames.has(m.name.toLowerCase()))
    .map((m) => ({
      name: m.name,
      generic_name: m.generic_name,
      brand_names: extractBrandNames(m.name),
      drug_class: humanizeCategory(m.category),
      description: null,
      common_uses: m.common_uses.map(humanize),
      precautions: [],
      side_effects: [],
      prescription_required: Boolean(m.prescription_required),
    }));

  console.log(
    `${medicineRows.length} new medicines to insert (${dataset.length - medicineRows.length} already present, skipped).`,
  );

  for (const batch of chunk(medicineRows, 100)) {
    if (batch.length === 0) continue;
    const { error } = await supabase.from("medicines").insert(batch);
    if (error) {
      console.error("Failed to insert a medicines batch:", error.message);
      process.exit(1);
    }
  }
  console.log("Medicines inserted.");

  // 2. Symptoms -- derive every unique common_uses tag, upsert any missing.
  const allTags = new Set();
  for (const m of dataset) for (const tag of m.common_uses) allTags.add(humanize(tag));

  const symptomRows = [...allTags].map((name) => ({ name }));
  const { error: symptomsErr } = await supabase
    .from("symptoms")
    .upsert(symptomRows, { onConflict: "name", ignoreDuplicates: true });
  if (symptomsErr) {
    console.error("Failed to upsert symptoms:", symptomsErr.message);
    process.exit(1);
  }
  console.log(`Ensured ${symptomRows.length} symptom tags exist.`);

  // 3. medicine_symptoms links -- 'treats' relationship for every medicine x its common_uses.
  const { data: allMedicines, error: allMedicinesErr } = await supabase
    .from("medicines")
    .select("id, name");
  const { data: allSymptoms, error: allSymptomsErr } = await supabase
    .from("symptoms")
    .select("id, name");
  if (allMedicinesErr || allSymptomsErr) {
    console.error(
      "Failed to re-read medicines/symptoms for linking:",
      allMedicinesErr?.message,
      allSymptomsErr?.message,
    );
    process.exit(1);
  }
  const medicineIdByName = new Map((allMedicines ?? []).map((m) => [m.name.toLowerCase(), m.id]));
  const symptomIdByName = new Map((allSymptoms ?? []).map((s) => [s.name.toLowerCase(), s.id]));

  const linkRows = [];
  for (const m of dataset) {
    const medicineId = medicineIdByName.get(m.name.toLowerCase());
    if (!medicineId) continue;
    for (const tag of m.common_uses) {
      const symptomId = symptomIdByName.get(humanize(tag).toLowerCase());
      if (!symptomId) continue;
      linkRows.push({
        medicine_id: medicineId,
        symptom_id: symptomId,
        relationship_type: "treats",
      });
    }
  }

  let linked = 0;
  for (const batch of chunk(linkRows, 500)) {
    if (batch.length === 0) continue;
    const { error } = await supabase.from("medicine_symptoms").upsert(batch, {
      onConflict: "medicine_id,symptom_id,relationship_type",
      ignoreDuplicates: true,
    });
    if (error) {
      console.error("Failed to upsert a medicine_symptoms batch:", error.message);
      process.exit(1);
    }
    linked += batch.length;
  }
  console.log(`Ensured ${linked} medicine <-> symptom links.`);

  console.log("Done. The Explore page should now show the full medicine catalog.");
}

main().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
