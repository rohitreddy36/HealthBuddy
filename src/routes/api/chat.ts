import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

import { createGoogleGenerativeAI } from "@ai-sdk/google";

const SYSTEM = `You are AIL Health Advisor, a calm, supportive AI health assistant.
- Provide general wellness guidance, explanations of symptoms, diet, lifestyle, and recovery tips.
- Never diagnose or prescribe medication.
- Use simple, reassuring language. Avoid alarming wording.
- If the user describes a possible emergency (severe chest pain, difficulty breathing, stroke signs, suicidal thoughts, severe bleeding, loss of consciousness), tell them to seek urgent medical care immediately.
- End complex answers with a gentle reminder that this is guidance only and not a replacement for a doctor.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages } = (await request.json()) as { messages?: UIMessage[] };
        if (!Array.isArray(messages)) {
          return new Response("Messages required", { status: 400 });
        }
        const key = process.env.GEMINI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY;
        if (!key) return new Response("Missing GEMINI_API_KEY", { status: 500 });

        const provider = createGoogleGenerativeAI({ apiKey: key });
        const result = streamText({
          model: provider("gemini-2.5-flash"),
          system: SYSTEM,
          messages: await convertToModelMessages(messages),
        });
        return result.toUIMessageStreamResponse({ originalMessages: messages });
      },
    },
  },
});
