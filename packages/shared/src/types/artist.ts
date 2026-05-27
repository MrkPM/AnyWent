export interface Artist {
  id: string
  name: string
  slug: string
  genres: string[]
  sourceIds: Record<string, string>
  imageUrl: string | null
  createdAt: string
}
