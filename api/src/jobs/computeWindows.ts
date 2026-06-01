/**
 * computeWindows — pre-compute best 4-day event windows per city.
 *
 * Runs as an in-process cron job (see jobs/index.ts). Reads from events/venues/cities,
 * writes to event_windows. Never called inline by the API — only called by the cron job
 * and the admin trigger endpoint.
 *
 * Scoring strategy: BASELINE only (event_count × 0.1). This makes the pre-computed
 * windows user-agnostic and correct for multi-user. The /windows endpoint re-ranks
 * them per authenticated user using their affinities against top_artist_ids.
 */

import { sql } from '../db/client.js'

const WINDOW_DAYS    = 4   // days per window
const LOOKAHEAD_DAYS = 60  // how far ahead to look
const TOP_N          = 5   // non-overlapping windows to keep per city
const TOP_ARTISTS    = 10  // max artist IDs to store per window
const DENSITY_BUCKETS = 12 // slots in the density profile

// ── Types ────────────────────────────────────────────────────────────────────

interface EventRecord {
  id:         string
  starts_at:  Date
  artist_ids: string[]
}

interface ScoredWindow {
  start:          Date
  end:            Date       // last day inclusive
  score:          number
  eventCount:     number
  topArtistIds:   string[]
  densityProfile: number[]   // DENSITY_BUCKETS values, normalised 0–100
}

// ── Density profile ──────────────────────────────────────────────────────────

function computeDensityProfile(events: EventRecord[], windowStart: Date): number[] {
  const bucketHours = (WINDOW_DAYS * 24) / DENSITY_BUCKETS
  const counts = new Array<number>(DENSITY_BUCKETS).fill(0)

  for (const e of events) {
    const hoursOffset = (e.starts_at.getTime() - windowStart.getTime()) / 3_600_000
    const bucket = Math.min(Math.floor(hoursOffset / bucketHours), DENSITY_BUCKETS - 1)
    counts[Math.max(0, bucket)]++
  }

  const max = Math.max(...counts)
  return max === 0 ? counts : counts.map(c => Math.round((c / max) * 100))
}

// ── Non-overlapping selection ────────────────────────────────────────────────

function selectNonOverlapping(windows: ScoredWindow[], n: number): ScoredWindow[] {
  const selected: ScoredWindow[] = []
  const sorted = [...windows].sort((a, b) => b.score - a.score)
  for (const w of sorted) {
    if (selected.length >= n) break
    const overlaps = selected.some(s => w.start <= s.end && w.end >= s.start)
    if (!overlaps) selected.push(w)
  }
  return selected
}

// ── Window builder ───────────────────────────────────────────────────────────

function buildWindows(events: EventRecord[], now: Date): ScoredWindow[] {
  const windowMs  = WINDOW_DAYS * 86_400_000
  const cutoff    = new Date(now.getTime() + LOOKAHEAD_DAYS * 86_400_000)
  const windows:   ScoredWindow[] = []

  // Slide one day at a time from start of today
  const cursor = new Date(now)
  cursor.setUTCHours(0, 0, 0, 0)

  while (cursor < cutoff) {
    const windowStart = new Date(cursor)
    const windowEnd   = new Date(cursor.getTime() + windowMs) // exclusive boundary
    const lastDay     = new Date(windowEnd.getTime() - 86_400_000) // inclusive last day

    const windowEvents = events.filter(
      e => e.starts_at >= windowStart && e.starts_at < windowEnd,
    )

    if (windowEvents.length > 0) {
      // Count artist appearances, keep top N
      const artistCounts = new Map<string, number>()
      for (const e of windowEvents) {
        for (const id of e.artist_ids) {
          if (id) artistCounts.set(id, (artistCounts.get(id) ?? 0) + 1)
        }
      }
      const topArtistIds = [...artistCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, TOP_ARTISTS)
        .map(([id]) => id)

      windows.push({
        start:          windowStart,
        end:            lastDay,
        score:          windowEvents.length * 0.1,  // baseline
        eventCount:     windowEvents.length,
        topArtistIds,
        densityProfile: computeDensityProfile(windowEvents, windowStart),
      })
    }

    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }

  return windows
}

// ── DB helpers ───────────────────────────────────────────────────────────────

async function getEventsForCity(cityId: string, now: Date): Promise<EventRecord[]> {
  const cutoff = new Date(now.getTime() + LOOKAHEAD_DAYS * 86_400_000)
  const rows = await sql<Array<{ id: string; starts_at: Date; artist_ids: string[] }>>`
    SELECT
      e.id,
      e.starts_at,
      COALESCE(ARRAY_AGG(ea.artist_id::text) FILTER (WHERE ea.artist_id IS NOT NULL), '{}') AS artist_ids
    FROM   events e
    JOIN   venues v ON v.id = e.venue_id
    LEFT JOIN event_artists ea ON ea.event_id = e.id
    WHERE  v.city_id = ${cityId}
      AND  e.starts_at >= ${now.toISOString()}
      AND  e.starts_at <  ${cutoff.toISOString()}
    GROUP BY e.id
    ORDER BY e.starts_at ASC
  `
  return rows
}

async function upsertWindows(cityId: string, windows: ScoredWindow[]): Promise<void> {
  for (const w of windows) {
    await sql`
      INSERT INTO event_windows (
        city_id, start_date, end_date,
        event_count, affinity_score,
        top_artist_ids, density_profile, computed_at
      ) VALUES (
        ${cityId},
        ${w.start.toISOString().slice(0, 10)},
        ${w.end.toISOString().slice(0, 10)},
        ${w.eventCount},
        ${w.score},
        ${sql.array(w.topArtistIds)}::uuid[],
        ${sql.array(w.densityProfile)}::smallint[],
        NOW()
      )
      ON CONFLICT (city_id, start_date, end_date) DO UPDATE SET
        event_count     = EXCLUDED.event_count,
        affinity_score  = EXCLUDED.affinity_score,
        top_artist_ids  = EXCLUDED.top_artist_ids,
        density_profile = EXCLUDED.density_profile,
        computed_at     = EXCLUDED.computed_at
    `
  }
}

// ── Entry point ──────────────────────────────────────────────────────────────

export async function computeWindows(): Promise<void> {
  const now = new Date()

  // Clean up expired windows first
  await sql`DELETE FROM event_windows WHERE end_date < CURRENT_DATE`

  const cities = await sql<Array<{ id: string; name: string }>>`
    SELECT id, name FROM cities WHERE active = true ORDER BY name ASC
  `

  for (const city of cities) {
    const events  = await getEventsForCity(city.id, now)
    const windows = buildWindows(events, now)
    const top     = selectNonOverlapping(windows, TOP_N)
    await upsertWindows(city.id, top)
    console.log(`[computeWindows] ${city.name}: ${events.length} events → ${top.length} windows`)
  }
}
