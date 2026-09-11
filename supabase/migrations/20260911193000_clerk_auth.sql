-- Migrate auth from Supabase's built-in auth.users to Clerk (third-party auth).
--
-- Before running this: in the Supabase dashboard, go to
-- Authentication -> Sign In / Providers -> Third Party Auth, add Clerk, and
-- paste your Clerk domain (Dashboard -> your app -> the "Connect with
-- Supabase" page, or decode it from your publishable key).
--
-- Clerk user IDs (e.g. "user_2abc...") are TEXT, not UUID, so every
-- ownership column moves from UUID -> TEXT, and RLS switches from
-- auth.uid() to (auth.jwt()->>'sub') -- the Clerk user id claim.
--
-- Apply with `supabase db push` (if you set up the CLI locally) or by
-- pasting this into the Supabase SQL editor.

-- 1. Drop the old auth.users-linked trigger; profile rows are now created
--    by the app itself (server-side, right after a Clerk-authenticated
--    request) instead of by a Postgres trigger on auth.users.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. profiles: id becomes the Clerk user id (text), drop the auth.users FK,
--    add an email column so we can persist it from Clerk on first sign-in.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.profiles ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

DROP POLICY IF EXISTS "own profile" ON public.profiles;
CREATE POLICY "own profile" ON public.profiles
  FOR ALL USING ((auth.jwt() ->> 'sub') = id) WITH CHECK ((auth.jwt() ->> 'sub') = id);

-- 3. chat_messages / symptom_analyses / documents: user_id becomes text,
--    drop the auth.users FK, and update RLS to compare against the Clerk
--    subject claim instead of auth.uid().
ALTER TABLE public.chat_messages DROP CONSTRAINT IF EXISTS chat_messages_user_id_fkey;
ALTER TABLE public.chat_messages ALTER COLUMN user_id TYPE TEXT USING user_id::text;
DROP POLICY IF EXISTS "own messages" ON public.chat_messages;
CREATE POLICY "own messages" ON public.chat_messages
  FOR ALL USING ((auth.jwt() ->> 'sub') = user_id) WITH CHECK ((auth.jwt() ->> 'sub') = user_id);

ALTER TABLE public.symptom_analyses DROP CONSTRAINT IF EXISTS symptom_analyses_user_id_fkey;
ALTER TABLE public.symptom_analyses ALTER COLUMN user_id TYPE TEXT USING user_id::text;
DROP POLICY IF EXISTS "own analyses" ON public.symptom_analyses;
CREATE POLICY "own analyses" ON public.symptom_analyses
  FOR ALL USING ((auth.jwt() ->> 'sub') = user_id) WITH CHECK ((auth.jwt() ->> 'sub') = user_id);

ALTER TABLE public.documents DROP CONSTRAINT IF EXISTS documents_user_id_fkey;
ALTER TABLE public.documents ALTER COLUMN user_id TYPE TEXT USING user_id::text;
DROP POLICY IF EXISTS "own documents" ON public.documents;
CREATE POLICY "own documents" ON public.documents
  FOR ALL USING ((auth.jwt() ->> 'sub') = user_id) WITH CHECK ((auth.jwt() ->> 'sub') = user_id);
