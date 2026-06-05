// Only file in the codebase that talks to the Spotify API.
// Handles OAuth, token exchange/refresh, and artist data fetching.
// Updated: 2026-06-03

import crypto from 'node:crypto'
import { env } from '../config/env.js'

const AUTHORIZE_URL = 'https://accounts.spotify.com/authorize'
const TOKEN_URL = 'https://accounts.spotify.com/api/token'
const API_BASE = 'https://api.spotify.com/v1'
const SCOPES = 'user-follow-read user-top-read'

// State = base64url(payload) + "." + HMAC-SHA256(payload, clientSecret).
// Lets the callback route verify the state belongs to this server, embedding the userId
// without a DB round-trip. Spotify doesn't allow JWT in state, so we roll our own.

function signState(payload: string): string {
  const sig = crypto
    .createHmac('sha256', env.SPOTIFY_CLIENT_SECRET)
    .update(payload)
    .digest('base64url')
  return `${payload}.${sig}`
}

function verifyState(state: string): string | null {
  const dot = state.lastIndexOf('.')
  if (dot === -1) return null
  const payload = state.slice(0, dot)
  const sig = state.slice(dot + 1)
  const expected = crypto
    .createHmac('sha256', env.SPOTIFY_CLIENT_SECRET)
    .update(payload)
    .digest('base64url')
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null
  } catch {
    return null
  }
  return payload
}

export function buildAuthorizationUrl(userId: string): string {
  const payload = Buffer.from(
    JSON.stringify({ userId, nonce: crypto.randomBytes(8).toString('hex') }),
  ).toString('base64url')
  const state = signState(payload)
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: env.SPOTIFY_CLIENT_ID,
    scope: SCOPES,
    redirect_uri: env.SPOTIFY_REDIRECT_URI,
    state,
    show_dialog: 'true',
  })
  return `${AUTHORIZE_URL}?${params}`
}

export function extractUserIdFromState(state: string): string | null {
  const payload = verifyState(state)
  if (!payload) return null
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { userId?: string }
    return data.userId ?? null
  } catch {
    return null
  }
}

export interface SpotifyTokens {
  accessToken: string
  refreshToken: string
  expiresAt: Date
  scopes: string[]
}

function basicAuth(): string {
  return `Basic ${Buffer.from(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`).toString('base64')}`
}

interface RawTokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  scope: string
}

function parseTokens(raw: RawTokenResponse, fallbackRefreshToken?: string): SpotifyTokens {
  return {
    accessToken: raw.access_token,
    refreshToken: raw.refresh_token ?? fallbackRefreshToken ?? '',
    expiresAt: new Date(Date.now() + raw.expires_in * 1000),
    scopes: raw.scope.split(' '),
  }
}

export async function exchangeCode(code: string): Promise<SpotifyTokens> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: basicAuth(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: env.SPOTIFY_REDIRECT_URI,
    }),
  })
  if (!res.ok) throw new Error(`Spotify token exchange failed: ${res.status}`)
  return parseTokens(await res.json() as RawTokenResponse)
}

export async function refreshAccessToken(refreshToken: string): Promise<SpotifyTokens> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: basicAuth(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })
  if (!res.ok) throw new Error(`Spotify token refresh failed: ${res.status}`)
  // Spotify doesn't always issue a new refresh token — fall back to the one we have
  return parseTokens(await res.json() as RawTokenResponse, refreshToken)
}

export interface SpotifyProfile {
  spotifyId: string
  displayName: string
}

export async function getProfile(accessToken: string): Promise<SpotifyProfile> {
  const res = await fetch(`${API_BASE}/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error(`Spotify profile fetch failed: ${res.status}`)
  const data = await res.json() as { id: string; display_name?: string | null }
  return { spotifyId: data.id, displayName: data.display_name || data.id }
}

export interface SpotifyArtist {
  spotifyId: string
  name: string
  genres: string[]
  imageUrl: string | null
}

interface RawArtist {
  id: string
  name: string
  genres: string[]
  images: Array<{ url: string; width: number; height: number }>
}

function parseArtist(a: RawArtist): SpotifyArtist {
  const best = a.images.sort((x, y) => (y.width ?? 0) - (x.width ?? 0))[0]
  return { spotifyId: a.id, name: a.name, genres: a.genres ?? [], imageUrl: best?.url ?? null }
}

export async function getFollowedArtists(accessToken: string): Promise<SpotifyArtist[]> {
  const artists: SpotifyArtist[] = []
  let url: string | null = `${API_BASE}/me/following?type=artist&limit=50`
  while (url) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
    if (!res.ok) throw new Error(`Spotify followed artists failed: ${res.status}`)
    const data = await res.json() as { artists: { items: RawArtist[]; next: string | null } }
    artists.push(...data.artists.items.map(parseArtist))
    url = data.artists.next
  }
  return artists
}

export async function getTopArtists(accessToken: string): Promise<SpotifyArtist[]> {
  const seen = new Set<string>()
  const artists: SpotifyArtist[] = []
  for (const range of ['short_term', 'medium_term', 'long_term'] as const) {
    const res = await fetch(`${API_BASE}/me/top/artists?limit=50&time_range=${range}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) { console.warn(`[spotify] top artists (${range}) failed: ${res.status}`); continue }
    const data = await res.json() as { items: RawArtist[] }
    for (const a of data.items) {
      if (!seen.has(a.id)) { seen.add(a.id); artists.push(parseArtist(a)) }
    }
  }
  return artists
}
