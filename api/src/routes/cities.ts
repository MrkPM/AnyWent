import type { FastifyInstance } from 'fastify'
import { getCities } from '../db/queries/cities.js'

export async function citiesRoutes(app: FastifyInstance) {
  app.get('/cities', async (_req, reply) => {
    const cities = await getCities()
    return reply.send(cities)
  })
}
