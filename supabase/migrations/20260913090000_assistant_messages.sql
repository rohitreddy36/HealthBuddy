-- History for the floating "HealthBuddy helper" chat widget.
--
-- Only messages from signed-in users are saved (the widget still answers
-- logged-out visitors on the marketing page, it just doesn't persist
-- anything for them). Mirrors the shape/RLS of chat_messages, but is a
-- separate table since the floating widget is a distinct, shorter-form
-- conversation from the full "AI Assistant" page.

CREATE TABLE public.assistant_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.assistant_messages TO authenticated;
GRANT ALL ON public.assistant_messages TO service_role;

ALTER TABLE public.assistant_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own assistant messages" ON public.assistant_messages
  FOR ALL USING ((auth.jwt() ->> 'sub') = user_id) WITH CHECK ((auth.jwt() ->> 'sub') = user_id);

CREATE INDEX assistant_messages_user_idx ON public.assistant_messages(user_id, created_at);
