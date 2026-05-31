import { useState, useCallback, useRef } from 'react'
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

  // Keep a ref so `load` (stable) always calls the latest getToken without
  // taking it as a dependency — avoids Clerk's one-time reference change on
  // initialization re-triggering the Home useEffect and resetting data to null.
  const getToken = useGetToken()
  const getTokenRef = useRef(getToken)
  getTokenRef.current = getToken

  const load = useCallback(async (citySlug: string, from: string, to: string) => {
    setState({ data: null, loading: true, error: null })
    try {
      const token = (await getTokenRef.current()) ?? undefined
      const data  = await fetchEvents(citySlug, from, to, token)
      setState({ data, loading: false, error: null })
    } catch (err) {
      setState({
        data: null,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load events',
      })
    }
  }, []) // stable reference — getToken accessed via ref, not captured in closure

  return { ...state, load }
}
