export type * from '@anywent/shared'

// API response shapes (joined/enriched versions of the base types)

export interface ApiArtist {
  id:     string
  name:   string
  slug:   string
  genres: string[]
}

export interface ApiCity {
  id: string
  name: string
  slug: string
}

export interface ApiEventArtist {
  id: string
  name: string
  role: string | null
  order: number | null
}

export interface ApiVenue {
  id: string
  name: string
  slug: string
  type: string
}

export interface ApiEventSource {
  source: string
  sourceUrl: string
  ticketUrl: string | null
}

export interface ApiEvent {
  id: string
  title: string
  type: string
  startsAt: string
  endsAt: string | null
  source: string
  sourceUrl: string
  ticketUrl: string | null
  imageUrl:      string | null
  timeKnown:     boolean
  affinityScore:  number
  matchedArtists: string[]
  venue: ApiVenue
  artists: ApiEventArtist[]
  sources: ApiEventSource[]
}

export interface EventsResponse {
  city: ApiCity
  events: ApiEvent[]
}

// ── Discovery / Bundles ──────────────────────────────────────────────────────

export interface BundleTopEvent {
  id:           string
  title:        string
  startsAt:     string
  imageUrl:     string | null
  timeKnown:    boolean
  affinityScore: number
  ticketUrl:    string | null
  sourceUrl:    string
  venue:        { name: string }
}

export interface ApiBundle {
  city:       ApiCity
  score:      number
  eventCount: number
  topEvents:  BundleTopEvent[]
}

export interface BundleWeekend {
  from:    string
  to:      string
  bundles: ApiBundle[]
}

export interface BundlesResponse {
  weekends: BundleWeekend[]
}
