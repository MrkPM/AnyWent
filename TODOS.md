# AnyWent — TODOs

Captured product decisions and deferred items. Not a sprint plan — things go here when agreed and not yet built.

---

## Discovery screen (Journey 2) — V2

- [ ] **Journey 1 "best pick" card** — single confident recommendation at top of discovery screen with visible reasoning: *"7 artists you follow are playing in Berlin this weekend — best window in 6 weeks."* Requires Spotify import for meaningful signal. Do not build until taste data is rich enough to make the recommendation trustworthy.
- [ ] **Multi-city filter** — let user filter the calendar/discovery view by one or more cities.
- [ ] **Three query modes in nav** — once all three journeys are built, reflect them in the nav (currently: Discover, City, Taste).

## Taste enrichment — V2

- [x] **Spotify import** — built. OAuth connect flow on Taste page; syncs followed artists + top artists (short/medium/long term) into `user_artist_affinities` with source `'spotify'`. Tokens stored in `spotify_connections` table.
- [ ] **Spotify — periodic re-sync** — currently syncs on connect and manual trigger only. Add a daily cron (same pattern as `computeWindows`) to refresh all connected users' affinities.
- [ ] **Spotify — weight differentiation** — followed artists and top artists currently both get weight 1.0. Refine when weight model is revisited: followed = 1.0, top short_term = 0.9, top medium_term = 0.8, top long_term = 0.7.
- [ ] **SoundCloud import** — Artist Pro API ($99/yr). Self-service registration available. Note: genre data from SoundCloud is unreliable — use for artist matching only, not genre inference.
- [ ] **YouTube Music import** — Google OAuth, reads liked/saved artists. Third taste source for V2.

## Event data quality

- [x] **Multi-source enrichment** — built. Duplicate events (same artist, same day, same city) are deduplicated at query time; lower-priority sources contribute their badge, ticket_url, and image_url to the canonical card. Works in both city view and event detail.
- [x] **Fuzzy artist search** — built. `pg_trgm` extension + GIN index on `artists.name`. Handles typos and near-matches.
- [ ] **Scraper artist linking audit** — the RA Kaytranada event had no `event_artists` row (data was silently dropped during scrape). Worth adding a scraper-run check that flags events with zero linked artists as warnings in `scraper_runs`.

## Ranking — V2

- [ ] **Venue following** — `user_venue_affinities` table, venue search on Taste page. Weight: 0.6.
- [ ] **Genre/style following** — Weight: 0.4. Check scraper genre coverage before building.
- [ ] **Richer weight model** — variable weights by source confidence (Spotify saved track vs top artist vs manual follow), recency decay, interaction signals (clicks, ticket link taps), per-user calibration.
- [ ] **Co-occurrence recommendations** — "users who follow X also follow Y." Requires real user data. Do not build until that data exists.

## Infrastructure — deferred

- [ ] **Sentry** — install from day one (CLAUDE.md says this, still not done).
- [ ] **Health endpoint version** — surface `0.2.0` in the `/health` response (already returns it, confirm it's visible in UI footer too).
- [ ] **Redis / Upstash** — add when scraper or request volume justifies it. Not yet.
- [ ] **Deployment** — Railway or Render for API, Vercel for web. Currently local-only.

## City coverage — post-MVP

- [ ] Paris, Vienna, London — scraper effort, add when core product is stable.
