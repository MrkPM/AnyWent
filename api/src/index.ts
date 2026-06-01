import { buildApp } from './app.js'
import { initSentry } from './lib/sentry.js'
import { registerJobs } from './jobs/index.js'
import { env } from './config/env.js'

initSentry()

const app = await buildApp()

registerJobs()

await app.listen({ port: env.PORT, host: '0.0.0.0' })
