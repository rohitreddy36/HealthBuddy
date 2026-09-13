// Deterministic, keyword-based fallback used only when the Gemini triage
// call (hospital-service.server.ts -> triageForHospital) is unavailable or
// fails to return usable JSON -- mirrors the fallback*() pattern already
// used throughout health.functions.ts. It's intentionally simple: it never
// needs to be "smart", just safe and available with zero dependencies.

export type TriageUrgency = "routine" | "soon" | "emergency";

export interface FallbackTriageResult {
  recommended_specialty: string;
  urgency: TriageUrgency;
  matched_keywords: string[];
}

interface SpecialtyRule {
  specialty: string;
  keywords: string[];
}

// Phrases that, on their own, warrant flagging urgent medical attention
// regardless of which specialty looks relevant (spec section 18, Emergency
// handling). Err on the side of caution here -- a missed emergency flag is
// worse than an unnecessary one.
const EMERGENCY_KEYWORDS = [
  "difficulty breathing",
  "trouble breathing",
  "can't breathe",
  "cannot breathe",
  "shortness of breath",
  "chest pain",
  "severe bleeding",
  "unconscious",
  "unresponsive",
  "stroke",
  "seizure",
  "severe allergic reaction",
  "anaphylaxis",
  "suicidal",
  "coughing blood",
  "blue lips",
];

const SOON_KEYWORDS = [
  "high fever",
  "severe pain",
  "persistent vomiting",
  "dehydration",
  "worsening",
  "blood in stool",
  "blood in urine",
];

// Order matters: the first matching rule wins, so more distinctive keywords
// should come before generic ones. This is a coarse safety net, not a
// diagnostic tool -- the AI path (Gemini) is the primary source of truth
// whenever GEMINI_API_KEY is configured.
const SPECIALTY_RULES: SpecialtyRule[] = [
  {
    specialty: "Pulmonology",
    keywords: ["cough", "breath", "wheeze", "chest congestion", "asthma"],
  },
  { specialty: "Cardiology", keywords: ["chest pain", "palpitation", "heart", "blood pressure"] },
  {
    specialty: "Neurology",
    keywords: ["headache", "migraine", "dizziness", "numbness", "seizure", "memory loss"],
  },
  {
    specialty: "Gastroenterology",
    keywords: ["stomach", "abdominal", "nausea", "vomit", "diarrhea", "acidity", "heartburn"],
  },
  {
    specialty: "ENT",
    keywords: ["sore throat", "ear pain", "sinus", "runny nose", "blocked nose"],
  },
  { specialty: "Dermatology", keywords: ["rash", "itching", "skin", "hives"] },
  { specialty: "Orthopedics", keywords: ["joint pain", "bone", "fracture", "sprain", "back pain"] },
  { specialty: "Gynecology", keywords: ["pregnan", "menstrual", "period pain"] },
  { specialty: "Pediatrics", keywords: ["infant", "toddler", "my child", "my baby"] },
];

export function fallbackTriage(symptomsText: string): FallbackTriageResult {
  const text = symptomsText.toLowerCase();

  let urgency: TriageUrgency = "routine";
  if (EMERGENCY_KEYWORDS.some((k) => text.includes(k))) urgency = "emergency";
  else if (SOON_KEYWORDS.some((k) => text.includes(k))) urgency = "soon";

  for (const rule of SPECIALTY_RULES) {
    const matched = rule.keywords.filter((k) => text.includes(k));
    if (matched.length > 0) {
      return { recommended_specialty: rule.specialty, urgency, matched_keywords: matched };
    }
  }

  return { recommended_specialty: "General Medicine", urgency, matched_keywords: [] };
}

/** Splits a free-text symptom report into individual symptom phrases. */
export function splitSymptomsList(symptomsText: string): string[] {
  return symptomsText
    .split(/,|;|\band\b/gi)
    .map((s) => s.trim())
    .filter(Boolean);
}
