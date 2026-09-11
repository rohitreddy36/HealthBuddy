import { createServerFn } from "@tanstack/react-start";

import { requireAuth } from "@/integrations/supabase/auth-middleware";
import { buildReminderContent, sendReminderEmail } from "@/lib/email.server";

export const sendMyReminderEmail = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [{ data: profile }, { data: latest }] = await Promise.all([
      supabase.from("profiles").select("email, full_name").eq("id", userId).maybeSingle(),
      supabase
        .from("symptom_analyses")
        .select("result, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (!profile?.email) {
      throw new Error("No email on file yet \u2014 try signing out and back in.");
    }
    if (!latest?.result) {
      throw new Error("Run a symptom check first, then you can email yourself the guidance.");
    }

    const content = buildReminderContent(
      latest.result,
      latest.created_at,
      profile.email,
      profile.full_name,
    );
    await sendReminderEmail(content);

    return { ok: true, sentTo: profile.email };
  });
