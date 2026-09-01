CREATE TABLE schema_migrations (
  filename   TEXT        PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Backfill all previously applied migrations.
-- applied_at is the git commit date of each migration file (approximate).
INSERT INTO schema_migrations (filename, applied_at) VALUES
  ('001_initial_schema.up.sql',               '2026-05-27T11:17:35+02:00'),
  ('002_add_scraper_runs.up.sql',             '2026-05-27T11:17:35+02:00'),
  ('003_events_source_url_unique.up.sql',     '2026-05-27T13:20:50+02:00'),
  ('004_scraper_runs_add_goout.up.sql',       '2026-05-29T12:03:34+02:00'),
  ('005_add_goout_source.up.sql',             '2026-05-29T12:03:34+02:00'),
  ('006_add_project_space_venue_type.up.sql', '2026-05-31T15:50:54+02:00'),
  ('007_events_add_image_url.up.sql',         '2026-05-31T15:50:54+02:00'),
  ('008_events_add_time_known.up.sql',        '2026-05-31T20:32:33+02:00'),
  ('009_user_artist_affinities.up.sql',       '2026-05-31T22:52:44+02:00'),
  ('010_event_windows.up.sql',                '2026-06-01T12:15:01+02:00'),
  ('011_add_paris_mallorca.up.sql',           '2026-06-02T18:45:21+02:00'),
  ('012_enable_rls.up.sql',                   '2026-06-02T18:45:21+02:00'),
  ('013_spotify_connections.up.sql',          '2026-06-03T19:20:47+02:00'),
  ('014_spotify_display_name.up.sql',         '2026-06-03T22:16:46+02:00'),
  ('015_artists_trgm_index.up.sql',           '2026-06-03T22:16:46+02:00'),
  ('016_add_tier1_cities.up.sql',             '2026-06-18T22:01:37+02:00'),
  ('017_spotify_connections_rls.up.sql',      '2026-06-18T22:01:37+02:00'),
  ('018_add_barcelona.up.sql',                '2026-06-18T22:01:37+02:00'),
  ('fix_kaytranada_artist_link.sql',          '2026-06-04T15:10:31+02:00');
