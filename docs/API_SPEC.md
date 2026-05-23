# AnyWent — API Spec

## Principles

- REST, JSON
- All endpoints require auth (Clerk JWT) except where marked public
- All dates: ISO 8601, UTC
- Pagination: cursor-based (`?cursor=` + `?limit=`)
- All event responses include `source_url` — never omit it
- Errors: `{ error: { code: string, message: string } }`

---

## Auth

Handled by Clerk. All protected endpoints expect:
```
Authorization: Bearer <clerk_jwt>
```

The backend validates the JWT with Clerk's SDK and extracts `user_id`.

---

## Endpoints

### Events

#### `GET /events`
Query events. The workhorse endpoint — powers both query modes.

**Query params**
| Param | Type | Description |
|---|---|---|
| `city_id` | uuid | Filter by city |
| `region_id` | uuid | Filter by region (returns all cities in region) |
| `country_id` | uuid | Filter by country |
| `from` | date | Start of date range (inclusive) |
| `to` | date | End of date range (inclusive) |
| `type` | string | `club_night`, `concert`, `exhibition`, `festival`, `opening` |
| `limit` | integer | Default 50, max 200 |
| `cursor` | string | Pagination cursor |

**Response**
```json
{
  "events": [
    {
      "id": "uuid",
      "title": "string",
      "type": "club_night",
      "starts_at": "2025-03-14T22:00:00Z",
      "ends_at": null,
      "is_multi_day": false,
      "venue": {
        "id": "uuid",
        "name": "Berghain",
        "type": "club",
        "city": "Berlin",
        "lat": 52.5111,
        "lng": 13.4408
      },
      "artists": [
        { "id": "uuid", "name": "Solomun", "role": "headliner" },
        { "id": "uuid", "name": "&ME", "role": "support" }
      ],
      "source": "ra",
      "source_url": "https://ra.co/events/12345",
      "ticket_url": "https://...",
      "affinity_score": 0.87
    }
  ],
  "next_cursor": "string or null"
}
```

Note: `affinity_score` is only present when the request is authenticated. It reflects the requesting user's personal taste match for this event.

---

#### `GET /events/bundles`
Discovery mode. Returns ranked city/weekend bundles.

**Query params**
| Param | Type | Description |
|---|---|---|
| `from` | date | Start of window (default: today) |
| `to` | date | End of window (default: +6 weeks) |
| `country_id` | uuid | Optional — limit to a country |
| `limit` | integer | Number of bundles, default 10 |

**Response**
```json
{
  "bundles": [
    {
      "city": { "id": "uuid", "name": "Berlin", "country": "DE" },
      "weekend_start": "2025-03-14",
      "weekend_end": "2025-03-16",
      "score": 3.42,
      "summary": {
        "club_nights": 4,
        "concerts": 2,
        "exhibitions": 3
      },
      "top_events": [ /* 3-5 highlight events, same shape as /events */ ]
    }
  ]
}
```

---

#### `GET /events/:id`
Single event detail.

---

### Geography

#### `GET /cities`
List active cities.

```json
{ "cities": [{ "id": "uuid", "name": "Berlin", "slug": "berlin", "region": "...", "country": "DE" }] }
```

#### `GET /cities/:slug/events`
Convenience alias for `GET /events?city_id=...`

#### `GET /regions`
List regions. Useful for building region-aware search UI.

---

### Venues

#### `GET /venues`
**Query params**: `city_id`, `type`, `q` (name search)

#### `GET /venues/:id`
Venue detail including upcoming events.

---

### Artists

#### `GET /artists`
**Query params**: `q` (name search), `genre`

#### `GET /artists/:id`
Artist detail including upcoming events.

---

### User — Taste Profile

#### `GET /me/profile`
Returns the current user's taste profile.

```json
{
  "user": { "id": "uuid", "display_name": "string" },
  "artist_affinities": [
    { "artist": { "id": "uuid", "name": "Solomun" }, "weight": 1.0, "source": "spotify_top" }
  ],
  "venue_affinities": [
    { "venue": { "id": "uuid", "name": "Fabric" }, "weight": 0.8, "source": "attendance" }
  ],
  "connected_accounts": [
    { "provider": "spotify", "connected_at": "2025-01-01T00:00:00Z", "last_synced_at": "..." }
  ]
}
```

#### `POST /me/artists`
Manually add an artist affinity.
```json
{ "artist_id": "uuid", "weight": 1.0 }
```

#### `DELETE /me/artists/:artist_id`
Remove an artist affinity.

#### `POST /me/venues`
Manually add a venue affinity.

---

### User — Attendance

#### `GET /me/attendance`
List attended events.

#### `POST /me/attendance`
Log an attended event.
```json
{
  "event_id": "uuid",        // optional — if event is in DB
  "venue_id": "uuid",        // required
  "attended_at": "2025-03-14",
  "liked": true,
  "notes": "string"
}
```

When `liked: true`, a background job updates artist affinities for all artists on the event lineup (v2 — schema ready, job deferred).

---

### User — Saved Events

#### `GET /me/saved`
#### `POST /me/saved` — `{ "event_id": "uuid" }`
#### `DELETE /me/saved/:event_id`

---

### Connected Accounts (Spotify)

#### `POST /me/connect/spotify`
Initiates Spotify OAuth flow. Returns redirect URL.
Note: Spotify is connected for taste enrichment only — not for login.

#### `DELETE /me/connect/spotify`
Disconnects Spotify. Derived affinity data is retained unless user explicitly requests deletion.

#### `POST /me/connect/spotify/sync`
Manually trigger a Spotify sync (pull latest followed artists + top artists).

---

## Background Jobs (not HTTP endpoints)

These run async, triggered by events:

- **`jobs/scrape-ra`** — cron, every 6h
- **`jobs/scrape-songkick`** — cron, every 12h
- **`jobs/scrape-dice`** — cron, every 12h
- **`jobs/sync-spotify`** — triggered on connect + manual sync + weekly cron per user
- **`jobs/update-affinity`** — triggered when attendance is logged with `liked: true` (v2)
- **`jobs/flag-stale-events`** — cron, daily
