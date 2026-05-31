import type { FastifyInstance } from 'fastify'
import { authenticate } from '../middleware/auth.js'
import {
  searchArtists,
  getFollowedArtists,
  followArtist,
  unfollowArtist,
  type ArtistRow,
} from '../db/queries/taste.js'

function toApiArtist(row: ArtistRow) {
  return {
    id:     row.id,
    name:   row.name,
    slug:   row.slug,
    genres: row.genres,
  }
}

export async function tasteRoutes(app: FastifyInstance) {
  // Public: search artists by name — used by the taste screen search bar
  app.get<{ Querystring: { q?: string } }>('/artists/search', async (req, reply) => {
    const q = req.query.q?.trim() ?? ''
    if (q.length < 2) return reply.send([])
    const rows = await searchArtists(q)
    return reply.send(rows.map(toApiArtist))
  })

  // Authenticated: list followed artists
  app.get('/taste/artists', { preHandler: authenticate }, async (req, reply) => {
    const rows = await getFollowedArtists(req.user!.id)
    return reply.send(rows.map(toApiArtist))
  })

  // Authenticated: follow an artist
  app.post<{ Body: { artistId: string } }>(
    '/taste/artists',
    { preHandler: authenticate },
    async (req, reply) => {
      const { artistId } = req.body ?? {}
      if (!artistId) return reply.status(400).send({ error: 'artistId required' })
      await followArtist(req.user!.id, artistId)
      return reply.status(204).send()
    },
  )

  // Authenticated: unfollow an artist
  app.delete<{ Params: { id: string } }>(
    '/taste/artists/:id',
    { preHandler: authenticate },
    async (req, reply) => {
      await unfollowArtist(req.user!.id, req.params.id)
      return reply.status(204).send()
    },
  )
}
