import { createFileRoute } from "@tanstack/react-router";
import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import { assistantInputSchema, uiMessagesSchema } from "@/lib/chat-input";
import { answerHealthChat } from "@/lib/chat-response.server";

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const reader = request.body?.getReader();
        if (!reader) return new Response("Messages required", { status: 400 });
        const chunks: Uint8Array[] = [];
        let length = 0;
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          length += value.byteLength;
          if (length > 128000) {
            await reader.cancel();
            return new Response("Conversation too large", { status: 413 });
          }
          chunks.push(value);
        }
        let body: unknown;
        try {
          const bytes = new Uint8Array(length);
          let offset = 0;
          for (const chunk of chunks) {
            bytes.set(chunk, offset);
            offset += chunk.length;
          }
          body = JSON.parse(new TextDecoder().decode(bytes));
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        const parsed = uiMessagesSchema.safeParse(body);
        if (!parsed.success) return new Response("Invalid chat messages", { status: 400 });
        const messages = parsed.data.messages.map((m) => ({
          role: m.role,
          content: m.parts
            .filter((p) => p.type === "text")
            .map((p) => p.text ?? "")
            .join("\n"),
        }));
        const last = messages.at(-1);
        if (last?.role !== "user")
          return new Response("A user question is required", { status: 400 });
        const history = messages.slice(0, -1).slice(-12);
        while (
          history.length &&
          history.reduce((n, m) => n + m.content.length, last.content.length) > 24000
        )
          history.shift();
        const input = assistantInputSchema.safeParse({ message: last.content, history });
        if (!input.success)
          return new Response("Question too long (maximum 2000 characters)", { status: 400 });
        const stream = createUIMessageStream({
          execute: async ({ writer }) => {
            writer.write({ type: "start", messageId: crypto.randomUUID() });
            const answer = await answerHealthChat(input.data);
            writer.write({ type: "text-start", id: "answer" });
            writer.write({ type: "text-delta", id: "answer", delta: answer.reply });
            writer.write({ type: "text-end", id: "answer" });
            for (const [index, source] of answer.sources.entries()) {
              writer.write({
                type: "source-url",
                sourceId: String(index),
                title: source.title,
                url: source.url,
              });
            }
            writer.write({ type: "finish", finishReason: "stop" });
          },
          onError: () => "Unable to answer right now. Please try again shortly.",
        });
        return createUIMessageStreamResponse({ stream });
      },
    },
  },
});
