-- spotify_connections was created in migration 013, after the RLS sweep in migration 012.
-- Enabling RLS here follows the same pattern as all other user data tables:
-- RLS enabled + no policies = PostgREST access denied entirely.
-- Our API connects as the postgres superuser (direct pg connection via postgres.js),
-- which has BYPASSRLS and is unaffected by these policies.
-- We use Clerk, not Supabase Auth, so auth.uid() is not applicable here.

ALTER TABLE spotify_connections ENABLE ROW LEVEL SECURITY;
