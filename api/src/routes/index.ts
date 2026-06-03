import type { FastifyInstance } from 'fastify'
import { healthRoutes } from './health.js'
import { citiesRoutes } from './cities.js'
import { eventsRoutes } from './events.js'
import { tasteRoutes } from './taste.js'
import { bundleRoutes } from './bundles.js'
import { windowRoutes } from './windows.js'
import { spotifyRoutes } from './spotify.js'

export async function registerRoutes(app: FastifyInstance) {
  await app.register(healthRoutes)
  await app.register(citiesRoutes)
  await app.register(eventsRoutes)
  await app.register(tasteRoutes)
  await app.register(bundleRoutes)
  await app.register(windowRoutes)
  await app.register(spotifyRoutes)
}
