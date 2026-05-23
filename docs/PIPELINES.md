# AnyWent — Data Pipelines

## Overview

All ingestion is asynchronous and isolated from the main API. Scrapers write directly to Postgres. The API only reads — it never triggers a scrape inline.

```
[External Sources] → [Scraper Jobs] → [Postgres] → [API] → [Frontend]
```

Pipeline jobs run on cron. Failed jobs log errors and skip — they never crash the main app.

---

## Pipeline 1 — Resident Advisor (GraphQL)

**What it covers**: Club nights, parties, electronic music events
**Cities in scope**: Berlin, Amsterdam, Prague (MVP)
**Frequency**: Every 6 hours
**Source type**: GraphQL endpoint (unofficial but stable — used by community scrapers)

### Flow
1. For each city in scope, query RA GraphQL for events in a rolling 8-week window
2. For each event: upsert into `events`, upsert venue into `venues`, upsert artists into `artists`, upsert lineup into `event_artists`
3. Update `events.verified_at` for events that still appear in results
4. Flag events missing from results for >7 days as potentially cancelled (do not delete)

### Key fields to extract
- Event title, date/time, venue
- Lineup (artist name, headliner/support distinction)
- RA event URL → `events.source_url`
- Ticket URL if present → `events.ticket_url`
- Venue RA slug → used to match/create `venues` record

### Notes
- Cache RA responses in Redis (TTL: 2 hours) — avoid hammering the endpoint
- Log the GraphQL query shape and date in a comment — it changes occasionally
- If RA rate-limits: back off exponentially, alert via log, do not retry immediately
- RA is the most important source — invest in robust error handling here

---

## Pipeline 2 — Songkick

**What it covers**: Concerts, live music, larger touring artists
**Cities in scope**: Berlin, Amsterdam, Prague (MVP)
**Frequency**: Every 12 hours
**Source type**: API (requires key — apply at developers.songkick.com)

### Flow
1. For each city, query Songkick metro area events for next 8 weeks
2. For each event: upsert into `events` with `type = 'concert'`
3. Extract artist(s), map to `artists` table via Songkick artist ID
4. Store Songkick event page URL as `source_url`
5. Update `verified_at` on re-scrape

### Key fields to extract
- Event name, date, venue name + address
- Artist(s) on the bill
- Songkick event URL
- Ticket URL (Songkick often has direct ticket links — affiliate opportunity post-MVP)

### Notes
- Songkick has official API with decent rate limits — be a good citizen, stay within them
- Metro area IDs for MVP cities: Berlin (28443), Amsterdam (31366), Prague (29247) — verify these on first run
- Deduplication: an artist may appear in both RA and Songkick for the same event — match on venue + date + artist name, don't create duplicates

---

## Pipeline 3 — Dice.fm

**What it covers**: Club nights, live music — complements RA, stronger in some cities
**Cities in scope**: Berlin, Amsterdam (Prague coverage is thin)
**Frequency**: Every 12 hours
**Source type**: Reverse-engineered API (undocumented — note this clearly in code comments)

### Flow
Same pattern as RA pipeline — query by city, upsert events/venues/artists.

### Notes
- Document the API shape carefully with date — undocumented APIs change without warning
- If Dice becomes unreliable, it's a supplement not a dependency — degrade gracefully
- Cross-reference with RA to avoid duplicates (same venue + date)

---

## Pipeline 4 — Email Digest (n8n)

**What it covers**: Museum exhibitions, gallery openings, classical music concerts
**Scope**: Any venue that sends a newsletter — not city-limited
**Frequency**: Triggered on email receipt (not cron)
**Source type**: Email newsletters → n8n → LLM extraction → Postgres

### Setup (one-time, manual)
1. Create a dedicated inbox: `events@anywent.com` (or similar)
2. Subscribe this inbox to newsletters from target venues manually
3. n8n watches the inbox for new emails

### n8n Flow
```
New email received
→ Extract: sender, subject, body (plain text preferred over HTML)
→ LLM extraction step (Claude API)
→ Parse structured output
→ Validate output
→ Upsert to Postgres
→ Log result
```

### LLM Extraction Prompt (template)
```
You are extracting event information from a museum or gallery newsletter.

Extract all events mentioned. For each event return a JSON object with:
- title: string
- type: "exhibition" | "opening" | "concert" | "talk" | "other"
- start_date: ISO 8601 date string (date only if no time given)
- end_date: ISO 8601 date string or null (for multi-day exhibitions)
- venue_name: string
- description: string (1-2 sentences max)
- url: string or null (if a URL is mentioned for the event)
- confidence: number 0-1 (how confident you are in this extraction)

Return ONLY a JSON array. No preamble. No markdown.
If no events are found, return an empty array [].
Normalise all dates to the Gregorian calendar.
If the newsletter is not in English, extract and normalise to English.
```

### Validation rules
- Discard any extraction with `confidence < 0.7`
- Discard events with no `start_date`
- Flag events with ambiguous dates ("this spring", "coming soon") for manual review — do not discard
- Log all raw emails and LLM responses for debugging

### Venue matching
- Match extracted `venue_name` against `venues.name` (fuzzy match, normalise case/accents)
- If no match: create a new `venues` record with `active = false` — requires manual review before it appears in the app
- Store `source = 'email'` and `source_url = null` (emails don't have URLs) — store newsletter sender domain instead in `raw_data`

### Notes
- This pipeline handles multilingual input — the LLM handles German, French, Dutch etc. well
- Exhibition `ends_at` is important — store it, use it to keep exhibitions visible for their full run
- The email pipeline is deferred from MVP (manual museum data for now) but design with it in mind
- n8n workflow file should be version-controlled in `/pipelines/n8n/`

---

## Deduplication Strategy (Cross-Source)

Events from multiple sources may describe the same real-world event. Deduplication logic:

1. **Exact match**: same `venue_id` + same `starts_at` (within 30 min tolerance) → merge, keep both `source_url` values
2. **Fuzzy match**: same venue + same date + artist name similarity > 0.85 → flag for review, do not auto-merge
3. **Source priority for display**: RA > Songkick > Dice > email (RA data is most complete for club events)

---

## Data Freshness

| Source | Scrape frequency | Stale threshold | Action on stale |
|---|---|---|---|
| RA | 6 hours | 7 days | Flag as unverified |
| Songkick | 12 hours | 14 days | Flag as unverified |
| Dice | 12 hours | 14 days | Flag as unverified |
| Email | On receipt | 30 days | Flag as unverified |
| Manual | On entry | 60 days | Flag for review |

Flagged events are hidden from query results by default but not deleted. A simple admin view lists them for manual review.

---

## Future Sources (Post-MVP)

- **Bandsintown API** — artist-centric, good for tour announcements
- **Festivalfinder.eu** — festival coverage, likely scrape-only
- **Eventbrite** — catches some exhibition openings and cultural events
- **Venue websites** (per-venue scrapers for major museums) — for venues that don't send newsletters
- **Google Events structured data** — venues that use schema.org markup on their websites
