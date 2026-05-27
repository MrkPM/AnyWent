import Fastify from 'fastify'
import cors from '@fastify/cors'
import { env } from './config/env.js'
import { errorHandler } from './middleware/errorHandler.js'
import { registerRoutes } from './routes/index.js'

export async function buildApp() {
  const app = Fastify({
    logger: env.NODE_ENV !== 'production'
      ? { level: 'debug', transport: { target: 'pino-pretty', options: { colorize: true } } }
      : { level: 'info' },
  })

  await app.register(cors, { origin: true })

  app.setErrorHandler(errorHandler)

  await registerRoutes(app)

  return app
}
