// Debug: test the stored Spotify token directly against /me
// Run: pnpm tsx --env-file=../.env jobs/scripts/debug-spotify-token.ts

import { getSpotifyConnection } from '../../src/db/queries/spotify.js'
import { refreshAccessToken } from '../../src/lib/spotify.js'

const USER_ID = 'user_3EVjghMRrbtbclluHPEvSUZoexq'
console.log('Using CLIENT_ID:', process.env.SPOTIFY_CLIENT_ID)

const conn = await getSpotifyConnection(USER_ID)
if (!conn) { console.error('No connection in DB'); process.exit(1) }

console.log('Token expires at:', conn.token_expires_at)
console.log('Expired?', conn.token_expires_at.getTime() < Date.now())

let token = conn.access_token
if (conn.token_expires_at.getTime() < Date.now() + 5 * 60 * 1000) {
  console.log('Refreshing token…')
  const fresh = await refreshAccessToken(conn.refresh_token)
  token = fresh.accessToken
  console.log('Refreshed, new expiry:', fresh.expiresAt)
}

console.log('\nCalling /me …')
const res = await fetch('https://api.spotify.com/v1/me', {
  headers: { Authorization: `Bearer ${token}` },
})
console.log('Status:', res.status)
const body = await res.text()
console.log('Body:', body)

// Decode JWT payload to see which Spotify account this token belongs to
try {
  const parts = token.split('.')
  if (parts.length === 3) {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
    console.log('\nToken payload (Spotify user info):', JSON.stringify(payload, null, 2))
  }
} catch { console.log('Token is not a JWT — cannot decode') }

console.log('\nCalling /me/top/artists?time_range=short_term&limit=5 …')
const res2 = await fetch('https://api.spotify.com/v1/me/top/artists?time_range=short_term&limit=5', {
  headers: { Authorization: `Bearer ${token}` },
})
console.log('Status:', res2.status)
console.log('Body:', await res2.text())
