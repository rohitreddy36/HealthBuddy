import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const env = {};
for (const line of readFileSync(".env", "utf8").split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i === -1) continue;
  env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^['"]|['"]$/g, "");
}
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

for (const table of ["specialties","symptoms","medicines","medicine_symptoms","hospitals","hospital_specialties","hospital_search_cache"]) {
  const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
  console.log(table, "->", error ? "ERROR: " + error.message : count);
}
const { data: pm, error: pmErr } = await supabase.from("medicines").select("name").ilike("name", "%paracetamol%").limit(5);
console.log("paracetamol-ish rows:", pmErr ? pmErr.message : pm);
