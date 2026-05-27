export type VenueType = 'club' | 'concert_hall' | 'museum' | 'gallery' | 'festival_site' | 'other'

export interface Venue {
  id: string
  cityId: string
  name: string
  slug: string
  type: VenueType
  address: string | null
  lat: number | null
  lng: number | null
  websiteUrl: string | null
  sourceIds: Record<string, string>
  newsletterEmail: string | null
  active: boolean
  createdAt: string
}
