# AnyWent — Data Model

## Design Principles

- **Global layer**: venues, events, artists, cities — shared across all users, pipeline-fed
- **Per-user layer**: taste profile, attendance history, affinity weights, saved events — private, never shared
- **Geography hierarchy**: country → region → city → venue, queryable at any level
- **Source tracking**: every event record knows where it came from and when it was last verified

---

## Global Layer

### `countries`
```sql
id              uuid primary key
name            text not null           -- "Germany"
code            varchar(2) not null     -- "DE" (ISO 3166-1 alpha-2)
```

### `regions`
```sql
id              uuid primary key
country_id      uuid references countries(id)
name            text not null           -- "Oberösterreich", "Île-de-France"
local_name      text                    -- original language name if different
slug            text not null           -- "oberosterreich", "ile-de-france"
```

### `cities`
```sql
id              uuid primary key
region_id       uuid references regions(id)
name            text not null           -- "Berlin"
slug            text not null           -- "berlin"
lat             numeric(9,6)
lng             numeric(9,6)
active          boolean default false   -- only true for cities in scope
```

### `venues`
```sql
id              uuid primary key
city_id         uuid references cities(id)
name            text not null
slug            text not null
type            text not null           -- 'club', 'concert_hall', 'museum', 'gallery', 'festival_site', 'other'
address         text
lat             numeric(9,6)
lng             numeric(9,6)
website_url     text
source_ids      jsonb                   -- {"ra": "fabric", "dice": "123", "songkick": "456"}
newsletter_email text                   -- if venue sends email digest, the inbox it routes to
active          boolean default true
created_at      timestamptz default now()
```

### `artists`
```sql
id              uuid primary key
name            text not null
slug            text not null
genres          text[]                  -- ["techno", "melodic house"]
source_ids      jsonb                   -- {"ra": "solomun", "songkick": "789", "spotify": "abc"}
image_url       text
created_at      timestamptz default now()
```

### `events`
```sql
id              uuid primary key
venue_id        uuid references venues(id)
title           text not null
type            text not null           -- 'club_night', 'concert', 'exhibition', 'festival', 'opening', 'other'
starts_at       timestamptz not null
ends_at         timestamptz             -- null for single-night events
is_multi_day    boolean default false   -- true for exhibitions
source          text not null           -- 'ra', 'songkick', 'dice', 'email', 'manual'
source_url      text not null           -- original posting URL, always preserved
ticket_url      text                    -- may differ from source_url
affiliate_url   text                    -- populated post-MVP
raw_data        jsonb                   -- original scraped payload, for debugging
verified_at     timestamptz             -- last time this event was confirmed still live
created_at      timestamptz default now()
updated_at      timestamptz default now()
```

### `event_artists`
```sql
event_id        uuid references events(id)
artist_id       uuid references artists(id)
role            text                    -- 'headliner', 'support', 'b2b', 'curator', 'exhibiting'
order           integer                 -- billing order on lineup
primary key (event_id, artist_id)
```

---

## Per-User Layer

### `users`
```sql
id              uuid primary key        -- matches Clerk user id
email           text not null unique
display_name    text
created_at      timestamptz default now()
```
Note: authentication is handled by Clerk. This table stores AnyWent-specific user data only.

### `user_connected_accounts`
```sql
id              uuid primary key
user_id         uuid references users(id)
provider        text not null           -- 'spotify', 'apple_music', 'youtube_music'
access_token    text                    -- encrypted at rest
refresh_token   text                    -- encrypted at rest
scopes          text[]
connected_at    timestamptz default now()
last_synced_at  timestamptz
```
Note: Spotify connection is for taste enrichment only, not for login/auth.

### `user_artist_affinity`
```sql
user_id         uuid references users(id)
artist_id       uuid references artists(id)
weight          numeric(4,3) not null   -- 0.0 to 1.0
source          text not null           -- 'spotify_follow', 'spotify_top', 'manual', 'attendance'
created_at      timestamptz default now()
updated_at      timestamptz default now()
primary key (user_id, artist_id)
```

### `user_venue_affinity`
```sql
user_id         uuid references users(id)
venue_id        uuid references venues(id)
weight          numeric(4,3) not null   -- 0.0 to 1.0
source          text not null           -- 'manual', 'attendance'
primary key (user_id, venue_id)
```

### `user_attendance`
```sql
id              uuid primary key
user_id         uuid references users(id)
event_id        uuid references events(id)  -- null if event not in DB
venue_id        uuid references venues(id)  -- denormalised for convenience
attended_at     date not null
liked           boolean                     -- null = not rated, true = liked, false = didn't like
notes           text
created_at      timestamptz default now()
```
Note: When a liked attendance is recorded, a background job updates `user_artist_affinity`
for all artists on the event lineup (headliner: +0.4, support: +0.15, same bill: +0.05).
This is the co-occurrence affinity model — deferred to v2 but schema supports it from day one.

### `user_saved_events`
```sql
user_id         uuid references users(id)
event_id        uuid references events(id)
saved_at        timestamptz default now()
primary key (user_id, event_id)
```

---

## Query Model (Conceptual)

### Discovery mode
Input: `user_id`, `date_range`, optional `region/country filter`
Output: ranked list of `(city, weekend, events[])` bundles

Ranking signal:
1. Sum of affinity weights for matched artists across all events in the bundle
2. Uniqueness bonus — artist only appearing in one city that weekend
3. Bundle density bonus — events spread across the weekend (not all same night)
4. Category diversity bonus — mix of club + concert + culture (if user has cross-category affinity)

### City mode
Input: `user_id`, `city_id or region_id`, `date_range`
Output: all events in scope, sorted by affinity weight desc, then date asc

---

## Notes

- `events.raw_data` preserves the original scraper payload — useful for debugging and re-parsing
- `events.verified_at` is updated each time a scraper confirms the event still exists — stale events (not verified in 7 days for club nights, 30 days for exhibitions) are flagged
- The affinity co-occurrence model (attendance → artist weights) is designed in but not activated until v2
- `source_ids` on venues and artists is a jsonb map — allows the same venue to have different IDs across RA, Dice, Songkick without a separate join table
