import { z } from "zod";

export const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(8000),
});
export const assistantInputSchema = z
  .object({
    message: z.string().trim().min(1).max(2000),
    history: z.array(chatMessageSchema).max(12).default([]),
  })
  .refine(
    (data) => data.history.reduce((n, m) => n + m.content.length, data.message.length) <= 24000,
    "Conversation too long",
  );

export const uiMessagesSchema = z.object({
  messages: z
    .array(
      z.object({
        id: z.string().max(200),
        role: z.enum(["user", "assistant"]),
        // Non-text SDK parts (sources/steps) are ignored, never passed to the model.
        parts: z
          .array(z.object({ type: z.string().max(40), text: z.string().max(8000).optional() }))
          .min(1)
          .max(20),
      }),
    )
    .min(1)
    .max(100),
});
