import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { z } from "zod";

// Shared AI providers + resilient JSON-from-text helpers. Every AI-backed
// feature (symptom analysis, document explainer, hospital triage) goes
// through the Gemini provider below so there is exactly one way the app
// talks to Gemini and exactly one way it parses "the model said it would
// return JSON". See health.functions.ts and hospital-service.server.ts
// for callers.
//
// The floating "HealthBuddy helper" widget (assistant.functions.ts) is the
// one exception -- it runs on Groq instead (see groqGateway below), kept
// separate from the Gemini-backed features above.

export const MODEL = "gemini-3.8-flash";

export function gateway() {
  const key = process.env.GEMINI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY;
  if (!key) throw new Error("Missing GEMINI_API_KEY in environment variables");
  return createGoogleGenerativeAI({ apiKey: key });
}

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY);
}

// Groq exposes an OpenAI-compatible chat completions endpoint, so it's
// wired up through @ai-sdk/openai-compatible rather than a dedicated Groq
// SDK package. Server-only key -- never prefixed with VITE_.
export const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

export function groqGateway() {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("Missing GROQ_API_KEY in environment variables");
  return createOpenAICompatible({
    name: "groq",
    baseURL: "https://api.groq.com/openai/v1",
    apiKey: key,
  });
}

export function isGroqConfigured(): boolean {
  return Boolean(process.env.GROQ_API_KEY);
}

export function extractJsonObject(text: string) {
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

export function parseAiJson<T>(text: string, schema: z.ZodType<T>): T | null {
  const parsed = schema.safeParse(extractJsonObject(text));
  return parsed.success ? parsed.data : null;
}
