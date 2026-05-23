# AnyWent — UI Spec

## Design Principles

- Mobile-ready from day one (React → React Native later)
- Fast, scannable — information density over decoration
- Always link to original source — never hide where data came from
- Taste is personal — every ranked view reflects the logged-in user

---

## Screens (MVP)

### 1. Home / Query Screen

The entry point. Two modes, one interface.

**Input area**
A single flexible query bar with two modes toggled by the user:

```
[ Discovery mode ]  "Show me the best weekends in Europe"
                    Optional: date range picker (default: next 6 weeks)
                    Optional: country/region filter

[ City mode ]       City selector + date range
                    "What's on in [Berlin] [next weekend]"
```

**Output: Bundle Cards**
Ranked list of city/weekend bundles.

```
┌─────────────────────────────────────────┐
│ 🇩🇪 Berlin  •  14–16 March              │
│                                         │
│ ████ Score match (visual indicator)     │
│                                         │
│ 4 club nights  •  2 concerts  •  3 exh  │
│                                         │
│ ↳ Solomun @ Berghain                    │
│ ↳ Tame Impala @ Tempodrom               │
│ ↳ Neue Nationalgalerie: Kiefer opens    │
│                                  →      │
└─────────────────────────────────────────┘
```

- Tap a bundle → City Weekend View (screen 2)
- Tap a specific event → Event Detail (screen 3)
- Score indicator is visual only — not a number shown to user

---

### 2. City Weekend View

Drill-down from a bundle. Shows all events for a city/weekend, grouped by category.

**Header**: City name + date range + summary counts

**Sections** (collapsible):
- Club Nights
- Concerts
- Exhibitions & Galleries
- Other

Each event shown as a compact card:
```
┌──────────────────────────────────────┐
│ Solomun                              │
│ Berghain  •  Sat 15 Mar  •  23:00   │
│ ★ High match                         │
│                          [Tickets →] │
└──────────────────────────────────────┘
```

- "Tickets →" links to `source_url` (always original)
- "★ High match" is taste affinity indicator (high / medium / low / unrated)
- Events with no affinity signal still shown — sorted below matched ones

---

### 3. Event Detail

Full event view.

- Title, venue, date/time
- Full lineup (artist names + roles)
- Exhibition: title, curators, run dates, description
- Source attribution: "Via Resident Advisor" with link
- Ticket link if available
- Save button (heart / bookmark)
- "More events at this venue"
- "More events with [artist]"

---

### 4. Artist Page

- Artist name, genres
- Upcoming events (filtered to cities in scope)
- Your affinity indicator ("You follow this artist on Spotify")

---

### 5. Venue Page

- Venue name, type, city, address
- Upcoming events
- Your affinity indicator if applicable

---

### 6. Profile & Taste

**My Taste tab**
- Connected accounts (Spotify connect button)
- Followed artists (from Spotify + manually added)
- Favourite venues
- Attendance history

**Settings**
- Notification preferences (post-MVP)
- Account management

---

### 7. Onboarding Flow (new user)

1. Create account (email or Google via Clerk)
2. "Connect Spotify to import your artists" — optional, skippable
3. "Or add artists manually" — search + add
4. "Pick cities you travel to" — multi-select from active cities
5. Done → Home screen

---

## Navigation Structure

```
Bottom nav (mobile) / Top nav (desktop):
├── Home (query / bundles)
├── Cities (browse by city — City mode shortcut)
├── Saved (bookmarked events)
└── Profile
```

---

## Component Notes

- **Bundle card**: city flag + name, date range, category counts, top 2-3 event previews, score indicator
- **Event card (compact)**: title or headliner name, venue, date/time, affinity badge, ticket link
- **Event card (full)**: above + full lineup, description, source attribution
- **Affinity badge**: small coloured dot or label — High / Medium / Low / — (no match). Never show a number.
- **Source attribution**: small text + icon at bottom of every event card — "Via RA", "Via Songkick" — always a link

---

## Map View (Post-MVP)

Deferred. When built:
- City view has a toggle: List | Map
- Map shows venue pins for the current query
- Tap pin → venue card with upcoming events
- Clustering for dense areas

---

## Mobile Notes

- Design for 390px width minimum
- Bottom navigation (not hamburger)
- Bundle cards are swipeable in discovery mode
- Date pickers use native mobile date picker where possible
- "What's on this weekend" should be accessible in 2 taps from home screen
