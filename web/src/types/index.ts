export type * from '@anywent/shared'

// API response shapes (joined/enriched versions of the base types)

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

export interface ApiEvent {
  id: string
  title: string
  type: string
  startsAt: string
  endsAt: string | null
  source: string
  sourceUrl: string
  ticketUrl: string | null
  imageUrl: string | null
  timeKnown: boolean
  venue: ApiVenue
  artists: ApiEventArtist[]
}

export interface EventsResponse {
  city: ApiCity
  events: ApiEvent[]
}
