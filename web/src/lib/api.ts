import type { ApiCity, ApiEvent, EventsResponse } from '../types/index.js'

const BASE = '/api'

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
