import { createFileRoute } from "@tanstack/react-router";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { buildReminderContent, sendReminderEmail } from "@/lib/email.server";

// Protected batch endpoint meant to be hit by an external scheduler once a
// day (see .github/workflows/daily-reminder.yml, or a Cloudflare Cron
// Trigger / any cron host if deployed elsewhere). Not reachable without the
// REMINDER_CRON_SECRET bearer token, and never called from the browser.
async function handleDailyReminders(request: Request) {
  const secret = process.env.REMINDER_CRON_SECRET;
  if (!secret) {
    return new Response("REMINDER_CRON_SECRET is not configured", { status: 500 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { data: profiles, error } = await supabaseAdmin
    .from("profiles")
    .select("id, email, full_name, email_reminders_enabled")
    .eq("email_reminders_enabled", true)
    .not("email", "is", null);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const profile of profiles ?? []) {
    if (!profile.email) {
      skipped++;
      continue;
    }
    const { data: latest } = await supabaseAdmin
      .from("symptom_analyses")
      .select("result, created_at")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!latest?.result) {
      skipped++;
      continue;
    }

    try {
      const content = buildReminderContent(
        latest.result,
        latest.created_at,
        profile.email,
        profile.full_name,
      );
      await sendReminderEmail(content);
      sent++;
    } catch (err) {
      console.error("[daily-reminder] failed for", profile.id, err);
      failed++;
    }
  }

  return Response.json({ sent, skipped, failed });
}

export const Route = createFileRoute("/api/reminders/daily")({
  server: {
    handlers: {
      GET: async ({ request }) => handleDailyReminders(request),
      POST: async ({ request }) => handleDailyReminders(request),
    },
  },
});
