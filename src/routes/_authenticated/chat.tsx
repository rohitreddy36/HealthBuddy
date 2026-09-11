import { useChat } from "@ai-sdk/react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Loader2, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getChatHistory, saveChatMessage } from "@/lib/chat.functions";

export const Route = createFileRoute("/_authenticated/chat")({
  component: Chat,
});

function Chat() {
  const fetchHistory = useServerFn(getChatHistory);
  const [initial, setInitial] = useState<UIMessage[] | null>(null);

  useEffect(() => {
    (async () => {
      const history = await fetchHistory();
      setInitial(
        history.map((m) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          parts: [{ type: "text", text: m.content }],
        })),
      );
    })();
  }, [fetchHistory]);

  if (!initial) {
    return (
      <div className="grid place-items-center h-[60vh] text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }
  return <ChatWindow initial={initial} />;
}

function ChatWindow({ initial }: { initial: UIMessage[] }) {
  const persist = useServerFn(saveChatMessage);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const persistedIds = useRef(new Set(initial.map((m) => m.id)));

  const { messages, sendMessage, status } = useChat({
    messages: initial,
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  // Persist new messages
  useEffect(() => {
    const isStreaming = status === "submitted" || status === "streaming";
    if (isStreaming) return;
    (async () => {
      const newOnes = messages.filter((m) => !persistedIds.current.has(m.id));
      for (const m of newOnes) {
        const text = m.parts
          .map((p) => (p.type === "text" ? p.text : ""))
          .join("")
          .trim();
        if (!text) continue;
        if (m.role !== "user" && m.role !== "assistant") continue;
        await persist({ data: { role: m.role, content: text } });
        persistedIds.current.add(m.id);
      }
    })();
  }, [messages, status, persist]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  const busy = status === "submitted" || status === "streaming";

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    await sendMessage({ text });
  }

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] max-w-3xl mx-auto">
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground text-sm mt-12">
            <p>Ask me anything about your health, diet, or recovery.</p>
            <p className="mt-2 text-xs">e.g. "Can I drink coffee with a cold?"</p>
          </div>
        )}
        {messages.map((m) => {
          const text = m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
          if (m.role === "user") {
            return (
              <div key={m.id} className="flex justify-end">
                <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-primary text-primary-foreground px-4 py-2 text-sm whitespace-pre-wrap">
                  {text}
                </div>
              </div>
            );
          }
          return (
            <div key={m.id} className="text-sm leading-relaxed whitespace-pre-wrap">
              {text}
            </div>
          );
        })}
        {busy && messages[messages.length - 1]?.role === "user" && (
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" /> Thinking…
          </div>
        )}
      </div>

      <form
        onSubmit={submit}
        className="border-t bg-card rounded-2xl p-2 flex items-end gap-2 shadow-sm"
      >
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Type your question…"
          rows={1}
          className="border-0 shadow-none focus-visible:ring-0 resize-none min-h-[40px] max-h-32"
          autoFocus
        />
        <Button type="submit" size="icon" disabled={busy || !input.trim()}>
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  );
}
