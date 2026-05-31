import { useState, useCallback, useEffect } from 'react'
import { fetchMyArtists, followArtist, unfollowArtist } from '../lib/api.js'
import { useGetToken } from './useAuth.js'
import type { ApiArtist } from '../types/index.js'

export function useTaste() {
  const [artists, setArtists] = useState<ApiArtist[]>([])
  const [loading, setLoading] = useState(false)
  const getToken = useGetToken()

  const loadArtists = useCallback(async () => {
    try {
      const token = await getToken()
      if (!token) return
      setLoading(true)
      const data = await fetchMyArtists(token)
      setArtists(data)
    } catch {
      // unauthenticated or network error — stay empty
    } finally {
      setLoading(false)
    }
  }, [getToken])

  const follow = useCallback(async (artistId: string) => {
    const token = await getToken()
    if (!token) return
    await followArtist(artistId, token)
    // Optimistic: reload to get server-side sorted list
    await loadArtists()
  }, [getToken, loadArtists])

  const unfollow = useCallback(async (artistId: string) => {
    const token = await getToken()
    if (!token) return
    // Optimistic removal before network call
    setArtists(prev => prev.filter(a => a.id !== artistId))
    await unfollowArtist(artistId, token)
  }, [getToken])

  useEffect(() => { void loadArtists() }, [loadArtists])

  return { artists, loading, follow, unfollow }
}
