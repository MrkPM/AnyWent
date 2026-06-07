import { z } from 'zod'

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  DB_HOST: z.string(),
  DB_PORT: z.coerce.number(),
  DB_NAME: z.string(),
  DB_USER: z.string(),
  DB_PASSWORD: z.string(),
  CLERK_SECRET_KEY: z.string(),
  SPOTIFY_CLIENT_ID: z.string(),
  SPOTIFY_CLIENT_SECRET: z.string(),
  SPOTIFY_REDIRECT_URI: z.string(),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  SENTRY_DSN: z.string().optional(),
  CORS_ORIGIN: z.string().optional(),
  ADMIN_SECRET: z.string().min(16),
})

export const env = schema.parse(process.env)
