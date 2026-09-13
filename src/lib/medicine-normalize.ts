// Pure text-normalization helpers for the Report -> Medicine pipeline
// (see hospital-service.server.ts / health.functions.ts for where these
// plug in). No I/O, no env access -- safe to unit test directly.
//
// Pipeline this supports:
//   Report -> text extraction -> medicine entity extraction (AI) ->
//   name normalization (this file) -> DB matching -> verification -> UI
//
// The AI is only ever asked to pull out the raw mention strings it sees
// (e.g. "Tab. Paracetamol 500 mg"); it never invents medicine facts. This
// module turns that raw mention into a clean {name, strength} pair, and the
// DB-matching step (medicine-service.server.ts) decides whether it's
// "verified" against the medicines table.

const DOSAGE_FORM_PREFIXES = new Set([
  "tablet",
  "tab",
  "capsule",
  "cap",
  "syrup",
  "syp",
  "injection",
  "inj",
  "ointment",
  "oint",
  "cream",
  "drop",
  "drops",
  "suspension",
  "susp",
  "lotion",
  "gel",
  "spray",
  "sachet",
  "solution",
  "sol",
]);

// Common route/frequency shorthand that sometimes trails a strength
// ("Augmentin 1.2g IV", "Paracetamol 650mg TDS") -- stripped so it doesn't
// get treated as part of the medicine name.
const ROUTE_FREQUENCY_TOKENS = new Set([
  "od",
  "bd",
  "tds",
  "qid",
  "hs",
  "sos",
  "prn",
  "stat",
  "iv",
  "im",
  "po",
  "sc",
]);

const STRENGTH_RE =
  /\d+(?:\.\d+)?\s?(?:mg|mcg|g|ml|iu|%)(?:\s*\/\s*\d+(?:\.\d+)?\s?(?:mg|mcg|g|ml|iu))?/i;

const LINE_HINT_RE =
  /(\d+(?:\.\d+)?\s?(?:mg|mcg|g|ml|iu|%))|\b(tab|tablet|cap|capsule|syrup|syp|inj|injection)\b/i;

export interface NormalizedMedicineMention {
  /** Cleaned medicine name with dosage form / strength / route stripped. */
  name: string;
  /** e.g. "500 mg", or "500 mg / 125 mg" for a combination drug. Null if none was found. */
  strength: string | null;
}

function stripLeadingDosageForm(text: string): string {
  const match = text.match(/^([a-zA-Z]+)\.?\s+/);
  if (!match) return text;
  if (DOSAGE_FORM_PREFIXES.has(match[1].toLowerCase())) {
    return text.slice(match[0].length);
  }
  return text;
}

function formatStrength(raw: string): string {
  return raw
    .replace(
      /(\d+(?:\.\d+)?)\s*(mg|mcg|g|ml|iu|%)/gi,
      (_all, num: string, unit: string) =>
        `${num} ${unit.toLowerCase() === "iu" ? "IU" : unit.toLowerCase()}`,
    )
    .replace(/\s*\/\s*/g, " / ")
    .trim();
}

/** Parses a raw medicine mention like "Tab. Paracetamol 500 mg" into a clean {name, strength}. */
export function normalizeMedicineMention(raw: string): NormalizedMedicineMention {
  let text = raw.trim().replace(/\s+/g, " ");
  if (!text) return { name: "", strength: null };

  text = stripLeadingDosageForm(text);

  const strengthMatch = text.match(STRENGTH_RE);
  const strength = strengthMatch ? formatStrength(strengthMatch[0]) : null;
  if (strengthMatch && typeof strengthMatch.index === "number") {
    text =
      text.slice(0, strengthMatch.index) +
      text.slice(strengthMatch.index + strengthMatch[0].length);
  }

  const tokens = text.split(/\s+/).filter(Boolean);
  while (tokens.length > 1 && ROUTE_FREQUENCY_TOKENS.has(tokens[tokens.length - 1].toLowerCase())) {
    tokens.pop();
  }

  const name = tokens
    .join(" ")
    .replace(/^[-,.\s]+|[-,.\s]+$/g, "")
    .trim();

  return { name, strength };
}

/**
 * Lightweight, non-AI fallback: pulls lines that look like a medicine
 * mention (has a dosage form word or a strength expression) out of raw
 * document text. Used only if the AI extraction step returns nothing, so a
 * clearly-formatted prescription still surfaces something instead of an
 * empty list.
 */
export function extractMedicineMentionLines(text: string): string[] {
  return text
    .split(/\r?\n|[•\-*]\s+|,(?=\s*[A-Z])/)
    .map((line) => line.trim())
    .filter((line) => line.length > 1 && line.length < 120 && LINE_HINT_RE.test(line));
}
