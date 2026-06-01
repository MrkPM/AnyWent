import type { FastifyInstance } from 'fastify'
import { authenticateOptional } from '../middleware/auth.js'
import { getBundlesByDateRange, type BundleQueryRow } from '../db/queries/bundles.js'

// ── Weekend generation ───────────────────────────────────────────────────────
// Mirrors the logic in web/src/lib/dates.ts — uses UTC to stay timezone-neutral.

function upcomingWeekends(count: number): Array<{ from: string; to: string }> {
  const now = new Date()
  const day = now.getUTCDay() // 0 Sun … 6 Sat
  const daysUntilFri = day <= 5 ? 5 - day : 6  // 0 if today is Friday
  const weekends: Array<{ from: string; to: string }> = []

  for (let i = 0; i < count; i++) {
    const fri = new Date(now)
    fri.setUTCDate(now.getUTCDate() + daysUntilFri + i * 7)
    const sun = new Date(fri)
    sun.setUTCDate(fri.getUTCDate() + 2)
    weekends.push({
      from: fri.toISOString().slice(0, 10),
      to:   sun.toISOString().slice(0, 10),
    })
  }
  return weekends
}

// ── Assembly ─────────────────────────────────────────────────────────────────

interface BundleTopEvent {
  id:           string
  title:        string
  startsAt:     string
  imageUrl:     string | null
  timeKnown:    boolean
  affinityScore: number
  ticketUrl:    string | null
  sourceUrl:    string
  venue:        { name: string }
}

interface ApiBundle {
  city:       { id: string; name: string; slug: string }
  score:      number
  eventCount: number
  topEvents:  BundleTopEvent[]
}

function assembleBundle(rows: BundleQueryRow[]): ApiBundle {
  const first = rows[0]
  return {
    city: { id: first.city_id, name: first.city_name, slug: first.city_slug },
    score:      Number(first.bundle_score),
    eventCount: first.event_count,
    topEvents: rows
      .filter(r => r.event_id !== null)
      .map(r => ({
        id:           r.event_id!,
        title:        r.event_title!,
        startsAt:     r.event_starts_at!,
        imageUrl:     r.event_image_url,
        timeKnown:    r.event_time_known!,
        affinityScore: Number(r.event_affinity_score),
        ticketUrl:    r.event_ticket_url,
        sourceUrl:    r.event_source_url!,
        venue:        { name: r.venue_name! },
      })),
  }
}

function groupIntoBundles(rows: BundleQueryRow[]): ApiBundle[] {
  const cityMap = new Map<string, BundleQueryRow[]>()
  for (const row of rows) {
    if (!cityMap.has(row.city_id)) cityMap.set(row.city_id, [])
    cityMap.get(row.city_id)!.push(row)
  }
  return [...cityMap.values()].map(assembleBundle)
}

// ── Route ────────────────────────────────────────────────────────────────────

export async function bundleRoutes(app: FastifyInstance) {
  // GET /bundles?weeks=4
  // Returns upcoming weekends with cities ranked by affinity score.
  // weeks: how many weekends ahead (1–8, default 4).
  app.get<{ Querystring: { weeks?: string } }>(
    '/bundles',
    { preHandler: authenticateOptional },
    async (req, reply) => {
      const weeks  = Math.min(Math.max(parseInt(req.query.weeks ?? '4', 10) || 4, 1), 8)
      const userId = req.user?.id ?? null

      const weekends = upcomingWeekends(weeks)

      // Run all weekends in parallel
      const results = await Promise.all(
        weekends.map(async ({ from, to }) => {
          const rows    = await getBundlesByDateRange(from, to, userId)
          const bundles = groupIntoBundles(rows)
          return { from, to, bundles }
        }),
      )

      // Drop weekends with no data (e.g. scrapers haven't run that far ahead yet)
      const weekendsWithData = results.filter(w => w.bundles.length > 0)

      return reply.send({ weekends: weekendsWithData })
    },
  )
}
