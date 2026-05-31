import type { ApiArtist, ApiCity, ApiEvent, EventsResponse } from '../types/index.js'

// In local dev, VITE_API_URL is unset — requests go to /api and the Vite proxy
// strips the prefix and forwards to localhost:3000.
// In production, set VITE_API_URL to the deployed API base URL (e.g. https://api.anywent.com).
const BASE = import.meta.env.VITE_API_URL ?? '/api'

async function get<T>(path: string, token?: string): Promise<T> {
  const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {}
  const res = await fetch(`${BASE}${path}`, { headers })
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`)
  return res.json() as Promise<T>
}

async function post(path: string, body: unknown, token: string): Promise<void> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`)
}

async function del(path: string, token: string): Promise<void> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`)
}

// ── Events ──────────────────────────────────────────────────────────────────

export async function fetchCities(): Promise<ApiCity[]> {
  return get<ApiCity[]>('/cities')
}

export async function fetchEvents(
  citySlug: string,
  from: string,
  to: string,
  token?: string,
): Promise<EventsResponse> {
  return get<EventsResponse>(`/events?citySlug=${citySlug}&from=${from}&to=${to}`, token)
}

export async function fetchEvent(id: string): Promise<ApiEvent> {
  return get<ApiEvent>(`/events/${id}`)
}

// ── Taste ────────────────────────────────────────────────────────────────────

export async function searchArtists(q: string): Promise<ApiArtist[]> {
  return get<ApiArtist[]>(`/artists/search?q=${encodeURIComponent(q)}`)
}

export async function fetchMyArtists(token: string): Promise<ApiArtist[]> {
  return get<ApiArtist[]>('/taste/artists', token)
}

export async function followArtist(artistId: string, token: string): Promise<void> {
  return post('/taste/artists', { artistId }, token)
}

export async function unfollowArtist(artistId: string, token: string): Promise<void> {
  return del(`/taste/artists/${artistId}`, token)
}
