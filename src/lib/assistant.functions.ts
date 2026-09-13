import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";

import { requireAuth, optionalAuth } from "@/integrations/supabase/auth-middleware";
import { MODEL, gateway } from "@/lib/ai.server";

// Answers anyone (including logged-out visitors on the marketing page), but
// only *saves* the conversation when the caller happens to be signed in —
// see optionalAuth. This keeps the widget usable everywhere while still
// giving signed-in users a real history, tracked the same way as their
// symptom checks and reports.
const SYSTEM_PROMPT = `You are the small floating help widget on HealthBuddy (AIL Health Advisor), a
website that offers a guided symptom checker, an AI health chat, and a medical report explainer.

Rules:
- Only answer questions about (a) how to use this website / its features, or (b) general health
  and wellness information.
- If asked about anything else (coding, news, unrelated trivia, etc.), briefly and kindly say you
  can only help with HealthBuddy and health questions, and redirect.
- Keep every reply SHORT: 1-3 sentences. No headers, no long bullet lists (at most 3 short bullets
  if genuinely useful). This is a small chat bubble, not a document.
- Never diagnose or claim certainty. For anything about the user's own specific symptoms, point
  them to the "Symptom Check" page for a full guided analysis.
- Be warm, calm, and plain-spoken — not clinical or robotic.`;

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(1000),
});

function fallbackReply() {
  return "Sorry, I'm having trouble responding right now — please try again in a moment, or head to the Symptom Check page for a full guided analysis.";
}

export const askFloatingAssistant = createServerFn({ method: "POST" })
  .middleware([optionalAuth])
  .validator((i: unknown) =>
    z
      .object({
        message: z.string().min(1).max(500),
        history: z.array(messageSchema).max(8).optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    let reply: string;
    try {
      const provider = gateway();
      const transcript = (data.history ?? [])
        .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
        .join("\n");

      const { text } = await generateText({
        model: provider(MODEL),
        system: SYSTEM_PROMPT,
        prompt: `${transcript ? transcript + "\n" : ""}User: ${data.message}\nAssistant:`,
      });

      reply = text.trim() || fallbackReply();
    } catch (err) {
      console.error("askFloatingAssistant failed", err);
      reply = fallbackReply();
    }

    // Best-effort save, signed-in users only. Never let a logging failure
    // break the chat response itself.
    const { supabase, userId } = context;
    const savedReply = reply.slice(0, 700);
    if (supabase && userId) {
      void (async () => {
        const { error } = await supabase.from("assistant_messages").insert([
          { user_id: userId, role: "user", content: data.message },
          { user_id: userId, role: "assistant", content: savedReply },
        ]);
        if (error) console.error("[assistant_messages] save failed", error);
      })();
    }

    return { reply: savedReply, saved: Boolean(supabase && userId) };
  });

export const getFloatingAssistantHistory = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("assistant_messages")
      .select("id, role, content, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(30);

    if (error) {
      console.error("[assistant_messages] history fetch failed", error);
      return [];
    }
    return data ?? [];
  });
