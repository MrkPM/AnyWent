export type AffinitySource = 'spotify_follow' | 'spotify_top' | 'manual' | 'attendance'
export type ConnectedAccountProvider = 'spotify' | 'apple_music' | 'youtube_music'

// Abstraction layer type — never references Clerk directly
export interface AuthUser {
  id: string
  email: string
}

export interface User {
  id: string
  email: string
  displayName: string | null
  createdAt: string
}

export interface UserConnectedAccount {
  id: string
  userId: string
  provider: ConnectedAccountProvider
  scopes: string[]
  connectedAt: string
  lastSyncedAt: string | null
}

export interface UserArtistAffinity {
  userId: string
  artistId: string
  weight: number
  source: AffinitySource
  createdAt: string
  updatedAt: string
}

export interface UserVenueAffinity {
  userId: string
  venueId: string
  weight: number
  source: Extract<AffinitySource, 'manual' | 'attendance'>
}

export interface UserAttendance {
  id: string
  userId: string
  eventId: string | null
  venueId: string | null
  attendedAt: string
  liked: boolean | null
  notes: string | null
  createdAt: string
}

export interface UserSavedEvent {
  userId: string
  eventId: string
  savedAt: string
}
