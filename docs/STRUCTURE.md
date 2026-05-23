# AnyWent — Repo Structure

## Overview

Monorepo with three top-level packages: `api` (Fastify backend), `web` (React frontend), `pipelines` (scrapers + n8n). Shared types live in `packages/shared`. Docs live in `docs/`.

---

```
anywent/
│
├── .env.example                        # All required env vars, no real values
├── .gitignore
├── README.md
├── package.json                        # Root — workspace definition only
├── turbo.json                          # Turborepo config (optional but recommended for monorepo)
│
├── docs/                               # Architecture docs — source of truth
│   ├── CLAUDE.md
│   ├── DATA_MODEL.md
│   ├── PIPELINES.md
│   ├── API_SPEC.md
│   ├── UI_SPEC.md
│   ├── ROADMAP.md
│   ├── TODOS.md
│   ├── STRUCTURE.md                    # This file
│   └── PROJECT_INSTRUCTIONS.md
│
├── packages/
│   └── shared/                         # Shared TypeScript types used by api + web
│       ├── src/
│       │   ├── types/
│       │   │   ├── event.ts            # Event, EventType, EventArtist
│       │   │   ├── venue.ts            # Venue, VenueType
│       │   │   ├── artist.ts           # Artist
│       │   │   ├── geography.ts        # City, Region, Country
│       │   │   ├── user.ts             # User, UserProfile, Affinity
│       │   │   └── index.ts
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
│
├── api/                                # Fastify backend
│   ├── src/
│   │   ├── index.ts                    # Entry point — starts Fastify server
│   │   ├── app.ts                      # App factory — registers plugins, routes
│   │   │
│   │   ├── config/
│   │   │   ├── env.ts                  # Validated env vars (zod schema)
│   │   │   └── constants.ts            # Scrape intervals, affinity weights etc.
│   │   │
│   │   ├── db/
│   │   │   ├── client.ts               # Postgres client (pg or postgres.js)
│   │   │   ├── migrations/             # SQL migration files
│   │   │   │   ├── 001_initial_schema.sql
│   │   │   │   ├── 002_add_scraper_runs.sql
│   │   │   │   └── ...
│   │   │   ├── seeds/
│   │   │   │   ├── geography.ts        # Countries, regions, cities seed
│   │   │   │   └── venues.ts           # Known venues seed
│   │   │   └── queries/                # Typed query helpers (not an ORM — raw SQL)
│   │   │       ├── events.ts
│   │   │       ├── venues.ts
│   │   │       ├── artists.ts
│   │   │       └── users.ts
│   │   │
│   │   ├── routes/                     # One file per resource
│   │   │   ├── health.ts               # GET /health
│   │   │   ├── events.ts               # GET /events, GET /events/bundles, GET /events/:id
│   │   │   ├── cities.ts               # GET /cities, GET /cities/:slug/events
│   │   │   ├── regions.ts              # GET /regions
│   │   │   ├── venues.ts               # GET /venues, GET /venues/:id
│   │   │   ├── artists.ts              # GET /artists, GET /artists/:id
│   │   │   ├── me/
│   │   │   │   ├── profile.ts          # GET /me/profile
│   │   │   │   ├── artists.ts          # POST/DELETE /me/artists
│   │   │   │   ├── venues.ts           # POST/DELETE /me/venues
│   │   │   │   ├── attendance.ts       # GET/POST /me/attendance
│   │   │   │   ├── saved.ts            # GET/POST/DELETE /me/saved
│   │   │   │   └── connect/
│   │   │   │       └── spotify.ts      # POST /me/connect/spotify
│   │   │   └── index.ts                # Registers all routes
│   │   │
│   │   ├── middleware/
│   │   │   ├── auth.ts                 # Clerk JWT verification
│   │   │   └── errorHandler.ts         # Global error handler
│   │   │
│   │   ├── services/                   # Business logic, separate from routes
│   │   │   ├── bundleRanking.ts        # Discovery mode bundle scoring algorithm
│   │   │   ├── affinityScoring.ts      # Per-event affinity score for a user
│   │   │   ├── deduplication.ts        # Cross-source event deduplication
│   │   │   └── spotify.ts              # Spotify API client + sync logic
│   │   │
│   │   └── lib/
│   │       ├── redis.ts                # Redis client (add when needed)
│   │       ├── sentry.ts               # Sentry init
│   │       └── logger.ts               # Structured logger (pino)
│   │
│   ├── jobs/                           # Scraper + cron jobs — isolated from API
│   │   ├── runner.ts                   # Job runner / scheduler
│   │   ├── scrapers/
│   │   │   ├── ra.ts                   # Resident Advisor GraphQL scraper
│   │   │   ├── songkick.ts             # Songkick API scraper
│   │   │   └── dice.ts                 # Dice.fm scraper (v2)
│   │   ├── sync/
│   │   │   └── spotify.ts              # Per-user Spotify sync job
│   │   └── maintenance/
│   │       ├── flagStaleEvents.ts      # Daily stale event check
│   │       └── updateAffinity.ts       # Co-occurrence affinity update (v2)
│   │
│   ├── tests/
│   │   ├── unit/
│   │   │   ├── bundleRanking.test.ts
│   │   │   ├── affinityScoring.test.ts
│   │   │   ├── deduplication.test.ts
│   │   │   ├── dates.test.ts
│   │   │   └── scrapers/
│   │   │       ├── ra.parser.test.ts
│   │   │       └── songkick.parser.test.ts
│   │   └── integration/
│   │       ├── ra.smoke.test.ts
│   │       └── songkick.smoke.test.ts
│   │
│   ├── package.json
│   └── tsconfig.json
│
├── web/                                # React + TypeScript frontend (Vite)
│   ├── src/
│   │   ├── main.tsx                    # Entry point
│   │   ├── App.tsx                     # Router root
│   │   │
│   │   ├── pages/
│   │   │   ├── Home.tsx                # Query screen — discovery + city mode
│   │   │   ├── CityWeekend.tsx         # Bundle drill-down
│   │   │   ├── EventDetail.tsx
│   │   │   ├── ArtistDetail.tsx        # v2
│   │   │   ├── VenueDetail.tsx         # v2
│   │   │   ├── Saved.tsx               # v2
│   │   │   └── Profile.tsx             # v2
│   │   │
│   │   ├── components/
│   │   │   ├── BundleCard.tsx          # City/weekend bundle card
│   │   │   ├── EventCard.tsx           # Compact event card
│   │   │   ├── EventCardFull.tsx       # Full event card with lineup
│   │   │   ├── AffinityBadge.tsx       # High / Medium / Low indicator
│   │   │   ├── SourceAttribution.tsx   # "Via RA" link — always present
│   │   │   ├── QueryBar.tsx            # Main query input + mode toggle
│   │   │   ├── DateRangePicker.tsx
│   │   │   ├── CitySelector.tsx
│   │   │   └── layout/
│   │   │       ├── Nav.tsx
│   │   │       ├── Footer.tsx          # Includes version number
│   │   │       └── PageShell.tsx
│   │   │
│   │   ├── hooks/
│   │   │   ├── useEvents.ts
│   │   │   ├── useBundles.ts
│   │   │   └── useProfile.ts
│   │   │
│   │   ├── lib/
│   │   │   ├── api.ts                  # API client (typed fetch wrapper)
│   │   │   ├── sentry.ts               # Sentry init (frontend)
│   │   │   └── dates.ts                # Date formatting helpers
│   │   │
│   │   ├── types/                      # Re-exports from packages/shared
│   │   │   └── index.ts
│   │   │
│   │   └── styles/
│   │       └── global.css
│   │
│   ├── tests/
│   │   └── e2e/
│   │       └── criticalPath.spec.ts    # Playwright: query → bundle → event → source link
│   │
│   ├── index.html
│   ├── vite.config.ts
│   ├── package.json
│   └── tsconfig.json
│
└── pipelines/
    └── n8n/
        ├── README.md                   # How to import + run the workflow
        └── email-ingest.workflow.json  # Exported n8n workflow (version controlled)
```

---

## Key Decisions in This Structure

**Monorepo** — `api/`, `web/`, `packages/shared/` live together. Shared TypeScript types (Event, Venue, Artist etc.) are defined once in `packages/shared` and imported by both. No duplicated type definitions, no drift between frontend and backend shapes.

**`packages/shared`** — the glue layer. If an Event has a `type` field, it's defined here exactly once. Both the API response and the React component reference the same type.

**`api/services/` vs `api/routes/`** — routes handle HTTP concerns (parsing request, returning response). Services contain actual logic (ranking, scoring, deduplication). Keeps routes thin and logic testable.

**`api/jobs/` is separate from `api/src/`** — scrapers are not part of the web server. They can be run independently (`node jobs/scrapers/ra.ts`), deployed separately, or moved to a different host entirely without touching the API.

**`api/db/queries/`** — raw typed SQL helpers, not an ORM. Keeps queries readable and debuggable. No magic.

**`web/components/SourceAttribution.tsx`** — a dedicated component for "Via RA / Via Songkick" to ensure it's never accidentally omitted. Used in EventCard and EventCardFull.

**`web/tests/e2e/`** — Playwright lives in the web package since it tests the full browser experience.

**`pipelines/n8n/`** — the n8n workflow JSON is version-controlled here. Exported from n8n, committed, importable into any n8n instance.
