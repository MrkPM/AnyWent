-- Per-user artist affinity weights.
-- weight: 0.0–1.0; manual follows default to 1.0.
-- source tracks where the affinity came from so we can weight or filter by origin later.
CREATE TABLE user_artist_affinities (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    TEXT        NOT NULL,
  artist_id  UUID        NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  weight     NUMERIC(3,2) NOT NULL DEFAULT 1.00 CHECK (weight >= 0 AND weight <= 1),
  source     TEXT        NOT NULL DEFAULT 'manual'
             CHECK (source IN ('manual', 'spotify', 'soundcloud', 'youtube_music')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, artist_id)
);

CREATE INDEX user_artist_affinities_user_id_idx ON user_artist_affinities (user_id);
