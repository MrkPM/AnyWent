export interface Country {
  id: string
  name: string
  code: string
}

export interface Region {
  id: string
  countryId: string
  name: string
  localName: string | null
  slug: string
}

export interface City {
  id: string
  regionId: string
  name: string
  slug: string
  lat: number | null
  lng: number | null
  active: boolean
}
