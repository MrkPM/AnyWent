import { sql } from '../client.js'

export interface EventRow {
  id:             string
  title:          string
  type:           string
  starts_at:      string
  ends_at:        string | null
  source:         string
  source_url:     string
  ticket_url:     string | null
  image_url:      string | null
  time_known:     boolean
  affinity_score: number
  venue_id:       string
  venue_name:     string
  venue_slug:     string
  venue_type:     string
  artists: Array<{
    id:    string
    name:  string
    role:  string | null
    order: number | null
  }>
  // All sources that list this event (own + enriched from deduplicated duplicates).
  // Optional: getEventById omits it; toApiEvent falls back to a single-item array.
  sources?: Array<{ source: string; sourceUrl: string; ticketUrl: string | null }>
}

// userId: when provided, events are scored by the user's artist affinities and sorted
// by score DESC within each calendar date. When null, all events score 0.1 and sort
// chronologically — the same order as before ranking was added.
export async function getEventsByCity(
  cityId: string,
  from:   string,
  to:     string,
  userId: string | null = null,
): Promise<EventRow[]> {
  return sql<EventRow[]>`
    WITH user_affinities AS (
      SELECT artist_id, weight
      FROM   user_artist_affinities
      WHERE  user_id = ${userId}
    ),
    -- Source priority: lower number = preferred. RA is authoritative for electronic music.
    -- When adding a new scraper: assign it a priority here and in EventCard SOURCE_LABELS.
    source_priority AS (
      SELECT id,
        CASE source WHEN 'ra' THEN 1 WHEN 'dice' THEN 2 WHEN 'songkick' THEN 3 ELSE 4 END AS priority
      FROM events
    ),
    -- Canonical → duplicate pairs: same artist, same day, same city, lower-priority source.
    -- Canonical is kept; duplicate is hidden but its source info is merged into the canonical card.
    duplicate_pairs AS (
      SELECT DISTINCT ea_high.event_id AS canonical_id, ea_low.event_id AS duplicate_id
      FROM   event_artists ea_high
      JOIN   event_artists ea_low   ON  ea_low.artist_id  = ea_high.artist_id
                                    AND ea_low.event_id   != ea_high.event_id
      JOIN   events  e_high         ON  e_high.id  = ea_high.event_id
      JOIN   events  e_low          ON  e_low.id   = ea_low.event_id
      JOIN   venues  v_high         ON  v_high.id  = e_high.venue_id
      JOIN   venues  v_low          ON  v_low.id   = e_low.venue_id
      JOIN   source_priority sp_high ON sp_high.id = ea_high.event_id
      JOIN   source_priority sp_low  ON sp_low.id  = ea_low.event_id
      WHERE  v_high.city_id = ${cityId}
        AND  v_low.city_id  = ${cityId}
        AND  DATE(e_high.starts_at) = DATE(e_low.starts_at)
        AND  sp_high.priority < sp_low.priority
    ),
    hidden_events AS (
      SELECT DISTINCT duplicate_id AS id FROM duplicate_pairs
    ),
    -- For each canonical, aggregate source info + enrichment fields from its duplicates.
    dup_enrichment AS (
      SELECT
        dp.canonical_id AS event_id,
        jsonb_agg(
          jsonb_build_object(
            'source',    e_d.source,
            'sourceUrl', e_d.source_url,
            'ticketUrl', e_d.ticket_url
          ) ORDER BY sp.priority
        )                                                                          AS dup_sources,
        MIN(e_d.ticket_url) FILTER (WHERE e_d.ticket_url IS NOT NULL)             AS dup_ticket_url,
        MIN(e_d.image_url)  FILTER (WHERE e_d.image_url  IS NOT NULL)             AS dup_image_url
      FROM   duplicate_pairs dp
      JOIN   events e_d          ON e_d.id  = dp.duplicate_id
      JOIN   source_priority sp  ON sp.id   = dp.duplicate_id
      GROUP  BY dp.canonical_id
    )
    SELECT
      e.id,
      e.title,
      e.type,
      e.starts_at,
      e.ends_at,
      e.source,
      e.source_url,
      COALESCE(e.ticket_url, de.dup_ticket_url)  AS ticket_url,
      COALESCE(e.image_url,  de.dup_image_url)   AS image_url,
      e.time_known,
      GREATEST(COALESCE(SUM(ua.weight), 0), 0.1) AS affinity_score,
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
      ) AS artists,
      -- Own source always first, then any duplicate sources ordered by priority
      jsonb_build_array(
        jsonb_build_object('source', e.source, 'sourceUrl', e.source_url, 'ticketUrl', e.ticket_url)
      ) || COALESCE(de.dup_sources, '[]'::jsonb) AS sources
    FROM       events e
    JOIN       venues v            ON v.id          = e.venue_id
    LEFT JOIN  event_artists ea    ON ea.event_id   = e.id
    LEFT JOIN  artists a           ON a.id          = ea.artist_id
    LEFT JOIN  user_affinities ua  ON ua.artist_id  = ea.artist_id
    LEFT JOIN  dup_enrichment de   ON de.event_id   = e.id
    WHERE  v.city_id = ${cityId}
      AND  e.starts_at < ${to}::timestamptz + interval '1 day'
      AND  COALESCE(e.ends_at, e.starts_at) >= ${from}::timestamptz
      AND  e.id NOT IN (SELECT id FROM hidden_events)
    GROUP BY e.id, v.id, de.event_id, de.dup_sources, de.dup_ticket_url, de.dup_image_url
    ORDER BY DATE(e.starts_at) ASC, affinity_score DESC, e.starts_at ASC
  `
}

export async function getEventById(id: string): Promise<EventRow | null> {
  const rows = await sql<EventRow[]>`
    WITH source_priority AS (
      SELECT id,
        CASE source WHEN 'ra' THEN 1 WHEN 'dice' THEN 2 WHEN 'songkick' THEN 3 ELSE 4 END AS priority
      FROM events
    ),
    -- Find duplicates of this specific event (same artist, same day, same city, lower priority)
    dup_enrichment AS (
      SELECT
        jsonb_agg(
          jsonb_build_object('source', e_d.source, 'sourceUrl', e_d.source_url, 'ticketUrl', e_d.ticket_url)
          ORDER BY sp_d.priority
        )                                                               AS dup_sources,
        MIN(e_d.ticket_url) FILTER (WHERE e_d.ticket_url IS NOT NULL)  AS dup_ticket_url,
        MIN(e_d.image_url)  FILTER (WHERE e_d.image_url  IS NOT NULL)  AS dup_image_url
      FROM   event_artists ea_this
      JOIN   event_artists ea_dup   ON  ea_dup.artist_id = ea_this.artist_id
                                    AND ea_dup.event_id  != ea_this.event_id
      JOIN   events  e_this         ON  e_this.id  = ea_this.event_id
      JOIN   events  e_d            ON  e_d.id     = ea_dup.event_id
      JOIN   venues  v_this         ON  v_this.id  = e_this.venue_id
      JOIN   venues  v_d            ON  v_d.id     = e_d.venue_id
      JOIN   source_priority sp_this ON sp_this.id = ea_this.event_id
      JOIN   source_priority sp_d    ON sp_d.id    = ea_dup.event_id
      WHERE  ea_this.event_id = ${id}
        AND  v_d.city_id      = v_this.city_id
        AND  DATE(e_d.starts_at) = DATE(e_this.starts_at)
        AND  sp_d.priority > sp_this.priority
    )
    SELECT
      e.id,
      e.title,
      e.type,
      e.starts_at,
      e.ends_at,
      e.source,
      e.source_url,
      COALESCE(e.ticket_url, de.dup_ticket_url) AS ticket_url,
      COALESCE(e.image_url,  de.dup_image_url)  AS image_url,
      e.time_known,
      0.1::numeric AS affinity_score,
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
      ) AS artists,
      jsonb_build_array(
        jsonb_build_object('source', e.source, 'sourceUrl', e.source_url, 'ticketUrl', e.ticket_url)
      ) || COALESCE(de.dup_sources, '[]'::jsonb) AS sources
    FROM       events e
    JOIN       venues v         ON v.id        = e.venue_id
    LEFT JOIN  event_artists ea ON ea.event_id = e.id
    LEFT JOIN  artists a        ON a.id        = ea.artist_id
    LEFT JOIN  dup_enrichment de ON true
    WHERE e.id = ${id}
    GROUP BY e.id, v.id, de.dup_sources, de.dup_ticket_url, de.dup_image_url
    LIMIT 1
  `
  return rows[0] ?? null
}
