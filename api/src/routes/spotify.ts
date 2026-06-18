import type { FastifyInstance } from 'fastify'
import * as Sentry from '@sentry/node'
import { authenticate } from '../middleware/auth.js'
import { buildAuthorizationUrl, extractUserIdFromState, exchangeCode } from '../lib/spotify.js'
import {
  upsertSpotifyConnection,
  getSpotifyConnection,
  deleteSpotifyConnection,
} from '../db/queries/spotify.js'
import { syncSpotifyForUser } from '../jobs/spotify-sync.js'
import { env } from '../config/env.js'

// bgSync is fire-and-forget — used only for the initial sync after OAuth callback
// so we don't delay the redirect. Manual sync via POST /auth/spotify/sync awaits directly.
function bgSync(userId: string) {
  syncSpotifyForUser(userId).catch(err => {
    console.error('[spotify] background sync failed:', err)
    Sentry.captureException(err)
  })
}

export async function spotifyRoutes(app: FastifyInstance) {
  // Returns the Spotify authorization URL. Frontend redirects the browser there.
  app.get('/auth/spotify/connect', { preHandler: authenticate }, async (req, reply) => {
    return reply.send({ url: buildAuthorizationUrl(req.user!.id) })
  })

  // Spotify redirects here after the user grants access.
  // Exchanges the code for tokens, stores them, kicks off initial sync, redirects to frontend.
  app.get<{ Querystring: { code?: string; state?: string; error?: string } }>(
    '/auth/spotify/callback',
    async (req, reply) => {
      const { code, state, error } = req.query
      const base = env.FRONTEND_URL

      if (error || !code || !state) {
        return reply.redirect(`${base}/taste?spotify=error`)
      }

      const userId = extractUserIdFromState(state)
      if (!userId) {
        return reply.redirect(`${base}/taste?spotify=error`)
      }

      try {
        const tokens = await exchangeCode(code)
        await upsertSpotifyConnection(userId, tokens)
        bgSync(userId)
        return reply.redirect(`${base}/taste?spotify=connected`)
      } catch (err) {
        console.error('[spotify] callback error:', err)
        Sentry.captureException(err)
        return reply.redirect(`${base}/taste?spotify=error`)
      }
    },
  )

  // Returns whether Spotify is connected and when it was last synced.
  app.get('/auth/spotify/status', { preHandler: authenticate }, async (req, reply) => {
    const conn = await getSpotifyConnection(req.user!.id)
    if (!conn) return reply.send({ connected: false })
    return reply.send({
      connected: true,
      connectedAt: conn.connected_at.toISOString(),
      lastSyncedAt: conn.last_synced_at?.toISOString() ?? null,
      displayName: conn.display_name ?? null,
    })
  })

  // Disconnects Spotify and removes Spotify-sourced affinities.
  app.delete('/auth/spotify', { preHandler: authenticate }, async (req, reply) => {
    await deleteSpotifyConnection(req.user!.id)
    return reply.status(204).send()
  })

  // Triggers a synchronous re-sync and returns the new lastSyncedAt on success.
  // Awaiting directly so errors and timing are surfaced to the client.
  app.post('/auth/spotify/sync', { preHandler: authenticate }, async (req, reply) => {
    const conn = await getSpotifyConnection(req.user!.id)
    if (!conn) return reply.status(404).send({ error: 'Spotify not connected' })
    try {
      await syncSpotifyForUser(req.user!.id)
      const updated = await getSpotifyConnection(req.user!.id)
      return reply.status(200).send({ lastSyncedAt: updated?.last_synced_at?.toISOString() ?? null })
    } catch (err) {
      console.error('[spotify] sync failed:', err)
      Sentry.captureException(err)
      const message = err instanceof Error ? err.message : 'Sync failed'
      return reply.status(500).send({ error: message })
    }
  })
}
