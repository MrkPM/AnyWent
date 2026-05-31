import { useState, useEffect, useRef } from 'react'
import { searchArtists } from '../lib/api.js'
import { useTaste } from '../hooks/useTaste.js'
import { useCurrentUser } from '../hooks/useAuth.js'
import type { ApiArtist } from '../types/index.js'
import styles from './Taste.module.css'

const DEBOUNCE_MS = 300

export function Taste() {
  const user = useCurrentUser()
  const { artists: followed, loading, follow, unfollow } = useTaste()

  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState<ApiArtist[]>([])
  const [searching, setSearching] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Set of followed artist IDs for fast lookup
  const followedIds = new Set(followed.map(a => a.id))

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.trim().length < 2) { setResults([]); return }

    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const data = await searchArtists(query.trim())
        setResults(data)
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, DEBOUNCE_MS)

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  async function handleFollow(artist: ApiArtist) {
    await follow(artist.id)
    setQuery('')
    setResults([])
  }

  if (!user) {
    return (
      <div className={styles.page}>
        <h1 className={styles.heading}>Your Taste</h1>
        <p className={styles.unauthenticated}>Sign in to build your taste profile and get personalised event rankings.</p>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Your Taste</h1>
      <p className={styles.subheading}>
        Follow artists to rank events by affinity. Events with artists you follow surface first.
      </p>

      {/* Search */}
      <div className={styles.searchSection}>
        <label className={styles.sectionLabel}>Add artist</label>
        <div className={styles.searchWrap}>
          <input
            className={styles.searchInput}
            type="text"
            placeholder="Search artists…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
          {searching && <span className={styles.searchSpinner}>…</span>}
        </div>

        {results.length > 0 && (
          <ul className={styles.results}>
            {results.map(artist => {
              const isFollowed = followedIds.has(artist.id)
              return (
                <li key={artist.id} className={styles.resultRow}>
                  <div className={styles.resultInfo}>
                    <span className={styles.resultName}>{artist.name}</span>
                    {artist.genres.length > 0 && (
                      <span className={styles.genres}>
                        {artist.genres.slice(0, 3).join(', ')}
                      </span>
                    )}
                  </div>
                  {isFollowed ? (
                    <span className={styles.followed}>Following</span>
                  ) : (
                    <button
                      className={styles.followBtn}
                      onClick={() => void handleFollow(artist)}
                    >
                      + Follow
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        )}

        {query.trim().length >= 2 && !searching && results.length === 0 && (
          <p className={styles.noResults}>No artists found for "{query}"</p>
        )}
      </div>

      {/* Followed list */}
      <div className={styles.followingSection}>
        <div className={styles.followingHeader}>
          <span className={styles.sectionLabel}>Following</span>
          {!loading && (
            <span className={styles.count}>{followed.length}</span>
          )}
        </div>

        {loading && <p className={styles.loadingMsg}>Loading…</p>}

        {!loading && followed.length === 0 && (
          <p className={styles.empty}>No artists yet. Search above to add some.</p>
        )}

        {followed.length > 0 && (
          <ul className={styles.followedList}>
            {followed.map(artist => (
              <li key={artist.id} className={styles.followedRow}>
                <div className={styles.followedInfo}>
                  <span className={styles.followedName}>{artist.name}</span>
                  {artist.genres.length > 0 && (
                    <span className={styles.genres}>
                      {artist.genres.slice(0, 3).join(', ')}
                    </span>
                  )}
                </div>
                <button
                  className={styles.removeBtn}
                  onClick={() => void unfollow(artist.id)}
                  aria-label={`Unfollow ${artist.name}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
