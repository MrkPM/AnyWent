import { useState, useEffect, useCallback } from 'react'
import {
  fetchSpotifyStatus,
  fetchSpotifyConnectUrl,
  disconnectSpotify,
  syncSpotify,
} from '../lib/api.js'
import { useGetToken, useAuthIsLoaded } from './useAuth.js'

export interface SpotifyStatus {
  connected: boolean
  connectedAt?: string
  lastSyncedAt?: string | null
  displayName?: string | null
}

export function useSpotify() {
  const getToken = useGetToken()
  const isLoaded = useAuthIsLoaded()
  const [status, setStatus] = useState<SpotifyStatus | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const token = await getToken()
    if (!token) return
    try {
      setStatus(await fetchSpotifyStatus(token))
    } catch {
      // Silently ignore — user may not be signed in yet
    }
  }, [getToken])

  useEffect(() => {
    if (!isLoaded) return
    void refresh()
  }, [isLoaded, refresh])

  async function connect() {
    setConnecting(true)
    try {
      const token = await getToken()
      if (!token) return
      const { url } = await fetchSpotifyConnectUrl(token)
      window.location.href = url
    } finally {
      setConnecting(false)
    }
  }

  async function disconnect() {
    const token = await getToken()
    if (!token) return
    await disconnectSpotify(token)
    setStatus({ connected: false })
  }

  async function sync() {
    setSyncing(true)
    setSyncError(null)
    try {
      const token = await getToken()
      if (!token) return
      const result = await syncSpotify(token)
      // Sync is now synchronous — update lastSyncedAt directly from the response
      setStatus(prev => prev ? { ...prev, lastSyncedAt: result.lastSyncedAt } : prev)
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  return { status, connecting, syncing, syncError, connect, disconnect, sync, refresh }
}
