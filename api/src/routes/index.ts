import type { FastifyInstance } from 'fastify'
import { healthRoutes } from './health.js'
import { citiesRoutes } from './cities.js'
import { eventsRoutes } from './events.js'

export async function registerRoutes(app: FastifyInstance) {
  await app.register(healthRoutes)
  await app.register(citiesRoutes)
  await app.register(eventsRoutes)
}
