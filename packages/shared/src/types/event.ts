import type { Artist } from './artist.js'
import type { Venue } from './venue.js'

export type EventType = 'club_night' | 'concert' | 'exhibition' | 'festival' | 'opening' | 'other'
export type EventSource = 'ra' | 'songkick' | 'dice' | 'email' | 'manual'
export type EventArtistRole = 'headliner' | 'support' | 'b2b' | 'curator' | 'exhibiting'

export interface Event {
  id: string
  venueId: string
  title: string
  type: EventType
  startsAt: string
  endsAt: string | null
  isMultiDay: boolean
  source: EventSource
  sourceUrl: string
  ticketUrl: string | null
  affiliateUrl: string | null
  verifiedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface EventArtist {
  eventId: string
  artistId: string
  role: EventArtistRole | null
  order: number | null
}

export interface EventWithDetails extends Event {
  venue: Venue
  artists: (EventArtist & { artist: Artist })[]
}
