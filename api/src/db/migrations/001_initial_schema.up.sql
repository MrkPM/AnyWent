-- Migration 001: initial schema
-- Geography, venues, artists, events, and all per-user tables

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -------------------------
-- Geography
-- -------------------------

CREATE TABLE countries (
  id   uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text        NOT NULL,
  code varchar(2)  NOT NULL UNIQUE  -- ISO 3166-1 alpha-2
);

CREATE TABLE regions (
  id          uuid  PRIMARY KEY DEFAULT uuid_generate_v4(),
  country_id  uuid  NOT NULL REFERENCES countries(id),
  name        text  NOT NULL,
  local_name  text,
  slug        text  NOT NULL,
  UNIQUE (country_id, slug)
);

CREATE TABLE cities (
  id         uuid          PRIMARY KEY DEFAULT uuid_generate_v4(),
  region_id  uuid          NOT NULL REFERENCES regions(id),
  name       text          NOT NULL,
  slug       text          NOT NULL UNIQUE,
  lat        numeric(9,6),
  lng        numeric(9,6),
  active     boolean       DEFAULT false
);

-- -------------------------
-- Venues
-- -------------------------

CREATE TABLE venues (
  id               uuid     PRIMARY KEY DEFAULT uuid_generate_v4(),
  city_id          uuid     NOT NULL REFERENCES cities(id),
  name             text     NOT NULL,
  slug             text     NOT NULL,
  type             text     NOT NULL CHECK (type IN ('club', 'concert_hall', 'museum', 'gallery', 'festival_site', 'other')),
  address          text,
  lat              numeric(9,6),
  lng              numeric(9,6),
  website_url      text,
  source_ids       jsonb    DEFAULT '{}',
  newsletter_email text,
  active           boolean  DEFAULT true,
  created_at       timestamptz DEFAULT now(),
  UNIQUE (city_id, slug)
);

-- -------------------------
-- Artists
-- -------------------------

CREATE TABLE artists (
  id         uuid     PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       text     NOT NULL,
  slug       text     NOT NULL UNIQUE,
  genres     text[]   DEFAULT '{}',
  source_ids jsonb    DEFAULT '{}',
  image_url  text,
  created_at timestamptz DEFAULT now()
);

-- -------------------------
-- Events
-- -------------------------

CREATE TABLE events (
  id           uuid     PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id     uuid     NOT NULL REFERENCES venues(id),
  title        text     NOT NULL,
  type         text     NOT NULL CHECK (type IN ('club_night', 'concert', 'exhibition', 'festival', 'opening', 'other')),
  starts_at    timestamptz NOT NULL,
  ends_at      timestamptz,
  is_multi_day boolean  DEFAULT false,
  source       text     NOT NULL CHECK (source IN ('ra', 'songkick', 'dice', 'email', 'manual')),
  source_url   text     NOT NULL,
  ticket_url   text,
  affiliate_url text,
  raw_data     jsonb,
  verified_at  timestamptz,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

CREATE TABLE event_artists (
  event_id   uuid     NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  artist_id  uuid     NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  role       text     CHECK (role IN ('headliner', 'support', 'b2b', 'curator', 'exhibiting')),
  "order"    integer,
  PRIMARY KEY (event_id, artist_id)
);

-- -------------------------
-- Users (auth handled by Clerk — this table is AnyWent-specific data only)
-- -------------------------

CREATE TABLE users (
  id           uuid  PRIMARY KEY,  -- matches Clerk user id
  email        text  NOT NULL UNIQUE,
  display_name text,
  created_at   timestamptz DEFAULT now()
);

CREATE TABLE user_connected_accounts (
  id             uuid  PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        uuid  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider       text  NOT NULL CHECK (provider IN ('spotify', 'apple_music', 'youtube_music')),
  access_token   text,
  refresh_token  text,
  scopes         text[]  DEFAULT '{}',
  connected_at   timestamptz DEFAULT now(),
  last_synced_at timestamptz,
  UNIQUE (user_id, provider)
);

CREATE TABLE user_artist_affinity (
  user_id    uuid           NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  artist_id  uuid           NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  weight     numeric(4,3)   NOT NULL CHECK (weight >= 0 AND weight <= 1),
  source     text           NOT NULL CHECK (source IN ('spotify_follow', 'spotify_top', 'manual', 'attendance')),
  created_at timestamptz    DEFAULT now(),
  updated_at timestamptz    DEFAULT now(),
  PRIMARY KEY (user_id, artist_id)
);

CREATE TABLE user_venue_affinity (
  user_id   uuid          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  venue_id  uuid          NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  weight    numeric(4,3)  NOT NULL CHECK (weight >= 0 AND weight <= 1),
  source    text          NOT NULL CHECK (source IN ('manual', 'attendance')),
  PRIMARY KEY (user_id, venue_id)
);

CREATE TABLE user_attendance (
  id           uuid  PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      uuid  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id     uuid  REFERENCES events(id) ON DELETE SET NULL,
  venue_id     uuid  REFERENCES venues(id) ON DELETE SET NULL,
  attended_at  date  NOT NULL,
  liked        boolean,
  notes        text,
  created_at   timestamptz DEFAULT now()
);

CREATE TABLE user_saved_events (
  user_id   uuid  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id  uuid  NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  saved_at  timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, event_id)
);

-- -------------------------
-- Indexes
-- -------------------------

CREATE INDEX idx_events_starts_at        ON events(starts_at);
CREATE INDEX idx_events_venue_id         ON events(venue_id);
CREATE INDEX idx_events_source           ON events(source);
CREATE INDEX idx_events_verified_at      ON events(verified_at);
CREATE INDEX idx_event_artists_artist_id ON event_artists(artist_id);
CREATE INDEX idx_venues_city_id          ON venues(city_id);
CREATE INDEX idx_cities_active           ON cities(active) WHERE active = true;
CREATE INDEX idx_user_artist_affinity_uid ON user_artist_affinity(user_id);
CREATE INDEX idx_user_attendance_uid     ON user_attendance(user_id);
CREATE INDEX idx_user_attendance_date    ON user_attendance(attended_at);
