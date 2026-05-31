// Seed script — curated galleries, museums, and project spaces for Amsterdam and Berlin
// Source: docs/resources/Galleries and museums/ (manually curated 2026-05)
// Run: pnpm tsx --env-file=../.env jobs/seed/venues-galleries.ts
//
// Idempotent: ON CONFLICT (city_id, slug) DO NOTHING — safe to re-run.
// curated_focus from the JSON is noted but not stored (no schema column yet).

import postgres from 'postgres'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { env } from '../../src/config/env.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const RESOURCES_DIR = join(__dirname, '../../../docs/resources/Galleries and museums')

const sql = postgres({
  host: env.DB_HOST,
  port: env.DB_PORT,
  database: env.DB_NAME,
  username: env.DB_USER,
  password: env.DB_PASSWORD,
  ssl: 'require',
  prepare: false,
})

interface VenueRecord {
  name: string
  type: string
  website: string
  curated_focus: string
}

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function loadJson(filename: string): VenueRecord[] {
  const raw = readFileSync(join(RESOURCES_DIR, filename), 'utf-8')
  return JSON.parse(raw) as VenueRecord[]
}

async function getCityId(slug: string): Promise<string> {
  const [city] = await sql`SELECT id FROM cities WHERE slug = ${slug}`
  if (!city) throw new Error(`City not found in DB: ${slug}. Run geography seed first.`)
  return city.id as string
}

async function seedCityVenues(
  cityId: string,
  cityLabel: string,
  venues: VenueRecord[],
): Promise<void> {
  let inserted = 0
  let skipped = 0

  for (const v of venues) {
    const slug = toSlug(v.name)

    const [row] = await sql`
      INSERT INTO venues (city_id, name, slug, type, website_url, source_ids)
      VALUES (
        ${cityId},
        ${v.name},
        ${slug},
        ${v.type},
        ${v.website},
        ${sql.json({ seed: true })}
      )
      ON CONFLICT (city_id, slug) DO NOTHING
      RETURNING id
    `

    if (row) {
      inserted++
      console.log(`  + ${v.name}  [${v.type}]`)
    } else {
      skipped++
      console.log(`  ~ ${v.name}  — already exists, skipped`)
    }
  }

  console.log(`\n[seed] ${cityLabel}: ${inserted} inserted, ${skipped} skipped\n`)
}

async function main() {
  const amsterdam = loadJson('Amsterda_galleries.json')
  const berlin    = loadJson('Berlin_galleries.json')

  console.log(`[seed] Amsterdam source: ${amsterdam.length} venues`)
  console.log(`[seed] Berlin source:    ${berlin.length} venues\n`)

  const amsterdamId = await getCityId('amsterdam')
  console.log(`[seed] Amsterdam (city_id: ${amsterdamId}):`)
  await seedCityVenues(amsterdamId, 'Amsterdam', amsterdam)

  const berlinId = await getCityId('berlin')
  console.log(`[seed] Berlin (city_id: ${berlinId}):`)
  await seedCityVenues(berlinId, 'Berlin', berlin)

  await sql.end()
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
