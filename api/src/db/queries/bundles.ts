import { sql } from '../client.js'

// One row per top event per city — assembled into ApiBundle by the route handler.
// Cities with no events in the date range are omitted.
export interface BundleQueryRow {
  city_id:    string
  city_name:  string
  city_slug:  string
  event_count: number
  bundle_score: number
  // Null when a city has no events (shouldn't happen; guarded in assembly)
  event_id:            string | null
  event_title:         string | null
  event_starts_at:     string | null
  event_image_url:     string | null
  event_time_known:    boolean | null
  event_affinity_score: number | null
  event_source_url:    string | null
  event_ticket_url:    string | null
  venue_name:          string | null
}

// userId: when provided, events are scored by the user's artist affinities.
// When null, all events score 0.1 baseline — bundles still ranked by event density.
export async function getBundlesByDateRange(
  from:   string,
  to:     string,
  userId: string | null,
): Promise<BundleQueryRow[]> {
  return sql<BundleQueryRow[]>`
    WITH user_affinities AS (
      SELECT artist_id, weight
      FROM   user_artist_affinities
      WHERE  user_id = ${userId}
    ),
    source_priority AS (
      SELECT id,
        CASE source WHEN 'ra' THEN 1 WHEN 'dice' THEN 2 WHEN 'songkick' THEN 3 ELSE 4 END AS priority
      FROM events
    ),
    duplicate_pairs AS (
      SELECT DISTINCT ea_high.event_id AS canonical_id, ea_low.event_id AS duplicate_id
      FROM   event_artists ea_high
      JOIN   event_artists ea_low    ON  ea_low.artist_id  = ea_high.artist_id
                                     AND ea_low.event_id   != ea_high.event_id
      JOIN   events  e_high          ON  e_high.id  = ea_high.event_id
      JOIN   events  e_low           ON  e_low.id   = ea_low.event_id
      JOIN   venues  v_high          ON  v_high.id  = e_high.venue_id
      JOIN   venues  v_low           ON  v_low.id   = e_low.venue_id
      JOIN   source_priority sp_high ON  sp_high.id = ea_high.event_id
      JOIN   source_priority sp_low  ON  sp_low.id  = ea_low.event_id
      WHERE  v_high.city_id = v_low.city_id
        AND  DATE(e_high.starts_at) = DATE(e_low.starts_at)
        AND  sp_high.priority < sp_low.priority
    ),
    hidden_events AS (
      SELECT DISTINCT duplicate_id AS id FROM duplicate_pairs
    ),
    event_scores AS (
      SELECT
        e.id,
        e.title,
        e.starts_at,
        e.image_url,
        e.time_known,
        e.source_url,
        e.ticket_url,
        v.id   AS venue_id,
        v.name AS venue_name,
        v.city_id,
        GREATEST(COALESCE(SUM(ua.weight), 0), 0.1) AS affinity_score
      FROM   events e
      JOIN   venues v         ON v.id        = e.venue_id
      LEFT JOIN event_artists ea ON ea.event_id = e.id
      LEFT JOIN user_affinities ua ON ua.artist_id = ea.artist_id
      WHERE  e.starts_at <  ${to}::timestamptz + interval '1 day'
        AND  COALESCE(e.ends_at, e.starts_at) >= ${from}::timestamptz
        AND  e.id NOT IN (SELECT id FROM hidden_events)
      GROUP BY e.id, v.id
    ),
    bundle_stats AS (
      SELECT
        city_id,
        COUNT(*)::int          AS event_count,
        AVG(affinity_score)::float AS bundle_score
      FROM event_scores
      GROUP BY city_id
    ),
    ranked_events AS (
      SELECT *,
        ROW_NUMBER() OVER (
          PARTITION BY city_id
          ORDER BY affinity_score DESC, starts_at ASC
        ) AS event_rank
      FROM event_scores
    )
    SELECT
      c.id   AS city_id,
      c.name AS city_name,
      c.slug AS city_slug,
      bs.event_count,
      bs.bundle_score,
      re.id             AS event_id,
      re.title          AS event_title,
      re.starts_at      AS event_starts_at,
      re.image_url      AS event_image_url,
      re.time_known     AS event_time_known,
      re.affinity_score AS event_affinity_score,
      re.source_url     AS event_source_url,
      re.ticket_url     AS event_ticket_url,
      re.venue_name
    FROM   bundle_stats bs
    JOIN   cities c       ON c.id = bs.city_id
    LEFT JOIN ranked_events re ON re.city_id = bs.city_id AND re.event_rank <= 3
    ORDER BY bs.bundle_score DESC, c.name ASC, re.event_rank ASC NULLS LAST
  `
}
