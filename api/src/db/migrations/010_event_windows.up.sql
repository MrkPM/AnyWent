CREATE TABLE event_windows (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id          UUID        NOT NULL REFERENCES cities(id),
  start_date       DATE        NOT NULL,
  end_date         DATE        NOT NULL,
  event_count      INT         NOT NULL DEFAULT 0,
  affinity_score   FLOAT       NOT NULL DEFAULT 0,  -- baseline: event_count * 0.1
  top_artist_ids   UUID[]      NOT NULL DEFAULT '{}',
  density_profile  SMALLINT[]  NOT NULL DEFAULT '{}',
  computed_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (city_id, start_date, end_date)
);

CREATE INDEX idx_event_windows_city  ON event_windows (city_id);
CREATE INDEX idx_event_windows_score ON event_windows (affinity_score DESC);
CREATE INDEX idx_event_windows_start ON event_windows (start_date);
