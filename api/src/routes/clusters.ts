import type { FastifyInstance } from 'fastify'
import { authenticateOptional } from '../middleware/auth.js'
import { getClustersByDateRange, type ClusterQueryRow } from '../db/queries/clusters.js'

// ── Window generation ────────────────────────────────────────────────────────
// Thu–Mon windows. If today is within a window (Thu–Mon), include the current one.
// If today is Tue or Wed the current window has ended; start from next Thursday.

function upcomingClusters(count: number): Array<{ from: string; to: string }> {
  const now = new Date()
  const dow = now.getUTCDay() // 0=Sun … 6=Sat

  // Days since last Thursday (Thu=0, Fri=1, Sat=2, Sun=3, Mon=4, Tue=5, Wed=6)
  const daysSinceThu = (dow + 3) % 7
  // If still within the window (0–4 = Thu–Mon), go back to that Thursday.
  // If the window has ended (5–6 = Tue–Wed), jump forward to next Thursday.
  const startOffset = daysSinceThu <= 4 ? -daysSinceThu : 7 - daysSinceThu

  const windows: Array<{ from: string; to: string }> = []
  for (let i = 0; i < count; i++) {
    const thu = new Date(now)
    thu.setUTCDate(now.getUTCDate() + startOffset + i * 7)
    const mon = new Date(thu)
    mon.setUTCDate(thu.getUTCDate() + 4)
    windows.push({
      from: thu.toISOString().slice(0, 10),
      to:   mon.toISOString().slice(0, 10),
    })
  }
  return windows
}

// ── Assembly ─────────────────────────────────────────────────────────────────

interface ClusterTopEvent {
  id:            string
  title:         string
  startsAt:      string
  imageUrl:      string | null
  timeKnown:     boolean
  affinityScore: number
  ticketUrl:     string | null
  sourceUrl:     string
  venue:         { name: string }
}

export interface ApiCluster {
  city:              { id: string; name: string; slug: string; country: string }
  from:              string
  to:                string
  clusterScore:      number
  eventCount:        number
  matchedEventCount: number
  topEvents:         ClusterTopEvent[]
}

function assembleClusters(
  rows: ClusterQueryRow[],
  from: string,
  to: string,
): ApiCluster[] {
  const cityMap = new Map<string, ClusterQueryRow[]>()
  for (const row of rows) {
    if (!cityMap.has(row.city_id)) cityMap.set(row.city_id, [])
    cityMap.get(row.city_id)!.push(row)
  }

  return [...cityMap.values()].map(cityRows => {
    const first = cityRows[0]
    return {
      city: {
        id:      first.city_id,
        name:    first.city_name,
        slug:    first.city_slug,
        country: first.city_country_code,
      },
      from,
      to,
      clusterScore:      Number(first.cluster_score),
      eventCount:        first.event_count,
      matchedEventCount: first.matched_event_count,
      topEvents: cityRows
        .filter(r => r.event_id !== null)
        .map(r => ({
          id:            r.event_id!,
          title:         r.event_title!,
          startsAt:      r.event_starts_at!,
          imageUrl:      r.event_image_url,
          timeKnown:     r.event_time_known!,
          affinityScore: Number(r.event_affinity_score),
          ticketUrl:     r.event_ticket_url,
          sourceUrl:     r.event_source_url!,
          venue:         { name: r.venue_name! },
        })),
    }
  })
}

// ── Route ────────────────────────────────────────────────────────────────────

export async function clusterRoutes(app: FastifyInstance) {
  // GET /clusters?weeks=8
  // Returns upcoming Thu–Mon windows with cities ranked by total affinity (cluster score).
  // Flat sorted list across all windows — highest score first.
  app.get<{ Querystring: { weeks?: string } }>(
    '/clusters',
    { preHandler: authenticateOptional },
    async (req, reply) => {
      const weeks  = Math.min(Math.max(parseInt(req.query.weeks ?? '8', 10) || 8, 1), 12)
      const userId = req.user?.id ?? null

      const windows = upcomingClusters(weeks)

      const results = await Promise.all(
        windows.map(async ({ from, to }) => {
          const rows = await getClustersByDateRange(from, to, userId)
          return assembleClusters(rows, from, to)
        }),
      )

      // Flatten all city+window combos into one list, sorted by clusterScore DESC
      const clusters = results
        .flat()
        .filter(c => c.eventCount > 0)
        .sort((a, b) => b.clusterScore - a.clusterScore)

      return reply.send({ clusters })
    },
  )
}
