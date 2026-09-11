import { useAuth } from "@clerk/tanstack-react-start";
import { useServerFn } from "@tanstack/react-start";
import { Bot, Loader2, Send, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { askFloatingAssistant, getFloatingAssistantHistory } from "@/lib/assistant.functions";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string };

const GREETING: Msg = {
  role: "assistant",
  content:
    "Hi! I'm the HealthBuddy helper. Ask me how to use the site, or a quick health question.",
};

export function FloatingChatbot() {
  const { isLoaded, isSignedIn } = useAuth();
  const ask = useServerFn(askFloatingAssistant);
  const fetchHistory = useServerFn(getFloatingAssistantHistory);

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const historyLoadedFor = useRef<"anon" | "signed-in" | null>(null);

  // Signed-in users get their saved history preloaded; logged-out visitors
  // (or anyone whose history fetch fails) just see the greeting.
  useEffect(() => {
    if (!isLoaded) return;
    const key = isSignedIn ? "signed-in" : "anon";
    if (historyLoadedFor.current === key) return;
    historyLoadedFor.current = key;

    if (!isSignedIn) return;
    fetchHistory()
      .then((rows) => {
        if (rows.length > 0) {
          setMessages(
            rows.map((r) => ({ role: r.role as "user" | "assistant", content: r.content })),
          );
        }
      })
      .catch(() => {
        // Keep the greeting if history can't be loaded — not worth surfacing an error for.
      });
  }, [isLoaded, isSignedIn, fetchHistory]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open, loading]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    const priorHistory = messages.slice(-6).map(({ role, content }) => ({ role, content }));
    setMessages((m) => [...m, { role: "user", content: text }]);
    setInput("");
    setLoading(true);
    try {
      const r = await ask({ data: { message: text, history: priorHistory } });
      setMessages((m) => [...m, { role: "assistant", content: r.reply }]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: "Sorry, I couldn't respond just now — please try again in a moment.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 print:hidden">
      {open && (
        <div
          role="dialog"
          aria-label="HealthBuddy helper chat"
          className="mb-3 w-[calc(100vw-2.5rem)] sm:w-80 h-[26rem] max-h-[70vh] rounded-2xl border bg-card shadow-2xl flex flex-col overflow-hidden animate-chat-pop origin-bottom-right"
        >
          <div className="px-4 py-3 bg-gradient-to-r from-primary to-info text-primary-foreground flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="size-7 rounded-full bg-white/20 grid place-items-center shrink-0">
                <Sparkles className="size-3.5" />
              </span>
              <div className="min-w-0">
                <div className="text-sm font-semibold leading-tight truncate">
                  HealthBuddy helper
                </div>
                <div className="text-[11px] opacity-85 leading-tight truncate">
                  {isSignedIn ? "Saved to your account" : "Site tips & quick health Qs"}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md p-1 hover:bg-white/20 transition-colors shrink-0"
              aria-label="Close chat"
            >
              <X className="size-4" />
            </button>
          </div>

          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto thin-scrollbar px-3 py-3 space-y-2.5"
          >
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-snug whitespace-pre-wrap",
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-secondary text-secondary-foreground rounded-bl-sm",
                  )}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm bg-secondary px-3 py-2">
                  <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>

          <div className="border-t p-2 flex items-center gap-2 shrink-0">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Ask a quick question…"
              maxLength={500}
              className="flex-1 h-9 rounded-full border bg-background px-3 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <Button
              type="button"
              size="icon"
              className="rounded-full size-9 shrink-0"
              onClick={send}
              disabled={loading || !input.trim()}
              aria-label="Send"
            >
              <Send className="size-4" />
            </Button>
          </div>
        </div>
      )}

      <Button
        type="button"
        onClick={() => setOpen((o) => !o)}
        size="icon"
        className="size-14 rounded-full shadow-xl shadow-primary/25 bg-gradient-to-br from-primary to-info hover:shadow-2xl hover:shadow-primary/30 hover:scale-105 transition-all"
        aria-label={open ? "Close chat" : "Open HealthBuddy helper chat"}
      >
        {open ? <X className="size-6" /> : <Bot className="size-6" />}
      </Button>
    </div>
  );
}
