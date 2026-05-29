// GoOut scraper — concerts and exhibitions for Prague (and other CZ/SK cities)
// Endpoint: https://goout.net/services/feeder/v1/events.json (reverse-engineered 2026-05)
// API reference: https://github.com/strohel/goout-calendar/blob/master/apiary.apib
// Locality enums confirmed via: /services/feeder/v1/entities/localities.json?language=en

import postgres from 'postgres'
import { env } from '../../src/config/env.js'

const sql = postgres({
  host: env.DB_HOST,
  port: env.DB_PORT,
  database: env.DB_NAME,
  username: env.DB_USER,
  password: env.DB_PASSWORD,
  ssl: 'require',
  prepare: false,
})

// -------------------------
// Constants
// -------------------------

const GOOUT_API_URL = 'https://goout.net/services/feeder/v1/events.json'
const PAGE_SIZE = 50
const DELAY_MS = 1500

// starts_at before this year = GoOut placeholder date → clamp to scrape window start
const SENTINEL_YEAR_START = 2020
// ends_at from this year onwards = GoOut 2038 sentinel → store as null (unknown end)
const SENTINEL_YEAR_END = 2030

export const GOOUT_LOCALITIES: Record<string, { enum: string; citySlug: string }> = {
  prague: { enum: 'CZ_PRAGUE', citySlug: 'prague' },
}

// GoOut performer mainCategory enums that indicate a music/concert event
const MUSIC_CATEGORY_ENUMS = new Set([
  'BANDS', 'SINGER_SONGWRITERS', 'DJS', 'RAPPERS', 'JAZZ_BLUES',
  'CLASSICAL_MUSIC', 'WORLD_MUSIC', 'ELECTRONIC', 'FOLK',
  'ORCHESTRAS', 'CHOIRS', 'OPERA', 'ACOUSTIC',
])

const HEADERS = {
  'Accept': 'application/json',
  'Referer': 'https://goout.net/en/events',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
}

// -------------------------
// GoOut API types
// -------------------------

interface GoOutVenue {
  id: number
  name: string
  address: string
  city: string
  latitude: number | null
  longitude: number | null
  sourceUrl?: string
}

interface GoOutPerformer {
  id: number
  name: string
  mainCategory: {
    id: number
    name: string
    enum: string
  } | null
}

interface GoOutEvent {
  id: number
  name: string
  url: string
}

interface GoOutSchedule {
  id: number
  eventId: number
  startISO8601: string
  endISO8601: string | null
  permanent: boolean
  cancelled: boolean
  url: string
  venueId: number
  parentVenueId: number | null
  performerIds: number[]
  ticketsUrl: string | null
  state: string
}

interface GoOutResponse {
  status: number
  message: string
  hasNext: boolean
  page: number
  schedule: GoOutSchedule[]
  venues: Record<string, GoOutVenue>
  performers: Record<string, GoOutPerformer>
  events: Record<string, GoOutEvent>
}

// -------------------------
// Fetch one page from GoOut
// -------------------------

async function fetchPage(
  localityEnum: string,
  dateFrom: string,
  dateTo: string,
  page: number,
): Promise<GoOutResponse> {
  const params = new URLSearchParams({
    locality: localityEnum,
    language: 'en',
    source: 'anywent.com',
    after: dateFrom,
    before: dateTo,
    limit: String(PAGE_SIZE),
    page: String(page),
    forceSortByStart: 'ASC',
  })

  const res = await fetch(`${GOOUT_API_URL}?${params}`, { headers: HEADERS })
  if (!res.ok) throw new Error(`GoOut API error: ${res.status} ${res.statusText}`)

  const json = await res.json() as GoOutResponse
  if (json.status !== 200) throw new Error(`GoOut API returned status ${json.status}: ${json.message}`)

  return json
}

// -------------------------
// Date helpers
// -------------------------

// GoOut uses placeholder dates (e.g. 2016-01-01) for long-running events — not just
// permanent: true ones. Check the actual year regardless of the permanent flag.
// Clamp to the scrape window start so the DB has a sensible starts_at.
function resolveStartsAt(schedule: GoOutSchedule, dateFrom: string): string {
  const year = new Date(schedule.startISO8601).getFullYear()
  if (year < SENTINEL_YEAR_START) return `${dateFrom}T00:00:00.000Z`
  return schedule.startISO8601
}

// For permanent exhibitions GoOut uses 2038-01-01 as "no known end date".
// Store that as null — it's honest about what we know.
// Real closing dates (year < SENTINEL_YEAR_END) are kept as-is.
function resolveEndsAt(schedule: GoOutSchedule): string | null {
  if (!schedule.endISO8601) return null
  const year = new Date(schedule.endISO8601).getFullYear()
  if (year >= SENTINEL_YEAR_END) return null
  return schedule.endISO8601
}

// -------------------------
// Event type resolution
// -------------------------

function resolveEventType(
  performerIds: number[],
  performers: Record<string, GoOutPerformer>,
): string {
  // No performers → standalone exhibition (museum, gallery, etc.)
  if (performerIds.length === 0) return 'exhibition'

  for (const pid of performerIds) {
    const p = performers[String(pid)]
    if (p?.mainCategory && MUSIC_CATEGORY_ENUMS.has(p.mainCategory.enum)) {
      return 'concert'
    }
  }

  // Performers exist but none are music → still tag as concert (safe default;
  // could be refined later with a more complete category map)
  return 'concert'
}

// -------------------------
// DB helpers
// -------------------------

async function getCityId(citySlug: string): Promise<string> {
  const [city] = await sql`SELECT id FROM cities WHERE slug = ${citySlug}`
  if (!city) throw new Error(`City not found in DB: ${citySlug}. Run geography seed first.`)
  return city.id as string
}

async function upsertVenue(goVenue: GoOutVenue, cityId: string, eventType: string): Promise<string> {
  const [existing] = await sql`
    SELECT id FROM venues WHERE source_ids->>'goout' = ${String(goVenue.id)}
  `
  if (existing) return existing.id as string

  const slug = goVenue.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

  // Map AnyWent event type to venue type — best guess from available data
  const venueType = eventType === 'exhibition' ? 'museum' : 'concert_hall'

  const [created] = await sql`
    INSERT INTO venues (city_id, name, slug, type, source_ids)
    VALUES (
      ${cityId},
      ${goVenue.name},
      ${slug},
      ${venueType},
      ${sql.json({ goout: goVenue.id })}
    )
    ON CONFLICT (city_id, slug) DO UPDATE
      SET source_ids = venues.source_ids || ${sql.json({ goout: goVenue.id })}
    RETURNING id
  `
  return created.id as string
}

async function upsertArtist(goPerformer: GoOutPerformer): Promise<string> {
  const [existing] = await sql`
    SELECT id FROM artists WHERE source_ids->>'goout' = ${String(goPerformer.id)}
  `
  if (existing) return existing.id as string

  const slug = goPerformer.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

  const [created] = await sql`
    INSERT INTO artists (name, slug, source_ids)
    VALUES (${goPerformer.name}, ${slug}, ${sql.json({ goout: goPerformer.id })})
    ON CONFLICT (slug) DO UPDATE
      SET source_ids = artists.source_ids || ${sql.json({ goout: goPerformer.id })}
    RETURNING id
  `
  return created.id as string
}

async function upsertEvent(
  schedule: GoOutSchedule,
  goEvent: GoOutEvent,
  venueId: string,
  eventType: string,
  startsAt: string,
  endsAt: string | null,
): Promise<string> {
  const [row] = await sql`
    INSERT INTO events (
      venue_id, title, type, starts_at, ends_at,
      source, source_url, ticket_url, verified_at
    )
    VALUES (
      ${venueId},
      ${goEvent.name},
      ${eventType},
      ${startsAt}::timestamptz,
      ${endsAt}::timestamptz,
      'goout',
      ${schedule.url},
      ${schedule.ticketsUrl ?? null},
      now()
    )
    ON CONFLICT (source_url) DO UPDATE
      SET
        title       = EXCLUDED.title,
        type        = EXCLUDED.type,
        -- If the stored starts_at is a GoOut placeholder year (< 2020), overwrite it with the
        -- clamped value from this run. Otherwise keep the earliest real date we've seen.
        -- LEAST() alone won't fix already-stored 2016 sentinels: LEAST(2016, 2026) = 2016.
        starts_at   = CASE
                        WHEN EXTRACT(year FROM events.starts_at) < 2020 THEN EXCLUDED.starts_at
                        ELSE LEAST(events.starts_at, EXCLUDED.starts_at)
                      END,
        ends_at     = EXCLUDED.ends_at,
        ticket_url  = EXCLUDED.ticket_url,
        verified_at = now(),
        updated_at  = now()
    RETURNING id
  `
  return row.id as string
}

async function upsertEventArtists(eventId: string, artistIds: string[]): Promise<void> {
  for (let i = 0; i < artistIds.length; i++) {
    const role = i === 0 ? 'headliner' : 'support'
    await sql`
      INSERT INTO event_artists (event_id, artist_id, role, "order")
      VALUES (${eventId}, ${artistIds[i]}, ${role}, ${i})
      ON CONFLICT (event_id, artist_id) DO NOTHING
    `
  }
}

// -------------------------
// Main scraper entry point
// -------------------------

export async function scrapeGoOut(
  cityKey: keyof typeof GOOUT_LOCALITIES,
  dateFrom: string,
  dateTo: string,
) {
  const locality = GOOUT_LOCALITIES[cityKey]
  const runStart = new Date()
  let eventsUpserted = 0
  const errors: string[] = []

  console.log(`[goout] scraping ${cityKey} (${locality.enum}) from ${dateFrom} to ${dateTo}`)

  const [runRow] = await sql`
    INSERT INTO scraper_runs (source, started_at)
    VALUES ('goout', ${runStart})
    RETURNING id
  `
  const runId = runRow.id as string

  try {
    const cityId = await getCityId(locality.citySlug)
    let page = 1

    while (true) {
      const response = await fetchPage(locality.enum, dateFrom, dateTo, page)

      if (response.schedule.length === 0) break

      console.log(`[goout] ${cityKey} page ${page}: ${response.schedule.length} schedules`)

      for (const schedule of response.schedule) {
        // Skip cancelled or unapproved events
        if (schedule.cancelled) {
          console.log(`[goout] skipping schedule ${schedule.id} — cancelled`)
          continue
        }
        if (schedule.state !== 'APPROVED') {
          console.log(`[goout] skipping schedule ${schedule.id} — state: ${schedule.state}`)
          continue
        }
        // Skip events with no URL (can't form source_url for deduplication)
        if (!schedule.url) {
          console.warn(`[goout] skipping schedule ${schedule.id} — no url`)
          continue
        }

        const goEvent = response.events[String(schedule.eventId)]
        if (!goEvent) {
          console.warn(`[goout] skipping schedule ${schedule.id} — event ${schedule.eventId} not in response`)
          continue
        }

        const goVenue = response.venues[String(schedule.venueId)]
        if (!goVenue) {
          console.warn(`[goout] skipping schedule ${schedule.id} — venue ${schedule.venueId} not in response`)
          continue
        }

        try {
          const startsAt = resolveStartsAt(schedule, dateFrom)
          const endsAt   = resolveEndsAt(schedule)
          const eventType = resolveEventType(schedule.performerIds, response.performers)

          const venueId = await upsertVenue(goVenue, cityId, eventType)

          const artistIds: string[] = []
          for (const pid of schedule.performerIds) {
            const performer = response.performers[String(pid)]
            if (performer) {
              const artistId = await upsertArtist(performer)
              artistIds.push(artistId)
            }
          }

          const eventId = await upsertEvent(schedule, goEvent, venueId, eventType, startsAt, endsAt)
          await upsertEventArtists(eventId, artistIds)
          eventsUpserted++
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          errors.push(`schedule ${schedule.id}: ${msg}`)
          console.error(`[goout] error on schedule ${schedule.id}:`, msg)
        }
      }

      if (!response.hasNext) break
      page++
      await new Promise(resolve => setTimeout(resolve, DELAY_MS))
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    errors.push(msg)
    console.error('[goout] fatal error:', msg)
  }

  await sql`
    UPDATE scraper_runs
    SET
      finished_at     = now(),
      events_upserted = ${eventsUpserted},
      errors          = ${sql.json(errors)}
    WHERE id = ${runId}
  `

  console.log(`[goout] done — ${eventsUpserted} upserted, ${errors.length} errors`)
  await sql.end()
}

// -------------------------
// CLI entry point
// Run: pnpm tsx --env-file=../.env jobs/scrapers/goout.ts prague 2026-05-28 2026-06-30
// -------------------------

const [, , city, dateFrom, dateTo] = process.argv
if (city && dateFrom && dateTo) {
  if (!(city in GOOUT_LOCALITIES)) {
    console.error(`Unknown city: ${city}. Valid: ${Object.keys(GOOUT_LOCALITIES).join(', ')}`)
    process.exit(1)
  }
  scrapeGoOut(city as keyof typeof GOOUT_LOCALITIES, dateFrom, dateTo).catch(err => {
    console.error(err)
    process.exit(1)
  })
}
