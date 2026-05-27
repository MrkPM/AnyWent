import type { FastifyInstance } from 'fastify'
import { sql } from '../db/client.js'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join, dirname } from 'node:path'

const pkgPath = join(dirname(fileURLToPath(import.meta.url)), '../../package.json')
const { version } = JSON.parse(readFileSync(pkgPath, 'utf8')) as { version: string }

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async () => {
    const [dbCheck] = await sql`SELECT now() AS time`
    const scraperRuns = await sql`
      SELECT source, MAX(finished_at) AS last_run
      FROM scraper_runs
      WHERE finished_at IS NOT NULL
      GROUP BY source
      ORDER BY source
    `
    return {
      status: 'ok',
      version,
      db: { status: 'ok', time: dbCheck.time },
      scrapers: scraperRuns,
    }
  })
}
