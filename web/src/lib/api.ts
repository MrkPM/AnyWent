import type { ApiCity, ApiEvent, EventsResponse } from '../types/index.js'

// In local dev, VITE_API_URL is unset — requests go to /api and the Vite proxy
// strips the prefix and forwards to localhost:3000.
// In production, set VITE_API_URL to the deployed API base URL (e.g. https://api.anywent.com).
const BASE = import.meta.env.VITE_API_URL ?? '/api'

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`)
  return res.json() as Promise<T>
}

export async function fetchCities(): Promise<ApiCity[]> {
  return get<ApiCity[]>('/cities')
}

export async function fetchEvents(citySlug: string, from: string, to: string): Promise<EventsResponse> {
  return get<EventsResponse>(`/events?citySlug=${citySlug}&from=${from}&to=${to}`)
}

export async function fetchEvent(id: string): Promise<ApiEvent> {
  return get<ApiEvent>(`/events/${id}`)
}
