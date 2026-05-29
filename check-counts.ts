import postgres from 'postgres'
import { env } from './src/config/env.js'
const sql = postgres({ host: env.DB_HOST, port: env.DB_PORT, database: env.DB_NAME,
  username: env.DB_USER, password: env.DB_PASSWORD, ssl: 'require', prepare: false })

async function main() {
  // Total per city
  const totals = await sql`
    SELECT c.slug, COUNT(*) AS total
    FROM events e
    JOIN venues v ON v.id = e.venue_id
    JOIN cities c ON c.id = v.city_id
    GROUP BY c.slug ORDER BY c.slug
  `
  console.log('\n--- Total events per city ---')
  for (const r of totals) console.log(r)

  // Amsterdam May 29-30 specifically (the 40 vs 74 comparison)
  const [ams] = await sql`
    SELECT COUNT(*) AS total
    FROM events e
    JOIN venues v ON v.id = e.venue_id
    JOIN cities c ON c.id = v.city_id
    WHERE c.slug = 'amsterdam'
      AND e.starts_at >= '2026-05-29'::timestamptz
      AND e.starts_at <  '2026-05-31'::timestamptz
  `
  console.log('\n--- Amsterdam May 29-30 ---')
  console.log(ams)

  // Latest scraper runs
  const runs = await sql`
    SELECT source, started_at, finished_at, events_upserted, jsonb_array_length(errors::jsonb) AS error_count
    FROM scraper_runs ORDER BY started_at DESC LIMIT 6
  `
  console.log('\n--- Last 6 scraper runs ---')
  for (const r of runs) console.log(JSON.stringify(r))

  await sql.end()
}
main().catch(err => { console.error(err); process.exit(1) })
