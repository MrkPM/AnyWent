// Songkick scraper — concerts via LD+JSON on metro-area listing pages
// Endpoint: https://www.songkick.com/metro-areas/{id}-{slug}?page=N
// Method: LD+JSON extraction from HTML — no API key required (public, structured data)
// Metro area IDs confirmed via site search 2026-05/06:
//   amsterdam=31366, berlin=28443, prague=28425, paris=28909, mallorca=71561
// Note: Songkick does not filter listings by date server-side. We paginate until
// startDate exceeds dateTo, then stop.

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

const DELAY_MS = 2000

export const SONGKICK_LOCALITIES: Record<string, { metroAreaId: number; urlSlug: string; citySlug: string }> = {
  amsterdam: { metroAreaId: 31366, urlSlug: 'netherlands-amsterdam', citySlug: 'amsterdam' },
  berlin:    { metroAreaId: 28443, urlSlug: 'germany-berlin',        citySlug: 'berlin'    },
  paris:     { metroAreaId: 28909, urlSlug: 'france-paris',          citySlug: 'paris'     },
  prague:    { metroAreaId: 28425, urlSlug: 'czech-republic-prague',      citySlug: 'prague'    },
  mallorca:  { metroAreaId: 71561, urlSlug: 'spain-palma-de-mallorca',   citySlug: 'mallorca'  },
}

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html',
  'Accept-Language': 'en-GB,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
}

// -------------------------
// Songkick LD+JSON types
// -------------------------

interface SkAddress {
  '@type': 'PostalAddress'
  addressLocality: string
  addressCountry: string
  streetAddress?: string
  postalCode?: string
}

interface SkGeo {
  '@type': 'GeoCoordinates'
  latitude: number
  longitude: number
}

interface SkLocation {
  '@type': 'Place'
  name: string
  address: SkAddress
  geo: SkGeo | null
  sameAs: string | null
}

interface SkPerformer {
  '@type': 'MusicGroup'
  name: string
  genre: string[]
  sameAs: string   // Songkick artist URL
}

interface SkEvent {
  '@context': string
  '@type': 'MusicEvent'
  name: string
  url: string      // Songkick concert URL — used as source_url
  image: string | null
  eventStatus: string
  startDate: string
  endDate: string | null
  location: SkLocation
  performer: SkPerformer[]
  description?: string
}

// -------------------------
// Fetch one page + parse LD+JSON
// -------------------------

const LD_JSON_RE = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi

async function fetchPage(
  metroAreaId: number,
  urlSlug: string,
  page: number,
): Promise<SkEvent[]> {
  const url = `https://www.songkick.com/metro-areas/${metroAreaId}-${urlSlug}?page=${page}`
  const res = await fetch(url, { headers: HEADERS })
  if (!res.ok) throw new Error(`Songkick HTTP ${res.status} for ${url}`)

  const html = await res.text()
  const events: SkEvent[] = []

  let match: RegExpExecArray | null
  LD_JSON_RE.lastIndex = 0
  while ((match = LD_JSON_RE.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim())
      const arr: unknown[] = Array.isArray(parsed) ? parsed : [parsed]
      for (const item of arr) {
        if ((item as SkEvent)['@type'] === 'MusicEvent') {
          events.push(item as SkEvent)
        }
      }
    } catch {
      // malformed block — skip
    }
  }

  return events
}

// -------------------------
// DB helpers
// -------------------------

async function getCityId(citySlug: string): Promise<string> {
  const [city] = await sql`SELECT id FROM cities WHERE slug = ${citySlug}`
  if (!city) throw new Error(`City not found in DB: ${citySlug}. Run geography seed first.`)
  return city.id as string
}

async function upsertVenue(skLocation: SkLocation, cityId: string): Promise<string> {
  const name = skLocation.name
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

  const [existing] = await sql`
    SELECT id FROM venues WHERE city_id = ${cityId} AND slug = ${slug}
  `
  if (existing) return existing.id as string

  const lat  = skLocation.geo?.latitude  ?? null
  const lng  = skLocation.geo?.longitude ?? null
  const addr = [skLocation.address.streetAddress, skLocation.address.postalCode]
    .filter(Boolean).join(', ') || null
  const website = skLocation.sameAs ?? null

  const [created] = await sql`
    INSERT INTO venues (city_id, name, slug, type, address, lat, lng, website_url, source_ids)
    VALUES (
      ${cityId},
      ${name},
      ${slug},
      'concert_hall',
      ${addr},
      ${lat},
      ${lng},
      ${website},
      ${sql.json({ songkick: true })}
    )
    ON CONFLICT (city_id, slug) DO UPDATE
      SET
        lat        = COALESCE(venues.lat,  EXCLUDED.lat),
        lng        = COALESCE(venues.lng,  EXCLUDED.lng),
        address    = COALESCE(venues.address, EXCLUDED.address),
        website_url = COALESCE(venues.website_url, EXCLUDED.website_url),
        source_ids = venues.source_ids || ${sql.json({ songkick: true })}
    RETURNING id
  `
  return created.id as string
}

async function upsertArtist(performer: SkPerformer): Promise<string> {
  const [existing] = await sql`
    SELECT id FROM artists WHERE source_ids->>'songkick' = ${performer.sameAs}
  `
  if (existing) {
    // Update genres if we now have them and the artist was created without
    if (performer.genre.length > 0) {
      await sql`
        UPDATE artists
        SET genres = CASE WHEN genres = '{}' THEN ${performer.genre} ELSE genres END
        WHERE id = ${existing.id}
      `
    }
    return existing.id as string
  }

  const slug = performer.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

  const [created] = await sql`
    INSERT INTO artists (name, slug, genres, source_ids)
    VALUES (
      ${performer.name},
      ${slug},
      ${performer.genre},
      ${sql.json({ songkick: performer.sameAs })}
    )
    ON CONFLICT (slug) DO UPDATE
      SET
        genres     = CASE WHEN artists.genres = '{}' THEN EXCLUDED.genres ELSE artists.genres END,
        source_ids = artists.source_ids || ${sql.json({ songkick: performer.sameAs })}
    RETURNING id
  `
  return created.id as string
}

async function upsertEvent(
  skEvent: SkEvent,
  venueId: string,
): Promise<string> {
  // startDate is sometimes datetime ("2026-05-29T19:30:00"), sometimes date-only ("2026-05-29").
  // Metro listing pages almost always return date-only — no time data available.
  // When date-only, store midnight UTC as a placeholder and flag time_known = false
  // so the UI can render '–' rather than a meaningless derived time.
  const isDateOnly = skEvent.startDate.length === 10
  const startsAt   = isDateOnly
    ? `${skEvent.startDate}T00:00:00.000Z`
    : skEvent.startDate

  // endDate is always date-only or null
  const endsAt = skEvent.endDate && skEvent.endDate !== skEvent.startDate.slice(0, 10)
    ? `${skEvent.endDate}T23:59:59.000Z`
    : null

  const [row] = await sql`
    INSERT INTO events (
      venue_id, title, type, starts_at, ends_at,
      source, source_url, image_url, time_known, verified_at
    )
    VALUES (
      ${venueId},
      ${skEvent.name},
      'concert',
      ${startsAt}::timestamptz,
      ${endsAt}::timestamptz,
      'songkick',
      ${skEvent.url},
      ${skEvent.image ?? null},
      ${!isDateOnly},
      now()
    )
    ON CONFLICT (source_url) DO UPDATE
      SET
        title       = EXCLUDED.title,
        starts_at   = EXCLUDED.starts_at,
        ends_at     = EXCLUDED.ends_at,
        image_url   = COALESCE(EXCLUDED.image_url, events.image_url),
        time_known  = EXCLUDED.time_known,
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

export async function scrapeSongkick(
  cityKey: keyof typeof SONGKICK_LOCALITIES,
  dateFrom: string,
  dateTo: string,
) {
  const locality = SONGKICK_LOCALITIES[cityKey]
  const runStart = new Date()
  let eventsUpserted = 0
  const errors: string[] = []

  console.log(`[songkick] scraping ${cityKey} (metro ${locality.metroAreaId}) up to ${dateTo}`)

  const [runRow] = await sql`
    INSERT INTO scraper_runs (source, started_at)
    VALUES ('songkick', ${runStart})
    RETURNING id
  `
  const runId = runRow.id as string

  try {
    const cityId = await getCityId(locality.citySlug)
    let page = 1

    outer: while (true) {
      const events = await fetchPage(locality.metroAreaId, locality.urlSlug, page)

      if (events.length === 0) {
        console.log(`[songkick] ${cityKey} page ${page}: no events — stopping`)
        break
      }

      console.log(`[songkick] ${cityKey} page ${page}: ${events.length} events`)

      for (const skEvent of events) {
        // Skip cancelled / postponed events
        if (skEvent.eventStatus.includes('EventCancelled') || skEvent.eventStatus.includes('EventPostponed')) {
          console.log(`[songkick] skipping — ${skEvent.eventStatus.split('/').pop()}: ${skEvent.name}`)
          continue
        }

        // Stop once we've passed dateTo (listings are date-ordered)
        const eventDate = skEvent.startDate.slice(0, 10)
        if (eventDate > dateTo) {
          console.log(`[songkick] reached ${eventDate} > ${dateTo} — stopping`)
          break outer
        }

        // Skip events before dateFrom
        if (eventDate < dateFrom) continue

        if (!skEvent.url) {
          console.warn(`[songkick] skipping — no url: ${skEvent.name}`)
          continue
        }

        try {
          const venueId = await upsertVenue(skEvent.location, cityId)

          const artistIds: string[] = []
          for (const performer of skEvent.performer) {
            if (performer.name && performer.sameAs) {
              const artistId = await upsertArtist(performer)
              artistIds.push(artistId)
            }
          }

          const eventId = await upsertEvent(skEvent, venueId)
          await upsertEventArtists(eventId, artistIds)
          eventsUpserted++
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          errors.push(`${skEvent.url}: ${msg}`)
          console.error(`[songkick] error on ${skEvent.name}:`, msg)
        }
      }

      page++
      await new Promise(resolve => setTimeout(resolve, DELAY_MS))
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    errors.push(msg)
    console.error('[songkick] fatal error:', msg)
  }

  await sql`
    UPDATE scraper_runs
    SET
      finished_at     = now(),
      events_upserted = ${eventsUpserted},
      errors          = ${sql.json(errors)}
    WHERE id = ${runId}
  `

  console.log(`[songkick] done — ${eventsUpserted} upserted, ${errors.length} errors`)
  await sql.end()
}

// -------------------------
// CLI entry point
// Run: pnpm tsx --env-file=../.env jobs/scrapers/songkick.ts amsterdam 2026-05-28 2026-06-30
// -------------------------

const [, , city, dateFrom, dateTo] = process.argv
if (city && dateFrom && dateTo) {
  if (!(city in SONGKICK_LOCALITIES)) {
    console.error(`Unknown city: ${city}. Valid: ${Object.keys(SONGKICK_LOCALITIES).join(', ')}`)
    process.exit(1)
  }
  scrapeSongkick(city as keyof typeof SONGKICK_LOCALITIES, dateFrom, dateTo).catch(err => {
    console.error(err)
    process.exit(1)
  })
}
