# AnyWent — Roadmap

## Philosophy

Build the smallest thing that is genuinely useful to one person (the builder).
Validate it works. Then layer in complexity.

---

## MVP — "Does it work for me?"

Goal: a single-user web app that answers "what's on in Berlin next weekend" and "where should I go in the next month" using real data.

### In scope
- [ ] Postgres schema (full — design for the future even if MVP doesn't use all of it)
- [ ] RA scraper (Berlin, Amsterdam, Prague)
- [ ] Songkick scraper (Berlin, Amsterdam, Prague)
- [ ] Manual venue + event seeding for museums (no email pipeline yet)
- [ ] Basic taste profile: manually add artists you like
- [ ] City mode query: city + date range → ranked event list
- [ ] Discovery mode query: date range → ranked city/weekend bundles
- [ ] Home screen with bundle cards
- [ ] City weekend view
- [ ] Event detail view
- [ ] Single user (no auth UI needed — hardcode user or use Clerk with one account)
- [ ] Source attribution on every event
- [ ] Build versioning (semantic version in package.json, visible in app footer + /health endpoint)
- [ ] `/health` endpoint (version + DB status + last scraper run per source)
- [ ] `scraper_runs` table (source, started_at, finished_at, events_upserted, errors)
- [ ] `.env.example` file committed to repo
- [ ] Sentry error monitoring (free tier — install from day one)
- [ ] Unit tests for ranking algorithm, affinity weights, date handling, scraper parsers
- [ ] Deployed (Vercel + Railway + Supabase)

### Explicitly out of scope for MVP
- Spotify connect
- Email ingest pipeline
- Multi-user / auth flow
- Attendance logging
- Affinity co-occurrence model
- Map view
- Mobile app
- Affiliate links
- Dice.fm scraper (nice to have, not required)
- Saved events
- Notifications

---

## V2 — "Would I show this to someone else?"

- [ ] PWA service worker + version-based cache busting (forces refresh on deploy)
- [ ] Integration tests — smoke test per scraper (validates output shape against real API)
- [ ] E2E test — critical path: query → bundle results → event detail → source link (Playwright)
- [ ] Schema migration tests (up + down for every migration)
- [ ] Multi-user auth (Clerk, full onboarding flow)
- [ ] Spotify connect (taste enrichment — followed artists + top artists)
- [ ] Attendance logging (log events you've been to)
- [ ] Email ingest pipeline (n8n + LLM extraction for museum newsletters)
- [ ] Dice.fm scraper
- [ ] Saved / bookmarked events
- [ ] Artist pages
- [ ] Venue pages
- [ ] Region-level queries (e.g. "Oberösterreich")
- [ ] Paris + Vienna + London city coverage

---

## V3 — "Could this be a real product?"

- [ ] Affinity co-occurrence model (attended event → update artist weights)
- [ ] Venue affinity tracking
- [ ] Map view
- [ ] "You're going anyway — want to extend?" nudge
- [ ] Affiliate link integration (Songkick, Dice)
- [ ] React Native / Expo mobile app
- [ ] Push notifications ("Tame Impala just announced Berlin")
- [ ] Bandsintown API integration
- [ ] Premium tier / subscription
- [ ] Promoter/venue listing tier

---

## Future / Speculative

- Apple Music / YouTube Music connect (same pattern as Spotify)
- Festival coverage (Festivalfinder, manual)
- Per-venue scrapers for major museums without newsletters
- "Friends are going" social layer
- Data partnerships with labels / booking agents

---

## Decision Log

| Date | Decision | Rationale |
|---|---|---|
| 2026 | Start with Berlin, Amsterdam, Prague | Cities builder travels to; can manually verify data quality |
| 2026 | Node/TypeScript backend | Async-friendly, ecosystem, mobile API reuse |
| 2026 | Clerk for auth | Handles OAuth complexity; Spotify connect is enrichment not login |
| 2026 | n8n for email pipeline | Builder has existing experience |
| 2026 | Geography hierarchy (country → region → city) | Cheap to design in now, painful to retrofit; enables festival + small city coverage |
| 2026 | Global event data, per-user taste | Clean separation; multi-user ready from day one |
| 2026 | Always store source_url | Good citizen principle; never hide where data came from |
| 2026 | n8n self-hosted on Oracle Cloud free tier | Always-free ARM VM, always-on, no cold starts, no cost |
| 2026 | Redis deferred from MVP | Postgres timestamp checks sufficient at MVP scale; add Redis when scraper volume justifies it |
| 2026 | Semantic versioning from day one | Know what's deployed during testing; foundation for PWA cache busting in v2 |
