// Resident Advisor GraphQL scraper
// Endpoint: https://ra.co/graphql (undocumented, reverse-engineered 2026-05)
// Area IDs confirmed via: { areas(searchTerm: "...", limit: 1) { id name } }

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

const RA_GRAPHQL_URL = 'https://ra.co/graphql'
const PAGE_SIZE = 100
const DELAY_MS = 2000

export const RA_AREAS: Record<string, { id: number; citySlug: string }> = {
  berlin:    { id: 34,  citySlug: 'berlin' },
  amsterdam: { id: 29,  citySlug: 'amsterdam' },
  prague:    { id: 451, citySlug: 'prague' },
  paris:     { id: 44,  citySlug: 'paris' },
  mallorca:  { id: 661, citySlug: 'mallorca' }, // RA area covers whole island
}

const HEADERS = {
  'Content-Type': 'application/json',
  'Referer': 'https://ra.co/events',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
}

// -------------------------
// GraphQL query
// -------------------------

const EVENT_LISTINGS_QUERY = `
  query GET_EVENT_LISTINGS(
    $filters: FilterInputDtoInput
    $filterOptions: FilterOptionsInputDtoInput
    $page: Int
    $pageSize: Int
  ) {
    eventListings(
      filters: $filters
      filterOptions: $filterOptions
      pageSize: $pageSize
      page: $page
    ) {
      data {
        listingDate
        event {
          id
          title
          date
          startTime
          endTime
          contentUrl
          isTicketed
          images {
            filename
          }
          venue {
            id
            name
            contentUrl
            area {
              id
              name
              ianaTimeZone
            }
          }
          artists {
            id
            name
          }
        }
      }
      totalResults
    }
  }
`

// -------------------------
// RA API types
// -------------------------

interface RaArtist {
  id: string
  name: string
}

interface RaVenue {
  id: string
  name: string
  contentUrl: string
  area: {
    id: string
    name: string
    ianaTimeZone: string
  }
}

interface RaEvent {
  id: string
  title: string
  date: string
  startTime: string | null
  endTime: string | null
  contentUrl: string
  isTicketed: boolean
  images: { filename: string }[]
  venue: RaVenue
  artists: RaArtist[]
}

interface RaListing {
  listingDate: string
  event: RaEvent
}

interface RaResponse {
  data: {
    eventListings: {
      data: RaListing[]
      totalResults: number
    }
  }
}

// -------------------------
// Fetch one page from RA
// -------------------------

async function fetchPage(areaId: number, dateFrom: string, dateTo: string, page: number): Promise<RaListing[]> {
  const body = {
    query: EVENT_LISTINGS_QUERY,
    variables: {
      filters: {
        areas: { eq: areaId },
        listingDate: {
          gte: `${dateFrom}T00:00:00.000Z`,
          lte: `${dateTo}T23:59:59.999Z`,
        },
      },
      filterOptions: { genre: false },
      pageSize: PAGE_SIZE,
      page,
    },
  }

  const res = await fetch(RA_GRAPHQL_URL, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(body),
  })

  if (!res.ok) throw new Error(`RA API error: ${res.status} ${res.statusText}`)

  const json = await res.json() as RaResponse
  return json.data.eventListings.data
}

// -------------------------
// DB helpers
// -------------------------

async function getCityId(citySlug: string): Promise<string> {
  const [city] = await sql`SELECT id FROM cities WHERE slug = ${citySlug}`
  if (!city) throw new Error(`City not found in DB: ${citySlug}. Run geography seed first.`)
  return city.id as string
}

async function upsertVenue(raVenue: RaVenue, cityId: string): Promise<string> {
  const slug = raVenue.contentUrl?.split('/').pop() ?? `ra-venue-${raVenue.id}`
  const sourceUrl = raVenue.contentUrl ? `https://ra.co${raVenue.contentUrl}` : null

  const [existing] = await sql`
    SELECT id FROM venues WHERE source_ids->>'ra' = ${raVenue.id}
  `
  if (existing) return existing.id as string

  const [created] = await sql`
    INSERT INTO venues (city_id, name, slug, type, website_url, source_ids)
    VALUES (
      ${cityId},
      ${raVenue.name},
      ${slug},
      'club',
      ${sourceUrl},
      ${sql.json({ ra: raVenue.id })}
    )
    ON CONFLICT (city_id, slug) DO UPDATE
      SET source_ids = venues.source_ids || ${sql.json({ ra: raVenue.id })}
    RETURNING id
  `
  return created.id as string
}

async function upsertArtist(raArtist: RaArtist): Promise<string> {
  const [existing] = await sql`
    SELECT id FROM artists WHERE source_ids->>'ra' = ${raArtist.id}
  `
  if (existing) return existing.id as string

  const slug = raArtist.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  const [created] = await sql`
    INSERT INTO artists (name, slug, source_ids)
    VALUES (${raArtist.name}, ${slug}, ${sql.json({ ra: raArtist.id })})
    ON CONFLICT (slug) DO UPDATE
      SET source_ids = artists.source_ids || ${sql.json({ ra: raArtist.id })}
    RETURNING id
  `
  return created.id as string
}

async function upsertEvent(raEvent: RaEvent, venueId: string): Promise<string> {
  const sourceUrl = `https://ra.co${raEvent.contentUrl}`
  // RA returns full image URLs in images[0].filename despite the field name
  const imageUrl = raEvent.images?.[0]?.filename ?? null

  const [row] = await sql`
    INSERT INTO events (
      venue_id, title, type, starts_at, ends_at,
      source, source_url, image_url, verified_at
    )
    VALUES (
      ${venueId},
      ${raEvent.title},
      'club_night',
      ${raEvent.startTime ?? raEvent.date},
      ${raEvent.endTime ?? null},
      'ra',
      ${sourceUrl},
      ${imageUrl},
      now()
    )
    ON CONFLICT (source_url) DO UPDATE
      SET
        title       = EXCLUDED.title,
        starts_at   = EXCLUDED.starts_at,
        ends_at     = EXCLUDED.ends_at,
        image_url   = EXCLUDED.image_url,
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

export async function scrapeRA(cityKey: keyof typeof RA_AREAS, dateFrom: string, dateTo: string) {
  const area = RA_AREAS[cityKey]
  const runStart = new Date()
  let eventsUpserted = 0
  const errors: string[] = []

  console.log(`[ra] scraping ${cityKey} (area ${area.id}) from ${dateFrom} to ${dateTo}`)

  const [runRow] = await sql`
    INSERT INTO scraper_runs (source, started_at)
    VALUES ('ra', ${runStart})
    RETURNING id
  `
  const runId = runRow.id as string

  try {
    const cityId = await getCityId(area.citySlug)
    let page = 1

    while (true) {
      const listings = await fetchPage(area.id, dateFrom, dateTo, page)
      if (listings.length === 0) break

      console.log(`[ra] ${cityKey} page ${page}: ${listings.length} listings`)

      for (const listing of listings) {
        const raEvent = listing.event

        // Skip events with no contentUrl — can't form a valid source_url for deduplication
        if (!raEvent.contentUrl) {
          console.warn(`[ra] skipping event ${raEvent.id} — no contentUrl`)
          continue
        }
        // Skip events with no venue — online/venue-less listings we can't place on a map
        if (!raEvent.venue) {
          console.warn(`[ra] skipping event ${raEvent.id} — no venue`)
          continue
        }

        try {
          const venueId = await upsertVenue(raEvent.venue, cityId)
          const artistIds = await Promise.all(raEvent.artists.map(upsertArtist))
          const eventId = await upsertEvent(raEvent, venueId)
          await upsertEventArtists(eventId, artistIds)
          eventsUpserted++
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          errors.push(`event ${raEvent.id}: ${msg}`)
          console.error(`[ra] error on event ${raEvent.id}:`, msg)
        }
      }

      if (listings.length < PAGE_SIZE) break
      page++
      await new Promise(resolve => setTimeout(resolve, DELAY_MS))
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    errors.push(msg)
    console.error('[ra] fatal error:', msg)
  }

  await sql`
    UPDATE scraper_runs
    SET
      finished_at     = now(),
      events_upserted = ${eventsUpserted},
      errors          = ${sql.json(errors)}
    WHERE id = ${runId}
  `

  console.log(`[ra] done — ${eventsUpserted} upserted, ${errors.length} errors`)
  await sql.end()
}

// -------------------------
// CLI entry point
// Run: pnpm tsx jobs/scrapers/ra.ts berlin 2026-05-30 2026-06-01
// -------------------------

const [, , city, dateFrom, dateTo] = process.argv
if (city && dateFrom && dateTo) {
  if (!(city in RA_AREAS)) {
    console.error(`Unknown city: ${city}. Valid: ${Object.keys(RA_AREAS).join(', ')}`)
    process.exit(1)
  }
  scrapeRA(city as keyof typeof RA_AREAS, dateFrom, dateTo).catch(err => {
    console.error(err)
    process.exit(1)
  })
}
