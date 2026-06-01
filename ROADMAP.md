# AnyWent — Roadmap

Agreed feature sequence. Not a strict sprint plan — order reflects dependencies and value, but items can shift if priorities change.

---

## Shipped (MVP → v0.2.0)

- [x] Event scraping — RA, Songkick, GoOut
- [x] City mode — query events by city + date range
- [x] Taste profile — follow artists
- [x] Affinity ranking — events sorted by artist affinity within date groups (MVP weights: follow = 1.0, baseline = 0.1 — intentionally simple, designed to extend)
- [x] Auth — Clerk, sign up / sign in
- [x] Discovery API — `GET /bundles` (live, weekend-aligned) + `GET /windows` (pre-computed, sliding 4-day windows, density profile, baseline scoring + read-time personalisation)

---

## Next

### 1. Discovery UI
Frontend for the windows/bundles data — the discovery screen.
API is ready; awaiting UI design decisions from Claude.ai conversation.

### 2. Venue following
Follow venues (same pattern as artist following).
Weight: 0.6 added to event score when venue is followed.
Small migration + UI addition — `user_venue_affinities` table, venue search on Taste page.

### 3. Genre / style following
Follow genres (electronic, jazz, classical, etc.).
Weight: 0.4 added to event score when event genre matches.
Requires genre data to be populated on artists/events — check scraper coverage first.

### 4. Spotify taste seeding
Connect Spotify on first sign-in → auto-follow artists from liked tracks / top artists.
Bootstraps the taste profile without manual search.
Commercial use confirmed as acceptable (Bandsintown precedent).

---

## v2

### 5. Co-occurrence recommendations
"Users who follow X also follow Y" — surface unfollowed artists the user is likely to enjoy.
Requires real user data to be meaningful. Do not build until that data exists.

### 6. Mobile app
React Native / Expo. API is already mobile-ready (stateless, token auth).
Design decisions already account for mobile — do not build until web is stable.

### 7. Map view
Venue pins on a map. Mapbox or Leaflet.
Deferred — adds complexity, not core to the use case.

### 8. Email ingest pipeline
Museum/gallery newsletter ingestion via n8n.
Manual museum data for MVP. Automate when volume justifies it.

### 9. Affiliate link integration
Ticket affiliate links for monetisation.
Post-MVP — needs real traffic first.

---

## Deferred indefinitely

- Paris, Vienna, London city coverage (scraper effort, post-MVP)
- Multi-user / social features
- PWA / service worker (add when web is stable, use version for cache busting)
