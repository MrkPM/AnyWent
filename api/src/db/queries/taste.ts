import { sql } from '../client.js'

export interface ArtistRow {
  id:     string
  name:   string
  slug:   string
  genres: string[]
}

export async function searchArtists(query: string): Promise<ArtistRow[]> {
  return sql<ArtistRow[]>`
    SELECT id, name, slug, genres
    FROM   artists
    WHERE  name ILIKE ${'%' + query + '%'}
    ORDER  BY name ASC
    LIMIT  20
  `
}

export async function getFollowedArtists(userId: string): Promise<ArtistRow[]> {
  return sql<ArtistRow[]>`
    SELECT a.id, a.name, a.slug, a.genres
    FROM   artists a
    JOIN   user_artist_affinities uaa ON uaa.artist_id = a.id
    WHERE  uaa.user_id = ${userId}
    ORDER  BY a.name ASC
  `
}

export async function followArtist(userId: string, artistId: string): Promise<void> {
  await sql`
    INSERT INTO user_artist_affinities (user_id, artist_id, weight, source)
    VALUES (${userId}, ${artistId}, 1.00, 'manual')
    ON CONFLICT (user_id, artist_id) DO NOTHING
  `
}

export async function unfollowArtist(userId: string, artistId: string): Promise<void> {
  await sql`
    DELETE FROM user_artist_affinities
    WHERE user_id = ${userId} AND artist_id = ${artistId}
  `
}
