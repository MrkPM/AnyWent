import postgres from 'postgres'
import { env } from './src/config/env.js'

const sql = postgres({
  host: env.DB_HOST, port: env.DB_PORT, database: env.DB_NAME,
  username: env.DB_USER, password: env.DB_PASSWORD,
  ssl: 'require', prepare: false,
})

async function main() {
  const file = process.argv[2]
  if (!file) { console.error('Usage: pnpm tsx --env-file=../.env migrate.ts <migration_file>'); process.exit(1) }
  await sql.file(file)
  console.log(`Applied: ${file}`)
  await sql.end()
}

main().catch(err => { console.error(err); process.exit(1) })
