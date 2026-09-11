-- Adds an opt-out flag for the daily "things to avoid" reminder email.
-- Defaults to enabled; flip to false per-user to stop the daily batch job
-- (supabase/../api/reminders/daily) from emailing them.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_reminders_enabled BOOLEAN NOT NULL DEFAULT true;
