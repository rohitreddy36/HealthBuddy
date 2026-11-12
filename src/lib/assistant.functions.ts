import { createServerFn } from "@tanstack/react-start";
import { requireAuth, optionalAuth } from "@/integrations/supabase/auth-middleware";
import { assistantInputSchema } from "@/lib/chat-input";
import { answerHealthChat } from "@/lib/chat-response.server";

export const askFloatingAssistant = createServerFn({ method: "POST" })
  .middleware([optionalAuth])
  .validator((input: unknown) => assistantInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const result = await answerHealthChat(data);
    const { supabase, userId } = context;
    let saved = false;
    if (supabase && userId) {
      try {
        // Await persistence: a serverless runtime may freeze after the response.
        const { error } = await supabase
          .from("assistant_messages")
          .insert([
            { user_id: userId, role: "user", content: data.message },
            { user_id: userId, role: "assistant", content: result.reply },
          ])
          .abortSignal(AbortSignal.timeout(3000));
        saved = !error;
        if (error) console.error("[assistant_messages] save failed", { code: error.code });
      } catch {
        console.error("[assistant_messages] save timed out");
      }
    }
    return { ...result, saved };
  });

export const getFloatingAssistantHistory = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("assistant_messages")
      .select("id, role, content, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) return [];
    return (data ?? []).reverse();
  });
