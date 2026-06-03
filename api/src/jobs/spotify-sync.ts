import * as Sentry from '@sentry/node'
import {
  getSpotifyConnection,
  upsertSpotifyConnection,
  upsertSpotifyArtist,
  upsertSpotifyAffinities,
  markSpotifySynced,
} from '../db/queries/spotify.js'
import { getFollowedArtists, getTopArtists, getProfile, refreshAccessToken } from '../lib/spotify.js'

export async function syncSpotifyForUser(userId: string): Promise<void> {
  const conn = await getSpotifyConnection(userId)
  if (!conn) throw new Error(`No Spotify connection for user ${userId}`)

  // Refresh if within 5 minutes of expiry
  let accessToken = conn.access_token
  if (conn.token_expires_at.getTime() < Date.now() + 5 * 60 * 1000) {
    const fresh = await refreshAccessToken(conn.refresh_token)
    await upsertSpotifyConnection(userId, fresh)
    accessToken = fresh.accessToken
  }

  const [followed, top, profile] = await Promise.all([
    getFollowedArtists(accessToken),
    getTopArtists(accessToken),
    getProfile(accessToken),
  ])

  // Deduplicate by Spotify ID
  const seen = new Set<string>()
  const all = [...followed, ...top].filter(a => {
    if (seen.has(a.spotifyId)) return false
    seen.add(a.spotifyId)
    return true
  })

  const artistIds: string[] = []
  for (const artist of all) {
    try {
      artistIds.push(await upsertSpotifyArtist(artist))
    } catch (err) {
      console.error(`[spotify-sync] skipping artist "${artist.name}":`, err)
      Sentry.captureException(err)
    }
  }

  await upsertSpotifyAffinities(userId, artistIds)
  await markSpotifySynced(userId, profile.displayName)

  console.log(`[spotify-sync] synced ${artistIds.length} artists for user ${userId}`)
}
