import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireAuth } from "@/integrations/supabase/auth-middleware";

export const getChatHistory = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("chat_messages")
      .select("id, role, content, created_at")
      .eq("user_id", userId)
      .order("created_at");
    return data ?? [];
  });

const chatMessageInput = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(8000),
});

export const saveChatMessage = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((i: unknown) => chatMessageInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase.from("chat_messages").insert({
      user_id: userId,
      role: data.role,
      content: data.content,
    });
    return { ok: true };
  });
