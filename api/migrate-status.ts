import postgres from 'postgres'
import { env } from './src/config/env.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const sql = postgres({
  host: env.DB_HOST, port: env.DB_PORT, database: env.DB_NAME,
  username: env.DB_USER, password: env.DB_PASSWORD,
  ssl: 'require', prepare: false,
})

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const migrationsDir = path.join(__dirname, 'src/db/migrations')

async function main() {
  const applied = await sql<{ filename: string; applied_at: Date }[]>`
    SELECT filename, applied_at FROM schema_migrations ORDER BY applied_at, filename
  `
  const appliedSet = new Set(applied.map(r => r.filename))

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.up.sql') || (!f.endsWith('.down.sql') && f.endsWith('.sql')))
    .sort()

  const unapplied = files.filter(f => !appliedSet.has(f))

  console.log(`\nMigration status — ${new Date().toISOString()}\n`)
  console.log(`Applied: ${applied.length}`)
  for (const row of applied) {
    console.log(`  ✓  ${row.filename.padEnd(48)} ${row.applied_at.toISOString().slice(0, 10)}`)
  }

  if (unapplied.length === 0) {
    console.log(`\nAll migrations applied. No drift detected.\n`)
  } else {
    console.log(`\nUnapplied (${unapplied.length}):`)
    for (const f of unapplied) {
      console.log(`  ✗  ${f}`)
    }
    console.log()
    process.exitCode = 1
  }

  await sql.end()
}

main().catch(err => { console.error(err); process.exit(1) })
