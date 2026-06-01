# AnyWent — TODOs

Captured product decisions and deferred items. Not a sprint plan — things go here when agreed and not yet built.

---

## Discovery screen (Journey 2) — V2

- [ ] **Journey 1 "best pick" card** — single confident recommendation at top of discovery screen with visible reasoning: *"7 artists you follow are playing in Berlin this weekend — best window in 6 weeks."* Requires Spotify import for meaningful signal. Do not build until taste data is rich enough to make the recommendation trustworthy.
- [ ] **Multi-city filter** — let user filter the calendar/discovery view by one or more cities.
- [ ] **Three query modes in nav** — once all three journeys are built, reflect them in the nav (currently: Discover, City, Taste).

## Taste enrichment — V2

- [ ] **Spotify import** — connect Spotify on sign-in, auto-follow artists from liked tracks / top artists. Commercial use confirmed acceptable (Bandsintown precedent). Required for Journey 1 to be meaningful.
- [ ] **SoundCloud import** — Artist Pro API ($99/yr). Self-service registration available. Note: genre data from SoundCloud is unreliable — use for artist matching only, not genre inference.
- [ ] **YouTube Music import** — Google OAuth, reads liked/saved artists. Third taste source for V2.

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
