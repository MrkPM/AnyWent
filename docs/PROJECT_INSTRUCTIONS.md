# AnyWent — Instructions for Claude Code

## How to Use These Docs

This folder contains the full architecture and specification for AnyWent. Before starting any task, read the relevant doc(s). Don't rely on memory or assumptions — the specs are the source of truth.

| Doc | Read when... |
|---|---|
| `CLAUDE.md` | Starting any session — always |
| `DATA_MODEL.md` | Working on schema, migrations, queries |
| `PIPELINES.md` | Working on scrapers or the email ingest pipeline |
| `API_SPEC.md` | Working on backend endpoints |
| `UI_SPEC.md` | Working on frontend screens or components |
| `ROADMAP.md` | Unsure whether a feature is in scope |
| `TODOS.md` | Looking for what to build next |

---

## Project Setup (First Session)

Do these in order:

1. Initialise a Node.js + TypeScript monorepo (or separate `api/` and `web/` folders)
2. Set up Supabase project, connect Postgres
3. Generate and run migrations from `DATA_MODEL.md`
4. Set up Fastify backend with Clerk auth middleware
5. Set up React + TypeScript frontend (Vite)
6. Verify the DB connection end-to-end with a single health check endpoint

---

## Suggested Build Order

### Phase 1 — Foundation
1. Postgres migrations (full schema from DATA_MODEL.md — even tables not used in MVP)
2. Seed script: Berlin, Amsterdam, Prague cities + regions + countries
3. Basic Fastify API skeleton with Clerk JWT middleware
4. `GET /events` endpoint (no affinity scoring yet — just raw query)
5. `GET /events/bundles` endpoint (no affinity scoring yet — sort by event count)

### Phase 2 — Data
6. RA scraper (see PIPELINES.md) — Berlin first, then Amsterdam, Prague
7. Songkick scraper — same cities
8. Verify data in DB looks correct, deduplication works
9. Manual seed: 5-10 museum events per city as placeholder

### Phase 3 — Frontend
10. Home screen with query bar (city mode first — simpler)
11. City weekend view (list of events, grouped by type)
12. Event detail view
13. Bundle view (discovery mode)

### Phase 4 — Taste
14. Manual artist follow (add/remove)
15. Affinity scoring on `GET /events` and `GET /events/bundles`
16. Affinity badge on event cards

---

## Key Rules (Never Break These)

- **Always store `source_url`** — every event must have the original source URL, visible in the UI
- **Scrapers are isolated** — they write to DB only, never called inline by the API
- **Per-user data is always scoped by `user_id`** — never leak between users
- **Defer what's deferred** — if something is marked v2 in ROADMAP.md, don't build it now. Note it with a `// TODO(v2):` comment if relevant
- **TypeScript strict mode** — no `any` unless absolutely unavoidable
- **Dates in UTC** — always `timestamptz` in Postgres, always ISO 8601 in API responses
- **No API keys in code** — environment variables only

---

## Environment Variables Needed

```
# Database
DATABASE_URL=

# Clerk (auth)
CLERK_SECRET_KEY=
CLERK_PUBLISHABLE_KEY=

# Songkick
SONGKICK_API_KEY=

# Spotify (when building connect feature)
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=

# Redis
REDIS_URL=

# Optional
MAPBOX_TOKEN=          # when building map view
ANTHROPIC_API_KEY=     # for email pipeline LLM extraction
```

---

## Repo Structure

See `STRUCTURE.md` for the full annotated file and folder structure.

---

## When You're Unsure

- **Is this in scope?** → Check ROADMAP.md MVP list
- **What should this table look like?** → Check DATA_MODEL.md
- **What should this endpoint return?** → Check API_SPEC.md
- **How should this screen behave?** → Check UI_SPEC.md
- **How should this scraper work?** → Check PIPELINES.md
- **Still unsure?** → Build the simpler version and leave a `// TODO:` comment explaining the tradeoff
