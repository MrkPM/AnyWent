-- Enable RLS on all tables.
-- Our API connects as the postgres superuser (via postgres.js) which bypasses RLS.
-- These policies only affect direct Supabase PostgREST access (anon/authenticated roles).
-- We use Clerk, not Supabase Auth, so auth.uid() is not used — user tables simply
-- have no policies, meaning PostgREST access is denied entirely for those tables.

-- -------------------------
-- Public read-only tables
-- Geography, events, venues, artists — public data, no writes via PostgREST
-- -------------------------

ALTER TABLE countries       ENABLE ROW LEVEL SECURITY;
ALTER TABLE regions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE cities          ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues          ENABLE ROW LEVEL SECURITY;
ALTER TABLE artists         ENABLE ROW LEVEL SECURITY;
ALTER TABLE events          ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_artists   ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_windows   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read" ON countries       FOR SELECT TO anon USING (true);
CREATE POLICY "public_read" ON regions         FOR SELECT TO anon USING (true);
CREATE POLICY "public_read" ON cities          FOR SELECT TO anon USING (true);
CREATE POLICY "public_read" ON venues          FOR SELECT TO anon USING (true);
CREATE POLICY "public_read" ON artists         FOR SELECT TO anon USING (true);
CREATE POLICY "public_read" ON events          FOR SELECT TO anon USING (true);
CREATE POLICY "public_read" ON event_artists   FOR SELECT TO anon USING (true);
CREATE POLICY "public_read" ON event_windows   FOR SELECT TO anon USING (true);

-- -------------------------
-- User data tables — no PostgREST access at all
-- RLS enabled + no policies = deny everything for anon/authenticated roles
-- Only accessible via our API (postgres superuser, bypasses RLS)
-- -------------------------

ALTER TABLE users                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_artist_affinities  ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_artist_affinity    ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_venue_affinity     ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_attendance         ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_connected_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_saved_events       ENABLE ROW LEVEL SECURITY;

-- -------------------------
-- Internal tables — no PostgREST access
-- -------------------------

ALTER TABLE scraper_runs ENABLE ROW LEVEL SECURITY;
