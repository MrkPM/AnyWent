import { sql } from '../client.js'

export interface EventRow {
  id: string
  title: string
  type: string
  starts_at: string
  ends_at: string | null
  source: string
  source_url: string
  ticket_url: string | null
  image_url: string | null
  time_known: boolean
  venue_id: string
  venue_name: string
  venue_slug: string
  venue_type: string
  artists: Array<{
    id: string
    name: string
    role: string | null
    order: number | null
  }>
}

export async function getEventsByCity(
  cityId: string,
  from: string,
  to: string
): Promise<EventRow[]> {
  return sql<EventRow[]>`
    SELECT
      e.id,
      e.title,
      e.type,
      e.starts_at,
      e.ends_at,
      e.source,
      e.source_url,
      e.ticket_url,
      e.image_url,
      e.time_known,
      v.id   AS venue_id,
      v.name AS venue_name,
      v.slug AS venue_slug,
      v.type AS venue_type,
      COALESCE(
        json_agg(
          json_build_object(
            'id',    a.id,
            'name',  a.name,
            'role',  ea.role,
            'order', ea.order
          ) ORDER BY ea.order NULLS LAST
        ) FILTER (WHERE a.id IS NOT NULL),
        '[]'
      ) AS artists
    FROM events e
    JOIN venues v ON v.id = e.venue_id
    LEFT JOIN event_artists ea ON ea.event_id = e.id
    LEFT JOIN artists a ON a.id = ea.artist_id
    WHERE v.city_id = ${cityId}
      AND e.starts_at < ${to}::timestamptz + interval '1 day'
      AND COALESCE(e.ends_at, e.starts_at) >= ${from}::timestamptz
    GROUP BY e.id, v.id
    ORDER BY e.starts_at ASC
  `
}

export async function getEventById(id: string): Promise<EventRow | null> {
  const rows = await sql<EventRow[]>`
    SELECT
      e.id,
      e.title,
      e.type,
      e.starts_at,
      e.ends_at,
      e.source,
      e.source_url,
      e.ticket_url,
      e.image_url,
      e.time_known,
      v.id   AS venue_id,
      v.name AS venue_name,
      v.slug AS venue_slug,
      v.type AS venue_type,
      COALESCE(
        json_agg(
          json_build_object(
            'id',    a.id,
            'name',  a.name,
            'role',  ea.role,
            'order', ea.order
          ) ORDER BY ea.order NULLS LAST
        ) FILTER (WHERE a.id IS NOT NULL),
        '[]'
      ) AS artists
    FROM events e
    JOIN venues v ON v.id = e.venue_id
    LEFT JOIN event_artists ea ON ea.event_id = e.id
    LEFT JOIN artists a ON a.id = ea.artist_id
    WHERE e.id = ${id}
    GROUP BY e.id, v.id
    LIMIT 1
  `
  return rows[0] ?? null
}
