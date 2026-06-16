import { sql } from '../client.js'

export interface ClusterQueryRow {
  city_id:             string
  city_name:           string
  city_slug:           string
  city_country_code:   string
  event_count:         number
  matched_event_count: number
  cluster_score:       number
  total_artist_count:  number
  days:                Array<{ date: string; score: number; matchedCount: number; eventCount: number }> | null
  matched_artists:     Array<{ name: string; slug: string }> | null
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

// cluster_score = SUM of actual matched affinity weights (no 0.1 baseline floor).
// Events with no artist match contribute 0 to the score, so the score purely reflects taste.
// userId null → all events score 0, cluster_score = 0 for all cities (unauthenticated).
export async function getClustersByDateRange(
  from:   string,
  to:     string,
  userId: string | null,
): Promise<ClusterQueryRow[]> {
  return sql<ClusterQueryRow[]>`
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
        COALESCE(SUM(ua.weight), 0)                       AS raw_affinity,
        GREATEST(COALESCE(SUM(ua.weight), 0), 0.1)        AS affinity_score
      FROM   events e
      JOIN   venues v            ON v.id        = e.venue_id
      LEFT JOIN event_artists ea ON ea.event_id = e.id
      LEFT JOIN user_affinities ua ON ua.artist_id = ea.artist_id
      WHERE  e.starts_at <  ${to}::timestamptz + interval '1 day'
        AND  COALESCE(e.ends_at, e.starts_at) >= ${from}::timestamptz
        AND  e.id NOT IN (SELECT id FROM hidden_events)
      GROUP BY e.id, v.id
    ),
    cluster_stats AS (
      SELECT
        city_id,
        COUNT(*)::int                                    AS event_count,
        COUNT(*) FILTER (WHERE raw_affinity > 0)::int   AS matched_event_count,
        SUM(raw_affinity)::float                         AS cluster_score
      FROM event_scores
      GROUP BY city_id
    ),
    city_day_stats AS (
      SELECT
        city_id,
        json_agg(
          json_build_object(
            'date',         event_date::text,
            'score',        day_score,
            'matchedCount', day_matched_count,
            'eventCount',   day_event_count
          ) ORDER BY event_date
        ) AS days
      FROM (
        SELECT
          city_id,
          DATE(starts_at)                                      AS event_date,
          SUM(raw_affinity)::float                             AS day_score,
          COUNT(*) FILTER (WHERE raw_affinity > 0)::int        AS day_matched_count,
          COUNT(*)::int                                        AS day_event_count
        FROM event_scores
        GROUP BY city_id, DATE(starts_at)
      ) d
      GROUP BY city_id
    ),
    city_artist_counts AS (
      SELECT
        v.city_id,
        COUNT(DISTINCT ea.artist_id)::int AS total_artist_count
      FROM   event_artists ea
      JOIN   events e  ON e.id  = ea.event_id
      JOIN   venues v  ON v.id  = e.venue_id
      WHERE  e.starts_at < ${to}::timestamptz + interval '1 day'
        AND  COALESCE(e.ends_at, e.starts_at) >= ${from}::timestamptz
        AND  e.id NOT IN (SELECT id FROM hidden_events)
      GROUP  BY v.city_id
    ),
    cluster_matched_artists AS (
      SELECT
        ranked.city_id,
        json_agg(
          json_build_object('name', a.name, 'slug', a.slug)
          ORDER BY ranked.artist_total_weight DESC
        ) AS matched_artists
      FROM (
        SELECT
          es.city_id,
          ea.artist_id,
          SUM(ua.weight) AS artist_total_weight
        FROM   event_scores es
        JOIN   event_artists ea  ON ea.event_id  = es.id
        JOIN   user_affinities ua ON ua.artist_id = ea.artist_id
        WHERE  es.raw_affinity > 0
        GROUP  BY es.city_id, ea.artist_id
      ) ranked
      JOIN artists a ON a.id = ranked.artist_id
      GROUP BY ranked.city_id
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
      c.id      AS city_id,
      c.name    AS city_name,
      c.slug    AS city_slug,
      co.code   AS city_country_code,
      cs.event_count,
      cs.matched_event_count,
      cs.cluster_score,
      COALESCE(cac.total_artist_count, 0) AS total_artist_count,
      cds.days,
      cma.matched_artists,
      re.id             AS event_id,
      re.title          AS event_title,
      re.starts_at      AS event_starts_at,
      re.image_url      AS event_image_url,
      re.time_known     AS event_time_known,
      re.affinity_score AS event_affinity_score,
      re.source_url     AS event_source_url,
      re.ticket_url     AS event_ticket_url,
      re.venue_name
    FROM   cluster_stats cs
    JOIN   cities c              ON c.id  = cs.city_id
    JOIN   regions r             ON r.id  = c.region_id
    JOIN   countries co          ON co.id = r.country_id
    LEFT JOIN city_artist_counts cac    ON cac.city_id = cs.city_id
    LEFT JOIN city_day_stats cds        ON cds.city_id = cs.city_id
    LEFT JOIN cluster_matched_artists cma ON cma.city_id = cs.city_id
    LEFT JOIN ranked_events re          ON re.city_id  = cs.city_id AND re.event_rank <= 3
    ORDER BY cs.cluster_score DESC, c.name ASC, re.event_rank ASC NULLS LAST
  `
}
