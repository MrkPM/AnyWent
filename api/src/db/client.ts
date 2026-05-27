import postgres from 'postgres'
import { env } from '../config/env.js'

export const sql = postgres({
  host: env.DB_HOST,
  port: env.DB_PORT,
  database: env.DB_NAME,
  username: env.DB_USER,
  password: env.DB_PASSWORD,
  ssl: 'require',
  max: 10,
  // Required for PgBouncer transaction mode (Supabase pooler)
  prepare: false,
})
