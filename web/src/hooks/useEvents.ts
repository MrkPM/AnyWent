import { useState, useCallback } from 'react'
import { fetchEvents } from '../lib/api.js'
import type { EventsResponse } from '../types/index.js'

interface State {
  data: EventsResponse | null
  loading: boolean
  error: string | null
}

export function useEvents() {
  const [state, setState] = useState<State>({ data: null, loading: false, error: null })

  const load = useCallback(async (citySlug: string, from: string, to: string) => {
    setState({ data: null, loading: true, error: null })
    try {
      const data = await fetchEvents(citySlug, from, to)
      setState({ data, loading: false, error: null })
    } catch (err) {
      setState({ data: null, loading: false, error: err instanceof Error ? err.message : 'Failed to load events' })
    }
  }, [])

  return { ...state, load }
}
