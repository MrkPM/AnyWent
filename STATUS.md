# AnyWent — Status

**Version:** 0.2.0  
**Last updated:** 2026-06-19

---

## What's Built

### Infrastructure
- Fastify API (Node.js + TypeScript), React frontend (TypeScript + Vite), PostgreSQL via Supabase
- pnpm monorepo (`api/`, `web/`, `packages/`)
- 18 migrations with reversible down paths — full schema history from scratch
- Row-level security enabled on all user tables; API connects as postgres superuser (BYPASSRLS), blocking PostgREST entirely
- Clerk auth wrapped in two files only (`api/src/middleware/auth.ts`, `web/src/hooks/useAuth.ts`) — swappable without touching application code
- Scraper jobs isolated as separate Node processes — write to DB only, never called inline by the API
- `scraper_runs` table logging every run with outcome

### Data Pipeline
- Three scrapers: **RA** (GraphQL), **Songkick** (LD+JSON from HTML, no API key), **GoOut**
- Multi-source deduplication and field enrichment: events from multiple sources merged at query time, with priority RA > Dice > Songkick > others; lower-priority sources fill in missing fields (image, ticket URL, exact time) on the canonical record
- Enrichment logic centralised in `getEventsByCity` — scrapers need no changes to participate
- `data/ra-cities.tsv` — full global RA city reference with area IDs and Songkick metro ID counterparts

### City Coverage (19 cities, 8 countries)
Amsterdam · Barcelona · Berlin · Dresden · Florence · Ibiza · Lisbon · Lyon · Mallorca · Marseille · Milan · Munich · Nice · Paris · Porto · Prague · Rome · The Hague · Vienna

### Auth & Personalisation
- Spotify OAuth (PKCE flow, token exchange + refresh, scoped to one user)
- Affinity scoring engine: artist follow (1.0) + venue follow (0.6) + genre (0.4); events with no match score 0.1 and rank last
- `user_artist_affinities` table; per-user data always scoped by `user_id TEXT` (Clerk ID)
- Taste page: Spotify-connected artist import, affinity management

### UI / Pages
- **Home** (`/`) — Journey 3: city + date range, events ranked by affinity score
- **Discover** (`/discover`) — Journey 2 foundation: calendar agenda grouped by time horizon (this weekend / next weekend / …), cities ranked by taste score, accordion view
- **BundleDetail** — expanded view of a city window with full event list
- **EventDetail** — individual event with source link, venue, artists
- **Taste** (`/taste`) — Spotify connection, followed artists, affinity weights

### API Endpoints
`/bundles`, `/cities`, `/clusters`, `/events`, `/health`, `/spotify`, `/taste`, `/windows`

---

## In Progress / Recently Done
- Barcelona added to DB and scrapers (data ingestion pending)
- Songkick metro IDs being confirmed and added incrementally as cities are onboarded
- CLAUDE.md and PRODUCT.md maintained as living docs for project context

---

## Deferred (V2 / Post-MVP)

| Item | Notes |
|---|---|
| Journey 1 — recommendation mode | "Tell me where to go" — needs strong taste signal, deferred to V2 |
| Multi-city filter in Discover | Journey 2 completion — V2 |
| Map view | Venue pins, Mapbox/Leaflet — V2 |
| Mobile app (React Native / Expo) | API is mobile-ready; app deferred |
| Email ingest pipeline | Museum/gallery newsletters via n8n — manual data for MVP |
| Co-occurrence taste graph | "Users who follow X also follow Y" — needs real user data |
| Affiliate links | Post-MVP |
| London city coverage | Post-MVP |
| Multi-user | Designed for it; building single-user first |
| Test infrastructure (Vitest) | Must be done before second user or unattended scraper crons |
| OAuth nonce (one-time-use) | State param expires after 10 min but is not single-use — add when Redis is available |

---

## Key Technical Decisions

- **Auth abstraction**: Clerk isolated to two files; `AuthUser` type never references Clerk
- **Spotify isolation**: all OAuth + API calls in `api/src/lib/spotify.ts` only
- **`user_id TEXT`** (Clerk string) on all per-user tables — not UUID
- **RLS pattern**: enable RLS, no policies; API uses postgres superuser and is unaffected
- **Scraper priority + enrichment**: canonical event chosen by source rank; missing fields backfilled from duplicates at query time
- **UTC everywhere**: all dates stored as `timestamptz`; bundle windows computed in UTC
- **Geography FK chain**: countries → regions → cities — every new city follows this order via migration, never inline

---

## Stack Reference

| Layer | Choice |
|---|---|
| Frontend | React + TypeScript, Vite, Vercel |
| Backend | Node.js + TypeScript + Fastify |
| Database | PostgreSQL (Supabase) |
| Auth | Clerk |
| Spotify | OAuth 2.0 PKCE, REST API |
| Scrapers | Node cron scripts (RA GraphQL, Songkick LD+JSON, GoOut) |
| Package manager | pnpm |
