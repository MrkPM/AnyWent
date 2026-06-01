import type { FastifyInstance } from 'fastify'
import { authenticateOptional } from '../middleware/auth.js'
import { computeWindows } from '../jobs/computeWindows.js'
import { sql } from '../db/client.js'

// ── DB query ─────────────────────────────────────────────────────────────────

interface WindowRow {
  id:              string
  city_id:         string
  city_name:       string
  city_slug:       string
  country_code:    string
  country_name:    string
  start_date:      string
  end_date:        string
  event_count:     number
  affinity_score:  number
  top_artist_ids:  string[]
  density_profile: number[]
  computed_at:     string
}

async function getWindows(daysOut: number, limit: number): Promise<WindowRow[]> {
  return sql<WindowRow[]>`
    SELECT
      ew.id,
      ew.city_id,
      c.name       AS city_name,
      c.slug       AS city_slug,
      co.code      AS country_code,
      co.name      AS country_name,
      ew.start_date::text,
      ew.end_date::text,
      ew.event_count,
      ew.affinity_score,
      ew.top_artist_ids,
      ew.density_profile,
      ew.computed_at
    FROM   event_windows ew
    JOIN   cities   c  ON c.id  = ew.city_id
    JOIN   regions  r  ON r.id  = c.region_id
    JOIN   countries co ON co.id = r.country_id
    WHERE  ew.start_date >= CURRENT_DATE
      AND  ew.start_date <= CURRENT_DATE + ${daysOut}::int
    ORDER BY ew.affinity_score DESC
    LIMIT  ${limit}
  `
}

// When the user is authenticated, fetch their affinities and re-score each window
// by summing weights for any top_artist_ids they follow.
async function getUserAffinities(userId: string): Promise<Map<string, number>> {
  const rows = await sql<Array<{ artist_id: string; weight: number }>>`
    SELECT artist_id::text, weight::float
    FROM   user_artist_affinities
    WHERE  user_id = ${userId}
  `
  return new Map(rows.map(r => [r.artist_id, r.weight]))
}

function personalizedScore(window: WindowRow, affinities: Map<string, number>): number {
  const boost = window.top_artist_ids.reduce(
    (sum, id) => sum + (affinities.get(id) ?? 0), 0,
  )
  // Additive: baseline + affinity boost so even unfollowed windows stay visible
  return window.affinity_score + boost
}

// ── Route ────────────────────────────────────────────────────────────────────

export async function windowRoutes(app: FastifyInstance) {
  // GET /windows?days_out=60&limit=10
  // Returns pre-computed city windows, personalised by affinity when authenticated.
  app.get<{
    Querystring: { days_out?: string; limit?: string }
  }>(
    '/windows',
    { preHandler: authenticateOptional },
    async (req, reply) => {
      const daysOut = Math.min(Math.max(parseInt(req.query.days_out ?? '60', 10) || 60, 1), 90)
      const limit   = Math.min(Math.max(parseInt(req.query.limit   ?? '10', 10) || 10, 1), 50)
      const userId  = req.user?.id ?? null

      const windows   = await getWindows(daysOut, limit)
      const today     = new Date()
      today.setUTCHours(0, 0, 0, 0)

      let affinities: Map<string, number> = new Map()
      if (userId) affinities = await getUserAffinities(userId)

      const scored = windows
        .map(w => ({
          id:             w.id,
          city: {
            id:      w.city_id,
            name:    w.city_name,
            slug:    w.city_slug,
            country: { code: w.country_code, name: w.country_name },
          },
          startDate:      w.start_date,
          endDate:        w.end_date,
          eventCount:     w.event_count,
          affinityScore:  userId ? personalizedScore(w, affinities) : w.affinity_score,
          densityProfile: w.density_profile,
          daysUntil:      Math.ceil(
            (new Date(w.start_date + 'T00:00:00Z').getTime() - today.getTime()) / 86_400_000,
          ),
        }))
        .sort((a, b) => b.affinityScore - a.affinityScore)

      return reply.send({ windows: scored })
    },
  )

  // POST /admin/recompute-windows — dev-only manual trigger
  app.post(
    '/admin/recompute-windows',
    { preHandler: authenticateOptional },
    async (req, reply) => {
      if (process.env.NODE_ENV === 'production') {
        return reply.status(403).send({ error: 'Not available in production' })
      }
      console.log('[admin] manual window recompute triggered')
      // Run async — don't await, respond immediately
      computeWindows().catch(err => console.error('[admin] recompute failed', err))
      return reply.send({ status: 'recompute started' })
    },
  )
}
