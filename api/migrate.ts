import postgres from 'postgres'
import { env } from './src/config/env.js'
import path from 'path'

const sql = postgres({
  host: env.DB_HOST, port: env.DB_PORT, database: env.DB_NAME,
  username: env.DB_USER, password: env.DB_PASSWORD,
  ssl: 'require', prepare: false,
})

async function main() {
  const file = process.argv[2]
  if (!file) { console.error('Usage: pnpm tsx --env-file=../.env migrate.ts <migration_file>'); process.exit(1) }

  await sql.file(file)

  const filename = path.basename(file)
  if (filename.endsWith('.down.sql')) {
    // Remove the corresponding up entry so the migration shows as rolled back
    const upFilename = filename.replace('.down.sql', '.up.sql')
    await sql`DELETE FROM schema_migrations WHERE filename = ${upFilename}`
    console.log(`Rolled back: ${filename}`)
  } else {
    await sql`
      INSERT INTO schema_migrations (filename, applied_at)
      VALUES (${filename}, now())
      ON CONFLICT (filename) DO NOTHING
    `
    console.log(`Applied: ${filename}`)
  }

  await sql.end()
}

main().catch(err => { console.error(err); process.exit(1) })
