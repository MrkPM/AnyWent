import { sql } from '../client.js'

export interface CityRow {
  id: string
  name: string
  slug: string
}

export async function getCities(): Promise<CityRow[]> {
  return sql<CityRow[]>`
    SELECT id, name, slug
    FROM cities
    WHERE active = true
    ORDER BY name
  `
}

export async function getCityBySlug(slug: string): Promise<CityRow | null> {
  const rows = await sql<CityRow[]>`
    SELECT id, name, slug
    FROM cities
    WHERE slug = ${slug} AND active = true
    LIMIT 1
  `
  return rows[0] ?? null
}
