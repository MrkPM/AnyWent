import { useState, useCallback } from 'react'
import { fetchEvents } from '../lib/api.js'
import { useGetToken } from './useAuth.js'
import type { EventsResponse } from '../types/index.js'

interface State {
  data: EventsResponse | null
  loading: boolean
  error: string | null
}

export function useEvents() {
  const [state, setState] = useState<State>({ data: null, loading: false, error: null })
  const getToken = useGetToken()

  const load = useCallback(async (citySlug: string, from: string, to: string) => {
    setState({ data: null, loading: true, error: null })
    try {
      const token = (await getToken()) ?? undefined
      const data  = await fetchEvents(citySlug, from, to, token)
      setState({ data, loading: false, error: null })
    } catch (err) {
      setState({
        data: null,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load events',
      })
    }
  }, [getToken])

  return { ...state, load }
}
