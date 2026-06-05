import type { FastifyInstance } from 'fastify'
import { authenticateOptional } from '../middleware/auth.js'
import { getCityBySlug } from '../db/queries/cities.js'
import { getEventsByCity, getEventById } from '../db/queries/events.js'
import type { EventRow } from '../db/queries/events.js'

function toApiEvent(row: EventRow) {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    source: row.source,
    sourceUrl: row.source_url,
    ticketUrl: row.ticket_url,
    imageUrl:      row.image_url,
    timeKnown:     row.time_known,
    affinityScore:   Number(row.affinity_score),
    matchedArtists:  row.matched_artists ?? [],
    venue: {
      id: row.venue_id,
      name: row.venue_name,
      slug: row.venue_slug,
      type: row.venue_type,
    },
    artists: row.artists,
    sources: row.sources ?? [{ source: row.source, sourceUrl: row.source_url, ticketUrl: row.ticket_url }],
  }
}

export async function eventsRoutes(app: FastifyInstance) {
  app.get<{
    Querystring: { citySlug: string; from: string; to: string }
  }>('/events', { preHandler: authenticateOptional }, async (req, reply) => {
    const { citySlug, from, to } = req.query

    if (!citySlug || !from || !to) {
      return reply.status(400).send({ error: 'citySlug, from, and to are required' })
    }

    const city = await getCityBySlug(citySlug)
    if (!city) {
      return reply.status(404).send({ error: 'City not found' })
    }

    const userId = req.user?.id ?? null
    const rows = await getEventsByCity(city.id, from, to, userId)
    return reply.send({ city, events: rows.map(toApiEvent) })
  })

  app.get<{ Params: { id: string } }>('/events/:id', async (req, reply) => {
    const row = await getEventById(req.params.id)
    if (!row) {
      return reply.status(404).send({ error: 'Event not found' })
    }
    return reply.send(toApiEvent(row))
  })
}
