import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";

import { requireAuth } from "@/integrations/supabase/auth-middleware";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

export const MODEL = "gemini-3.8-flash";

export function gateway() {
  const key = process.env.GEMINI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY;
  if (!key) throw new Error("Missing GEMINI_API_KEY in environment variables");
  return createGoogleGenerativeAI({ apiKey: key });
}

function extractJsonObject(text: string) {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) return null;

    try {
      return JSON.parse(cleaned.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

function parseAiJson<T>(text: string, schema: z.ZodType<T>) {
  const parsed = schema.safeParse(extractJsonObject(text));
  return parsed.success ? parsed.data : null;
}

// Stage 1: get follow-up symptom checklist
const followUpSchema = z.object({
  rationale: z.string(),
  follow_up_symptoms: z.array(z.string()),
});

function fallbackFollowUps(symptoms: string): z.infer<typeof followUpSchema> {
  return {
    rationale: `These related symptoms can help refine guidance for ${symptoms.trim() || "your symptoms"}.`,
    follow_up_symptoms: [
      "Fever or chills",
      "Fatigue",
      "Headache",
      "Body aches",
      "Cough",
      "Sore throat",
      "Nausea",
      "Changes in appetite",
    ],
  };
}

export const getFollowUpQuestions = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        symptoms: z.string().min(2).max(500),
        duration: z.string().optional(),
        severity: z.string().optional(),
        ageGroup: z.string().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data }) => {
    const provider = gateway();
    const { text } = await generateText({
      model: provider(MODEL),
      prompt: `Return ONLY valid JSON with this exact shape:
{"rationale":"short calm sentence","follow_up_symptoms":["short symptom phrase"]}

A user reports: "${data.symptoms}". Duration: ${data.duration ?? "n/a"}. Severity: ${data.severity ?? "n/a"}. Age group: ${data.ageGroup ?? "n/a"}.

Generate a calm, neutral checklist of 6-10 additional related symptoms the user might also be experiencing, to help refine analysis. Use short, plain-language phrases (e.g., "Runny nose", "Mild fever", "Sore throat"). Avoid alarming wording.`,
    });

    const parsed = parseAiJson(text, followUpSchema);
    if (!parsed || parsed.follow_up_symptoms.length === 0) return fallbackFollowUps(data.symptoms);
    return {
      rationale: parsed.rationale,
      follow_up_symptoms: parsed.follow_up_symptoms.slice(0, 12),
    };
  });

// Stage 2: full analysis
const analysisSchema = z.object({
  summary: z.string(),
  possible_concerns: z.array(
    z.object({ name: z.string(), confidence: z.enum(["low", "moderate", "high"]) }),
  ),
  self_care: z.array(z.string()),
  diet: z.object({
    include: z.array(z.string()),
    avoid: z.array(z.string()),
    sample_meal_plan: z.object({
      breakfast: z.string(),
      lunch: z.string(),
      dinner: z.string(),
      snacks: z.string(),
    }),
    hydration: z.string(),
  }),
  exercise: z.array(z.string()),
  when_to_seek_care: z.enum(["monitor_at_home", "book_appointment_soon", "seek_urgent_care"]),
  care_reason: z.string(),
  potential_complications: z.string(),
});

function fallbackAnalysis(symptoms: string): z.infer<typeof analysisSchema> {
  return {
    summary: `Your symptoms (${symptoms.trim() || "the symptoms you described"}) may fit with a common short-term illness, but this guidance is not a diagnosis. Keep monitoring how you feel and seek professional advice if symptoms worsen or persist.`,
    possible_concerns: [{ name: "Common viral or mild respiratory illness", confidence: "low" }],
    self_care: [
      "Rest as much as you can",
      "Use warm fluids or lozenges for throat comfort",
      "Monitor temperature and symptom changes",
    ],
    diet: {
      include: ["Warm soups", "Soft foods", "Fruit or other vitamin-rich foods"],
      avoid: ["Alcohol", "Very spicy foods", "Heavy meals if appetite is low"],
      sample_meal_plan: {
        breakfast: "Oatmeal or yogurt with fruit",
        lunch: "Warm soup with toast or rice",
        dinner: "Simple protein with vegetables or broth-based soup",
        snacks: "Fruit, crackers, or warm tea with honey if appropriate",
      },
      hydration: "Sip water or warm non-caffeinated drinks regularly.",
    },
    exercise: [
      "Choose gentle movement only if you feel up to it",
      "Avoid strenuous exercise while feverish or very fatigued",
    ],
    when_to_seek_care: "monitor_at_home",
    care_reason:
      "Many mild symptoms improve with rest and supportive care, but a clinician can help if symptoms persist, worsen, or concern you.",
    potential_complications:
      "Ignoring worsening symptoms may delay care for dehydration, breathing problems, or an infection that needs treatment.",
  };
}

export const analyzeSymptoms = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        symptoms: z.string().min(2),
        duration: z.string().optional(),
        severity: z.string().optional(),
        ageGroup: z.string().optional(),
        medicalHistory: z.string().optional(),
        selectedFollowUps: z.array(z.string()),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const provider = gateway();
    const { text } = await generateText({
      model: provider(MODEL),
      prompt: `Return ONLY valid JSON matching this exact shape:
{"summary":"string","possible_concerns":[{"name":"string","confidence":"low|moderate|high"}],"self_care":["string"],"diet":{"include":["string"],"avoid":["string"],"sample_meal_plan":{"breakfast":"string","lunch":"string","dinner":"string","snacks":"string"},"hydration":"string"},"exercise":["string"],"when_to_seek_care":"monitor_at_home|book_appointment_soon|seek_urgent_care","care_reason":"string","potential_complications":"string"}

You are a calm, careful health guidance assistant. Provide non-alarming, supportive guidance ONLY. Do not diagnose.

User profile:
- Age group: ${data.ageGroup ?? "n/a"}
- Medical history: ${data.medicalHistory ?? "none provided"}

Primary report: ${data.symptoms}
Duration: ${data.duration ?? "n/a"}
Severity: ${data.severity ?? "n/a"}
Additional symptoms confirmed: ${data.selectedFollowUps.join(", ") || "none"}

Return structured guidance. Keep wording reassuring. Confidence should be conservative.`,
    });
    const output = parseAiJson(text, analysisSchema) ?? fallbackAnalysis(data.symptoms);

    // Persist
    const { supabase, userId } = context;
    await supabase.from("symptom_analyses").insert({
      user_id: userId,
      initial_symptoms: data.symptoms,
      duration: data.duration,
      severity: data.severity,
      age_group: data.ageGroup,
      medical_history: data.medicalHistory,
      follow_up_symptoms: data.selectedFollowUps,
      result: output,
    });

    return output;
  });

// Document analyzer
const documentSchema = z.object({
  document_type: z.string(),
  simple_summary: z.string(),
  key_findings: z.array(z.object({ term: z.string(), explanation: z.string() })),
  values_to_watch: z.array(z.object({ name: z.string(), value: z.string(), note: z.string() })),
  questions_for_doctor: z.array(z.string()),
  suggested_tracking: z.array(z.string()),
});

function fallbackDocAnalysis(text: string): z.infer<typeof documentSchema> {
  return {
    document_type: "Medical document",
    simple_summary: text.trim()
      ? "We couldn't fully parse this document automatically. Here is a general explanation: medical reports usually list measurements or instructions from your clinician. Please review with your doctor for specifics."
      : "No readable content was detected. Try uploading a clearer image or pasting the text.",
    key_findings: [],
    values_to_watch: [],
    questions_for_doctor: [
      "Can you walk me through this report in plain language?",
      "Are any values outside the normal range, and what does that mean for me?",
      "What should I do next based on these results?",
    ],
    suggested_tracking: ["Symptoms over time", "Medication adherence", "Follow-up appointments"],
  };
}

export const analyzeDocument = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        title: z.string().min(1).max(200),
        text: z.string().max(20000).optional(),
        imageDataUrl: z
          .string()
          .regex(/^data:(image\/(png|jpe?g|webp|gif)|application\/pdf);base64,/)
          .max(15_000_000)
          .optional(),
      })
      .refine((v) => (v.text && v.text.trim().length >= 10) || v.imageDataUrl, {
        message: "Provide report text or upload an image/PDF.",
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const provider = gateway();

    const instructions = `You are a medical report / prescription explainer. Read the document (text or image) and produce plain-language guidance for a non-clinical reader. Do not diagnose. Flag values that appear outside common reference ranges, but stay calm and non-alarming.

Return ONLY valid JSON of this exact shape:
{"document_type":"string","simple_summary":"string","key_findings":[{"term":"string","explanation":"string"}],"values_to_watch":[{"name":"string","value":"string","note":"string"}],"questions_for_doctor":["string"],"suggested_tracking":["string"]}`;

    const userParts: Array<
      | { type: "text"; text: string }
      | { type: "image"; image: string; mediaType?: string }
      | { type: "file"; data: string; mediaType: string }
    > = [{ type: "text", text: instructions }];

    if (data.text && data.text.trim()) {
      userParts.push({ type: "text", text: `DOCUMENT TEXT:\n${data.text}` });
    }
    if (data.imageDataUrl) {
      const mediaType = data.imageDataUrl.slice(5, data.imageDataUrl.indexOf(";"));
      if (mediaType === "application/pdf") {
        userParts.push({ type: "file", data: data.imageDataUrl, mediaType });
      } else {
        userParts.push({ type: "image", image: data.imageDataUrl, mediaType });
      }
    }

    const { text } = await generateText({
      model: provider(MODEL),
      messages: [{ role: "user", content: userParts as never }],
    });

    const output = parseAiJson(text, documentSchema) ?? fallbackDocAnalysis(data.text ?? "");

    const { supabase, userId } = context;
    const { data: row } = await supabase
      .from("documents")
      .insert({
        user_id: userId,
        title: data.title,
        doc_type: output.document_type,
        original_text: data.text ?? (data.imageDataUrl ? "[uploaded file]" : ""),
        analysis: output,
      })
      .select()
      .single();

    return { id: row?.id, analysis: output };
  });

// ---- Dashboard insights (care-urgency breakdown, top concerns, weekly trend) ----

type CareUrgency = "monitor_at_home" | "book_appointment_soon" | "seek_urgent_care";

const CARE_URGENCY_VALUES: CareUrgency[] = [
  "monitor_at_home",
  "book_appointment_soon",
  "seek_urgent_care",
];

function startOfIsoWeek(d: Date) {
  const day = (d.getDay() + 6) % 7; // Monday = 0 ... Sunday = 6
  const s = new Date(d);
  s.setHours(0, 0, 0, 0);
  s.setDate(s.getDate() - day);
  return s;
}

// Aggregates a batch of symptom_analyses rows (created_at + the AI's jsonb
// `result`) into the shapes the dashboard charts consume. Pure/sync so it's
// easy to keep independent of how many rows were fetched.
function buildDashboardInsights(rows: { created_at: string; result: unknown }[]) {
  const careBreakdown: Record<CareUrgency, number> = {
    monitor_at_home: 0,
    book_appointment_soon: 0,
    seek_urgent_care: 0,
  };
  const concernCounts = new Map<string, number>();

  const now = new Date();
  const thisWeekStart = startOfIsoWeek(now);
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const ws = new Date(thisWeekStart);
    ws.setDate(ws.getDate() - (7 - i) * 7);
    return {
      weekStart: ws.toISOString(),
      label: ws.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      count: 0,
    };
  });

  for (const row of rows) {
    const r = (row.result ?? {}) as Record<string, unknown>;

    const urgency = r.when_to_seek_care;
    if (typeof urgency === "string" && (CARE_URGENCY_VALUES as string[]).includes(urgency)) {
      careBreakdown[urgency as CareUrgency]++;
    }

    const concerns = Array.isArray(r.possible_concerns) ? r.possible_concerns : [];
    for (const c of concerns) {
      const name = (c as Record<string, unknown> | null)?.name;
      if (typeof name === "string" && name.trim()) {
        concernCounts.set(name, (concernCounts.get(name) ?? 0) + 1);
      }
    }

    const bucketStart = startOfIsoWeek(new Date(row.created_at)).toISOString();
    const bucket = weeks.find((w) => w.weekStart === bucketStart);
    if (bucket) bucket.count++;
  }

  const topConcerns = Array.from(concernCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  return { careBreakdown, topConcerns, weeklyTrend: weeks };
}

export const listDashboard = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [
      { data: analyses },
      { data: analysesForInsights },
      { count: totalChecks },
      { data: documents },
      { count: totalReports },
      { data: profile },
      { data: quickQuestions },
    ] = await Promise.all([
      supabase
        .from("symptom_analyses")
        .select("id, initial_symptoms, created_at, result")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10),
      // Wider window purely for the insights aggregation below — capped at
      // 200 so a long-lived account doesn't ship its whole history to the client.
      supabase
        .from("symptom_analyses")
        .select("created_at, result")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("symptom_analyses")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),
      supabase
        .from("documents")
        .select("id, title, doc_type, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase.from("documents").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase
        .from("assistant_messages")
        .select("id, content, created_at")
        .eq("user_id", userId)
        .eq("role", "user")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    const insights = buildDashboardInsights(analysesForInsights ?? []);

    return {
      analyses: analyses ?? [],
      documents: documents ?? [],
      profile: profile ?? null,
      quickQuestions: quickQuestions ?? [],
      insights: {
        ...insights,
        totalChecks: totalChecks ?? (analysesForInsights ?? []).length,
        totalReports: totalReports ?? 0,
      },
    };
  });
