import { sql } from '../client.js'
import type { SpotifyTokens, SpotifyArtist } from '../../lib/spotify.js'

export interface SpotifyConnectionRow {
  user_id:          string
  access_token:     string
  refresh_token:    string
  token_expires_at: Date
  scopes:           string[]
  connected_at:     Date
  last_synced_at:   Date | null
}

export async function upsertSpotifyConnection(userId: string, tokens: SpotifyTokens): Promise<void> {
  await sql`
    INSERT INTO spotify_connections (user_id, access_token, refresh_token, token_expires_at, scopes)
    VALUES (${userId}, ${tokens.accessToken}, ${tokens.refreshToken}, ${tokens.expiresAt}, ${tokens.scopes})
    ON CONFLICT (user_id) DO UPDATE SET
      access_token     = EXCLUDED.access_token,
      refresh_token    = EXCLUDED.refresh_token,
      token_expires_at = EXCLUDED.token_expires_at,
      scopes           = EXCLUDED.scopes
  `
}

export async function getSpotifyConnection(userId: string): Promise<SpotifyConnectionRow | null> {
  const [row] = await sql<SpotifyConnectionRow[]>`
    SELECT user_id, access_token, refresh_token, token_expires_at, scopes, connected_at, last_synced_at
    FROM   spotify_connections
    WHERE  user_id = ${userId}
  `
  return row ?? null
}

export async function deleteSpotifyConnection(userId: string): Promise<void> {
  // Remove Spotify-sourced affinities alongside the connection
  await sql`DELETE FROM user_artist_affinities WHERE user_id = ${userId} AND source = 'spotify'`
  await sql`DELETE FROM spotify_connections WHERE user_id = ${userId}`
}

export async function markSpotifySynced(userId: string): Promise<void> {
  await sql`UPDATE spotify_connections SET last_synced_at = now() WHERE user_id = ${userId}`
}

// Upserts a Spotify artist into the artists table; returns our internal artist UUID.
// Lookup order: Spotify ID in source_ids → slug collision → new insert.
export async function upsertSpotifyArtist(artist: SpotifyArtist): Promise<string> {
  const [bySpotifyId] = await sql<{ id: string }[]>`
    SELECT id FROM artists WHERE source_ids->>'spotify' = ${artist.spotifyId} LIMIT 1
  `
  if (bySpotifyId) return bySpotifyId.id

  const slug = artist.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  const [row] = await sql<{ id: string }[]>`
    INSERT INTO artists (name, slug, genres, source_ids, image_url)
    VALUES (
      ${artist.name},
      ${slug},
      ${artist.genres},
      ${sql.json({ spotify: artist.spotifyId })},
      ${artist.imageUrl}
    )
    ON CONFLICT (slug) DO UPDATE SET
      source_ids = artists.source_ids || ${sql.json({ spotify: artist.spotifyId })},
      image_url  = COALESCE(EXCLUDED.image_url, artists.image_url),
      genres     = CASE WHEN array_length(EXCLUDED.genres, 1) > 0 THEN EXCLUDED.genres ELSE artists.genres END
    RETURNING id
  `
  return row!.id
}

// Upserts affinities for a batch of artist IDs. Manual follows take precedence over spotify source.
export async function upsertSpotifyAffinities(userId: string, artistIds: string[]): Promise<void> {
  for (const artistId of artistIds) {
    await sql`
      INSERT INTO user_artist_affinities (user_id, artist_id, weight, source)
      VALUES (${userId}, ${artistId}, 1.00, 'spotify')
      ON CONFLICT (user_id, artist_id) DO UPDATE SET
        weight     = GREATEST(user_artist_affinities.weight, EXCLUDED.weight),
        source     = CASE WHEN user_artist_affinities.source = 'manual' THEN 'manual' ELSE 'spotify' END,
        updated_at = now()
    `
  }
}
