-- Stores Spotify OAuth tokens per user.
-- user_id is a TEXT Clerk ID (e.g. "user_2Nz...") — consistent with user_artist_affinities.
CREATE TABLE spotify_connections (
  user_id           TEXT        PRIMARY KEY,
  access_token      TEXT        NOT NULL,
  refresh_token     TEXT        NOT NULL,
  token_expires_at  TIMESTAMPTZ NOT NULL,
  scopes            TEXT[]      NOT NULL DEFAULT '{}',
  connected_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_synced_at    TIMESTAMPTZ
);
