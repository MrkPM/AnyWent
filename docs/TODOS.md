# AnyWent — Full Feature & Todo List

> Everything mentioned during the brainstorm, in one place. See ROADMAP.md for phased prioritisation.

---

## Data Sources

- [ ] Resident Advisor GraphQL scraper (Berlin, Amsterdam, Prague)
- [ ] Songkick API scraper (Berlin, Amsterdam, Prague)
- [ ] Dice.fm reverse-engineered API scraper (Berlin, Amsterdam)
- [ ] Bandsintown API integration
- [ ] Email digest pipeline (n8n + LLM extraction for museum/gallery newsletters)
- [ ] Manual venue + event seeding for museums (MVP stopgap)
- [ ] Per-venue scrapers for major museums without newsletters
- [ ] Festivalfinder.eu scraper/integration
- [ ] Google Events / schema.org structured data scraping
- [ ] Eventbrite integration (exhibition openings, cultural events)

---

## Geography

- [ ] Country → region → city → venue hierarchy in schema
- [ ] Geocoding on venue creation (lat/lng → full hierarchy via Nominatim or Google Maps)
- [ ] Region-level queries ("what's on in Oberösterreich")
- [ ] City coverage: Berlin, Prague, Amsterdam (MVP)
- [ ] City coverage: Paris, Vienna, London (post-MVP)
- [ ] Support for festivals and events outside cities (pinned to region, not city)

---

## Data Model & Infrastructure

- [ ] Full Postgres schema (events, venues, artists, cities, regions, countries)
- [ ] Per-user tables (affinity, attendance, saved events, connected accounts)
- [ ] Redis caching layer (scraper responses, rate limiting) — defer from MVP, add when needed
- [ ] Stale event flagging (thresholds per source type)
- [ ] Cross-source deduplication logic (same event from RA + Dice etc.)
- [ ] `raw_data` jsonb field on events for scraper debugging
- [ ] `source_url` always stored and always linked — never stripped
- [ ] Affiliate URL field on events (populated post-MVP)
- [ ] Scraper jobs isolated from main API (write-only to DB)
- [ ] `scraper_runs` table (source, started_at, finished_at, events_upserted, errors)

---

## Taste Model

- [ ] Manual artist follow (search + add in UI)
- [ ] Spotify connect — OAuth enrichment flow (not login)
- [ ] Spotify: import followed artists
- [ ] Spotify: import top artists (stronger signal)
- [ ] Spotify: import saved albums (weaker signal)
- [ ] Apple Music connect (same pattern as Spotify)
- [ ] YouTube Music connect (same pattern as Spotify)
- [ ] Venue affinity tracking (manual + derived from attendance)
- [ ] Affinity co-occurrence model: attended event → update artist weights for full lineup
  - Headliner: +0.4, support: +0.15, same bill: +0.05 (tunable weights)
- [ ] "You may also like" suggestions based on co-occurrence graph
- [ ] Genre tagging on artists and events
- [ ] Affinity badge on event cards (High / Medium / Low — never show raw number)

---

## Query & Discovery

- [ ] Discovery mode: "show me the best weekends in Europe in the next N weeks"
- [ ] City mode: "what's on in Berlin next weekend"
- [ ] Bundle ranking algorithm (affinity sum + uniqueness bonus + density bonus + category diversity bonus)
- [ ] Region/country filter on discovery mode
- [ ] "You're already going — want to extend?" nudge (event just outside trip window)
- [ ] Date range flexibility (custom range, not just weekends)

---

## Frontend — Screens

- [ ] Home / query screen (discovery + city mode toggle)
- [ ] Bundle card list view
- [ ] City weekend view (drill-down from bundle)
- [ ] Event detail view (full lineup, source attribution, ticket link)
- [ ] Artist page (upcoming events, affinity indicator)
- [ ] Venue page (upcoming events, affinity indicator)
- [ ] Saved / bookmarked events screen
- [ ] Profile & taste screen
- [ ] Onboarding flow (account → Spotify connect → add artists → pick cities)
- [ ] Map view — toggle on city weekend view (post-MVP)

---

## Auth & Accounts

- [ ] AnyWent account (email/password via Clerk)
- [ ] Google social login (via Clerk — convenience, not required)
- [ ] Spotify connect (enrichment only — separate from login)
- [ ] Spotify disconnect (derived data retained unless user requests deletion)
- [ ] Multi-user support (schema ready from day one, UI in v2)

---

## Testing

- [ ] Unit tests — bundle ranking algorithm (silent scoring bugs are hard to spot)
- [ ] Unit tests — affinity weight calculations
- [ ] Unit tests — date/timezone handling (UTC bugs are nasty)
- [ ] Unit tests — scraper data parsers (catches API shape changes before they corrupt data)
- [ ] Integration tests — one smoke test per scraper (validates output shape against real API)
- [ ] E2E test — critical path: query → bundle results → event detail → source link present (Playwright)
- [ ] Schema migration tests — every migration should have a reversible down path

---

## Monetisation

- [ ] Affiliate links on ticket CTAs (Songkick, Dice programs)
- [ ] Premium subscription tier (advanced trip planning, alerts, unlimited cities)
- [ ] Venue / promoter listing tier (longer term)
- [ ] Data partnerships with labels / booking agents (speculative, long game)

---

## Good Citizen / Ethics

- [ ] Rate limiting on all scrapers (reasonable crawl intervals)
- [ ] Aggressive caching (Redis, avoid repeat hammering)
- [ ] All events link back to original source URL
- [ ] Source attribution visible on every event card ("Via RA", "Via Songkick")
- [ ] Explore affiliate partnerships as formalised data access (long term)

---

## Mobile

- [ ] Web frontend built React-first, React Native / Expo compatible later
- [ ] API stateless + token auth (mobile-ready from day one)
- [ ] Bottom navigation (not hamburger) in mobile layout
- [ ] Native date pickers on mobile
- [ ] Push notifications: "Artist X just announced [city]" (post-MVP)

---

## Versioning

- [ ] Semantic versioning from day one (`major.minor.patch` in package.json)
- [ ] Version visible in app footer and `/health` endpoint response
- [ ] PWA service worker with version-based cache busting (v2 — when service worker is added)

---

## Ops & Reliability

- [ ] `/health` endpoint (returns version, DB status, last successful scraper run per source)
- [ ] Sentry error monitoring — free tier, install from day one (catches production errors with full stacktraces)
- [ ] Scraper error logging and alerting
- [ ] Stale event admin view (manual review queue)
- [ ] New unmatched venue queue (from email pipeline — requires manual review)
- [ ] n8n workflow version-controlled in `/pipelines/n8n/`
- [ ] `.env.example` file committed to repo (all required variables, no real values)
- [ ] Environment variables for all API keys (never hardcoded)
- [ ] Deployed: Vercel (frontend) + Railway/Render (backend) + Supabase (Postgres)
