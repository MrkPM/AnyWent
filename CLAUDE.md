# AnyWent — Project Context for Claude Code

## What Is This

AnyWent (anywent.com) is a personal culture aggregator and trip-planning tool. It pulls event data from multiple sources — club nights, concerts, museum exhibitions, gallery openings — and surfaces them as ranked "bundles" by city and weekend. The core use case: a culturally omnivorous, travel-flexible person wants to know where the best weekends are in Europe, or what's on in a specific city on a specific date.

It is not a competitor to RA or Songkick. It is a conduit — aggregating, personalising, and linking back to original sources. All event links point to the original posting. Affiliate links are used for ticketed events where programs exist.

---

## North Star

> "I can go somewhere in Europe next weekend. Where should I go, and what should I do when I get there?"

Two query modes:
- **Discovery mode**: "Show me the best weekends across Europe in the next 4 weeks" → ranked city/weekend bundles
- **City mode**: "What's on in Berlin the weekend after next" → fixed city, filtered and ranked by taste

---

## Current Status

Brainstorm and architecture phase complete. Moving into build.

---

## Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | React + TypeScript | Web-first, React Native / Expo for mobile later |
| Backend | Node.js + TypeScript + Fastify | Clean REST API, mobile-friendly from day one |
| Database | PostgreSQL (Supabase) | Managed, generous free tier |
| Cache | Redis | Scraper rate limiting, caching |
| Auth | Clerk | Handles email/password + social login (Google etc.) |
| Email pipeline | n8n | Museum/gallery newsletter ingestion |
| Scraper jobs | Cron scripts (Node) | RA, Songkick, Dice — separate from main app |
| Frontend hosting | Vercel | |
| Backend hosting | Railway or Render | |
| Maps | Mapbox or Leaflet | Map view, venue pins |

---

## What AnyWent Is NOT (Yet)

Do not build these in MVP. Flag them and defer:
- Mobile app (design for it, don't build it yet)
- Email ingest pipeline (manual museum data for MVP)
- Affinity / co-occurrence taste graph (v2)
- Map view (v2)
- Multi-user (design for it, build single-user first)
- Affiliate link integration (post-MVP)
- Paris, Vienna, London city coverage (post-MVP)

---

## Coding Conventions

- TypeScript everywhere, strict mode
- All dates in UTC, stored as timestamptz in Postgres
- All event links stored as original source URLs — never strip or modify
- Scraper jobs are isolated processes — they write to DB, never called inline by the API
- Per-user data is always scoped by `user_id` — never leak between users
- Environment variables for all API keys, never hardcoded
- Comment any scraper logic that reverse-engineers an undocumented API — note the source and date

---

## Key Principles

1. **Good citizen scraping**: reasonable crawl intervals, aggressive caching, always link originals
2. **Global data, personal view**: event/venue/artist data is shared infrastructure; taste and preferences are per-user
3. **Mobile-ready API**: stateless, token auth, no SSR assumptions
4. **Geography hierarchy**: every venue has lat/long + city + region + country — queries work at any level
5. **Defer complexity**: when in doubt, build the simpler version and note what was deferred

---

## Infrastructure

| Service | Provider | Notes |
|---|---|---|
| Postgres | Supabase free tier | Pauses after 1 week inactivity — keep it active during dev |
| Frontend hosting | Vercel free tier | Unlimited personal projects, preview deployments on push |
| Backend hosting | Railway / Render free tier | Run locally during dev; deploy to cloud for shared testing |
| Auth | Clerk free tier | Up to 10,000 MAU — no real constraint for a long time |
| Redis | Upstash free tier | 10,000 commands/day; add when needed, not day one |
| n8n (email pipeline) | Self-hosted on Oracle Cloud free tier | Always-free ARM VM (up to 4 cores / 24GB RAM); n8n runs via Docker; always-on, no cold starts |

**Local dev**: run Postgres + Redis via Docker (`docker-compose.yml`). No cloud services needed to build and test locally.

**Redis is optional for MVP** — can be deferred and replaced with simple Postgres timestamp checks for scraper rate limiting. Add when scraper volume justifies it.

---

## Testing

Test the things where a bug would be silent and painful. Don't chase coverage.

**Unit test** (MVP):
- Bundle ranking algorithm — wrong scores would never be obvious
- Affinity weight calculations
- Date/timezone handling — UTC bugs are hard to spot
- Scraper data parsers — catches API shape changes before they corrupt data

**Integration tests** (v2):
- One smoke test per scraper — runs against real API, validates output shape

**E2E** (v2):
- Critical path only: query → bundle results → event detail → source link present
- Use Playwright

**Migrations**:
- Every migration must have a reversible `down` path — test both directions

---

## Error Monitoring

Sentry — free tier, install from day one. One line of setup, full stacktraces from production. Don't wait until something breaks to add it.

---



AnyWent uses semantic versioning: `major.minor.patch` (e.g. `v0.3.1`).

- Version lives in `package.json` and is surfaced in the app (footer or `/health` endpoint)
- Bump version on every meaningful deploy — makes it easy to know what's running during testing
- When PWA / service worker is added (v2+): version is used for cache busting — service worker checks version on load and forces refresh if stale
- For MVP (regular web app, no service worker): versioning is informational only

---

## People

Built by M. Single developer. Pragmatic > perfect.
