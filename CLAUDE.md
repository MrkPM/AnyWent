# AnyWent — Project Context for Claude Code

## What Is This

AnyWent (anywent.com) is a personal culture aggregator and trip-planning tool. It pulls event data from multiple sources — club nights, concerts, museum exhibitions, gallery openings — and surfaces them as ranked "bundles" by city and weekend. The core use case: a culturally omnivorous, travel-flexible person wants to know where the best weekends are in Europe, or what's on in a specific city on a specific date.

It is not a competitor to RA or Songkick. It is a conduit — aggregating, personalising, and linking back to original sources. All event links point to the original posting. Affiliate links are used for ticketed events where programs exist.

---

## North Star

> "I can go somewhere in Europe next weekend. Where should I go, and what should I do when I get there?"

---

## Three User Journeys

These are the three query modes the product is built around. Each is a distinct mental model and UI pattern. All three will eventually be reflected in the nav.

---

### Journey 1 — Recommendation: "Just entertain me"
> **Output: a city + date range recommendation.** The app decides for you.

User intent: flexible, no constraints, wants the best option surfaced without having to browse. The app answers with a specific recommendation: *"Go to Berlin, 13–17 Jun — 7 artists you follow are playing, best window in 6 weeks."*

The most differentiated journey — nothing else does this. Requires strong taste signal to be trustworthy (Spotify import). **V2.**

---

### Journey 2 — Calendar: "Show me what's on when and where"
> **Output: a browsable agenda across cities, ranked by taste.**

User intent: wants to see the landscape — what's happening across cities and when — and make their own decision. Time is the primary axis. Cities are filterable (multi-select). Taste score ranks cities within each time window.

Partially built — the `/discover` screen is the foundation. Multi-city filter is **V2.**

---

### Journey 3 — City: "I'm going to Berlin, what's on?"
> **Output: a ranked event list for a fixed city + date range.**

User intent: the city (and often the dates) are already decided — they just want to know what's on and how much they'll like it. Single city, specific date range, events ranked by taste score.

Already built at `/` (city mode). The most familiar query pattern — closest to RA/Songkick but personalised.

---

### Key distinctions

| | Journey 1 | Journey 2 | Journey 3 |
|---|---|---|---|
| City | Chosen by app | User browses / filters | Fixed by user |
| Dates | Chosen by app | User browses | Fixed by user |
| Output | One recommendation | Browsable agenda | Event list |
| Constraint | None | None (optional city filter) | City + dates locked |
| Status | V2 | In progress | Built |

---

## Current Status

MVP feature-complete. Discovery UI (Journey 2 foundation) shipped.

**City coverage (June 2026):** 19 cities live — Amsterdam, Barcelona, Berlin, Dresden, Florence, Ibiza, Lisbon, Lyon, Mallorca, Marseille, Milan, Munich, Nice, Paris, Porto, Prague, Rome, The Hague, Vienna. London deferred (post-MVP).

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

## Before Adding a Second User / Automating Scrapers

These must be done before the app handles more than one real user or before scraper crons run unattended:

- **Test infrastructure** — wire up Vitest to `api` and `web` packages; add `test` scripts to each `package.json`
- **Initial test coverage** — unit tests for: date/window logic (`upcomingWeekend`, `upcomingClusters`), affinity scoring, deduplication source priority, scraper data parsers
- **Nonce one-time-use** — OAuth state currently expires after 10 min (timestamp check) but is not single-use; add nonce persistence when Redis is available

---

## What AnyWent Is NOT (Yet)

Do not build these in MVP. Flag them and defer:
- Mobile app (design for it, don't build it yet)
- Email ingest pipeline (manual museum data for MVP)
- Affinity / co-occurrence taste graph (v2)
- Map view (v2)
- Multi-user (design for it, build single-user first)
- Affiliate link integration (post-MVP)
- London city coverage (post-MVP)

---

## Coding Conventions

- **Package manager**: pnpm — always use `pnpm install`, `pnpm add`, `pnpm run`. Never npm or yarn.
- TypeScript everywhere, strict mode
- All dates in UTC, stored as timestamptz in Postgres
- All event links stored as original source URLs — never strip or modify
- Scraper jobs are isolated processes — they write to DB, never called inline by the API
- Per-user data is always scoped by `user_id` — never leak between users
- Environment variables for all API keys, never hardcoded
- Comment any scraper logic that reverse-engineers an undocumented API — note the source and date

---

## Database / Migrations

Migration files live in `api/src/db/migrations/`. Every applied migration is recorded in the `schema_migrations` table (filename + applied_at timestamp).

**Commands:**

```bash
# Apply a migration
pnpm --filter @anywent/api migrate src/db/migrations/020_foo.up.sql

# Roll back a migration
pnpm --filter @anywent/api migrate src/db/migrations/020_foo.down.sql

# Check for drift — exits 1 if any .up.sql files are not in schema_migrations
pnpm --filter @anywent/api migrate:status
```

`migrate:status` is the post-resume check — run it after every Supabase free-tier pause/resume to catch unapplied migrations immediately.

`migrate.ts` records every applied migration automatically — no need to add an INSERT to each SQL file.

**Pre-deploy:** `migrate:status` must exit 0 before deploying to Vercel/Railway. Wire it as a pre-deploy step once hosting is configured — exit code 1 blocks deploy if migrations are unapplied.

---

## Adding a New City

Every new city must be set up in this exact order (FK chain: countries → regions → cities):

1. **Country** — insert into `countries (name, code)` if not already present (ISO 3166-1 alpha-2 code)
2. **Region** — insert into `regions (name, slug, country_id)`
3. **City** — insert into `cities (name, slug, region_id, lat, lng, ...)`
4. **Scraper** — add the city to the relevant scraper configs (RA area ID, Songkick metro ID, GoOut locality, etc.)
   - **RA area IDs**: look up in `data/ra-cities.tsv` — it contains the full global RA city list with area IDs and Songkick counterparts where known. Confirm the ID before adding.
   - **Songkick metro IDs**: added incrementally as cities are onboarded (not all at once). Confirm via `https://www.songkick.com/metro-areas/{id}-{slug}` and note the date in the scraper comment.
5. **Source constraint** — if adding a new scraper source for this city, add it to the `source` CHECK constraint in a new migration before writing any data

Deletions must go in reverse order. Always use a migration file — never insert city geography directly in the scraper.

---

## Scraper Conventions

Every new scraper must be evaluated against the multi-source enrichment system before merging:

1. **Priority rank** — assign a priority in the `CASE source WHEN ...` block in `api/src/db/queries/events.ts`. Current order: RA (1) > Dice (2) > Songkick (3) > others (4). Lower number = canonical source when duplicates exist.
2. **Field coverage** — document which fields this source reliably populates vs. leaves null (`ticket_url`, `image_url`, precise `starts_at`, `time_known`). Fields from lower-priority duplicates are automatically enriched onto the canonical event at query time.
3. **Schema constraint** — if the source name is new, add it to the `source` CHECK constraint in a new migration before writing any data.
4. **Badge label** — add the source to `SOURCE_LABELS` in `web/src/components/EventCard.tsx` so its badge renders correctly.
5. **Image rule** — capture `image_url` from day one (see `rule_event_images.md` in memory). Never retrofit.

The enrichment logic lives entirely in `getEventsByCity` in `api/src/db/queries/events.ts` — no scraper changes are needed to participate in deduplication and enrichment.

---

## Git Workflow

- **Branch strategy**: commit directly to `main` for now — no feature branches until the team grows or a reason emerges
- **Commit message format**: conventional commits — `feat:`, `fix:`, `chore:`, `docs:`, `refactor:` prefixes
  - `feat: add RA scraper for Berlin`
  - `fix: correct UTC offset in bundle ranking`
  - `chore: bump version to 0.2.0`
- **Version bumps**: always a separate `chore:` commit

---

## When to Proceed vs Ask

- **Proceed without asking**: anything within the agreed structure, adding files in the right folders, installing packages, writing tests, following patterns already established in the codebase
- **Ask before proceeding**: creating files outside the agreed structure, changing the data model, adding a new third-party dependency, anything destructive or irreversible
- **Never proceed silently**: if something conflicts with these docs, flag it and ask — don't silently do it a different way

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



## Versioning

AnyWent uses semantic versioning: `major.minor.patch` (e.g. `v0.3.1`).

- Version lives in `package.json` and is surfaced in the app (footer or `/health` endpoint)
- Bump version on every meaningful deploy — makes it easy to know what's running during testing
- When PWA / service worker is added (v2+): version is used for cache busting — service worker checks version on load and forces refresh if stale
- For MVP (regular web app, no service worker): versioning is informational only

---

## Auth Abstraction

Clerk is the current auth provider but must never bleed into application code. This keeps the provider swappable with minimal effort later.

**Rules — strictly enforced:**
- Clerk imports appear in exactly **two files** and nowhere else:
  - `api/src/middleware/auth.ts` — all Clerk verification logic
  - `web/src/hooks/useAuth.ts` — all Clerk React hooks
- No route, service, or component ever imports from `@clerk/fastify` or `@clerk/react` directly
- Both files translate Clerk's data into AnyWent's own `AuthUser` type before passing it anywhere

**Backend**
```typescript
// api/src/middleware/auth.ts — only file that imports Clerk
export async function authenticate(request, reply) {
  // Clerk verification here
  request.user = { id: user.sub, email: user.email } // AnyWent's shape, not Clerk's
}
```

**Frontend**
```typescript
// web/src/hooks/useAuth.ts — only file that imports Clerk
export function useCurrentUser(): AuthUser {
  // translate Clerk's user into AnyWent's AuthUser shape
  return { id: user.id, email: user.email }
}
```

**Shared type**
```typescript
// packages/shared/src/types/user.ts
export interface AuthUser {
  id: string
  email: string
}
```

`AuthUser` never references Clerk. Swapping providers means rewriting `auth.ts` and `useAuth.ts` only.

---

## M's Engineering Principles

These principles apply to this project and all future projects. They are the result of hard-won lessons and deliberate choices. Claude Code must follow them unless M explicitly overrides one.

---

### 1. Versioning — from day one, always

- Semantic versioning (`major.minor.patch`) in `package.json` from the first commit
- Version visible in the running app — footer and/or `/health` endpoint
- Bump on every meaningful deploy — so you always know what's running during testing
- Enables PWA cache busting when service workers are added later
- Never start a project without this — retrofitting is painful

---

### 2. Testing — selective, not exhaustive

- Don't chase coverage. Test the things where a bug would be **silent and painful**
- **Unit test**: ranking/scoring algorithms, date/timezone handling, data parsers — things that can be wrong without throwing an error
- **Integration test**: one smoke test per external integration (scraper, API client) — catches upstream changes
- **E2E**: critical user path only (the thing that must always work) — use Playwright
- **Migrations**: every migration must have a reversible `down` path
- Start unit tests at MVP. Integration + E2E can wait for v2.

---

### 3. Vendor lock-in mitigation — abstraction layers

Any third-party provider (auth, payments, email, maps, AI) must be wrapped in an abstraction layer so it can be swapped with minimal impact.

**The pattern:**
- Provider-specific code lives in **exactly one file** (e.g. `auth.ts`, `payments.ts`)
- That file translates the provider's data into the app's own types before passing it anywhere
- No other file ever imports the provider's SDK directly
- The app's internal types (e.g. `AuthUser`, `PaymentResult`) never reference the provider

**Applied in AnyWent:**
- Clerk → `api/src/middleware/auth.ts` + `web/src/hooks/useAuth.ts` only
- Spotify → `api/src/lib/spotify.ts` only (OAuth, token exchange/refresh, API calls)
- Any future provider (maps, payments, AI) follows the same pattern

---

### 4. Cost-minimising stack — free tiers first

Start with services that are genuinely free (not trial free), scale only when justified by real usage.

**Proven free tier stack:**
| Need | Provider | Notes |
|---|---|---|
| Database | Supabase | Full Postgres, free tier generous |
| Frontend hosting | Vercel | Unlimited personal projects |
| Backend hosting | Railway / Render | Free tier sufficient for early prod |
| Auth | Clerk | Free up to 10,000 MAU |
| Cache / queues | Upstash | Serverless Redis, free tier |
| Always-on jobs | Oracle Cloud free tier | ARM VM, genuinely permanent free |
| Error monitoring | Sentry | Free tier, install from day one |
| Email pipeline | n8n self-hosted | Free on Oracle VM |

**Rules:**
- Never pay for something until free tier is genuinely exhausted
- Prefer services with a clear, predictable upgrade path
- Self-host where it's low-maintenance and free (n8n on Oracle)
- Redis and similar caching layers: defer until scraper/request volume actually justifies them

---

### 5. Environment variable discipline

- All secrets in `.env` — never hardcoded, never committed
- `.env.example` always committed alongside — lists every variable with empty values
- New variable added to code = must be added to `.env.example` in the same commit
- `.env` always in `.gitignore` — verify before first push to any new repo

---

### 6. Schema-first thinking

- Design the data model before writing any application code
- Build for the future shape even if MVP only uses part of it — cheap now, expensive to retrofit
- Every migration has a reversible `down` path
- Shared types defined once in `packages/shared` — never duplicated between frontend and backend

---

### 7. Isolate async processes

- Background jobs (scrapers, sync tasks, email processing) are isolated processes — never called inline by the API
- Jobs write to DB only — the API only reads
- A failing job never crashes the main app — log, skip, alert
- Job runs are logged to a `scraper_runs` table (or equivalent) — always know when something last ran successfully

---

### 8. Good citizen API usage

- Respect rate limits of every external API — stay well within them
- Cache aggressively — don't fetch what you already have
- Always link back to original sources — never present scraped content as your own
- Document any reverse-engineered API usage with date and source in code comments — these change without warning

---

### 9. Package manager — pnpm, always consistent

- Use pnpm across all projects — faster, more disk-efficient, better for monorepos
- Never mix package managers within a project (`pnpm install` only, no npm or yarn)
- Commit `pnpm-lock.yaml` — never `.gitignore` it

---

### 10. Git workflow — simple and readable

- **Solo projects**: commit directly to `main` — no feature branches until there's a real reason
- **Commit format**: conventional commits — `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`
- Version bumps always a separate `chore: bump version to x.x.x` commit
- Keeps git log readable and pairs naturally with semantic versioning

---

### 11. Claude Code autonomy — proceed vs ask

- **Proceed without asking**: files in agreed structure, installing packages, writing tests, following established patterns
- **Ask before proceeding**: new files outside agreed structure, data model changes, new third-party dependencies, anything destructive or irreversible
- **Never silently deviate**: if something conflicts with the docs, flag it and ask — don't quietly do it differently

---

*This list grows with every project. When a new principle is learned, add it here.*

---

## Agreed Decisions

Design and product decisions that are settled — don't re-open unless M explicitly revisits them.

### Ranking weight model

Affinity scoring is additive across three signal types:

| Signal | Weight |
|---|---|
| Artist follow (manual) | 1.0 |
| Venue follow | 0.6 |
| Genre / style follow | 0.4 |
| Baseline (no match) | 0.1 |

An event's score = sum of matched weights across all three types. Events with no matches score 0.1 and stay visible but rank last within their date group.

These weights are the MVP starting point — intentionally simple. The schema (`weight NUMERIC(3,2)`, `source` column) is designed to support more nuance later: variable weights by source confidence (Spotify saved track vs top artist vs manual follow), recency decay, interaction signals (clicks, ticket link taps), and per-user calibration.

**Co-occurrence recommendations** (e.g. "users who follow X also follow Y") are deferred to v2. They require real user data to be meaningful — don't build until that data exists.

---

### Schema: user_id is TEXT (Clerk string), not UUID

All per-user tables use `user_id TEXT` — the raw Clerk user ID (e.g. `user_2Nz...`). Do not use UUID for user_id in new tables.

`user_connected_accounts` in migration 001 was designed before this was settled — it has `user_id UUID REFERENCES users(id)` and is **never populated**. It is dead schema. For Spotify OAuth tokens we created `spotify_connections` (migration 013) with `user_id TEXT`. Any future per-user tables follow this TEXT pattern.

---

### Supabase RLS on user tables

All per-user tables must have Row Level Security enabled. The pattern:

```sql
ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;
-- No policies needed.
```

No policies are added because our API connects as the postgres superuser (via `postgres.js` direct connection), which has `BYPASSRLS` and ignores all RLS policies. We use Clerk, not Supabase Auth, so `auth.uid()` is not applicable.

The effect: PostgREST (the Supabase REST layer) is completely blocked from accessing these tables — which is what we want. The API is the only entry point.

Tables with RLS confirmed: all tables from migration 012 sweep + `spotify_connections` (migration 017).

---

## People

Built by M. Single developer. Pragmatic > perfect.