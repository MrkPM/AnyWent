import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchClusters } from '../lib/api.js'
import { useGetToken } from '../hooks/useAuth.js'
import type { ApiCluster, ClustersResponse } from '../types/index.js'
import styles from './Discover.module.css'

function formatDateRange(from: string, to: string): string {
  const s = new Date(from + 'T12:00:00Z')
  const e = new Date(to   + 'T12:00:00Z')
  const sm = s.toLocaleDateString('en-GB', { month: 'short' })
  const em = e.toLocaleDateString('en-GB', { month: 'short' })
  const sd = s.toLocaleDateString('en-GB', { weekday: 'short' })
  const ed = e.toLocaleDateString('en-GB', { weekday: 'short' })
  return sm === em
    ? `${sd} ${s.getUTCDate()} – ${ed} ${e.getUTCDate()} ${sm}`
    : `${sd} ${s.getUTCDate()} ${sm} – ${ed} ${e.getUTCDate()} ${em}`
}

function timingLabel(from: string): string {
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const start = new Date(from + 'T00:00:00Z')
  const diffDays = Math.round((start.getTime() - today.getTime()) / 86400000)
  if (diffDays <= 0) return 'This week'
  if (diffDays <= 7) return 'Next week'
  const weeks = Math.round(diffDays / 7)
  return `In ${weeks} weeks`
}

function SkeletonCard() {
  return (
    <div className={styles.skeleton}>
      <div className={styles.skeletonRank} />
      <div className={styles.skeletonBody}>
        <div className={styles.skeletonCity} />
        <div className={styles.skeletonMeta} />
      </div>
      <div className={styles.skeletonBars} />
    </div>
  )
}

// Show all artists if ≤ this count, otherwise cap at ARTIST_CAP + overflow label.
// Update this constant once we have stats on the median matched-artist count per bundle.
const ARTIST_SHOW_ALL_THRESHOLD = 6
const ARTIST_CAP = 4

function ArtistLine({ artists, totalArtistCount }: {
  artists: Array<{ name: string; slug: string }>
  totalArtistCount: number
}) {
  if (artists.length === 0) {
    if (totalArtistCount === 0) return null
    return <div className={styles.artists}>{totalArtistCount} artists</div>
  }
  const showAll   = artists.length <= ARTIST_SHOW_ALL_THRESHOLD
  const displayed = showAll ? artists : artists.slice(0, ARTIST_CAP)
  const overflow  = showAll ? 0 : artists.length - ARTIST_CAP
  return (
    <div className={styles.artists}>
      {displayed.map(a => a.name).join(' · ')}
      {overflow > 0 && <span className={styles.artistsOverflow}> +{overflow} more</span>}
    </div>
  )
}

function ClusterCard({ cluster, rank }: { cluster: ApiCluster; rank: number }) {
  const navigate = useNavigate()

  function go() {
    navigate(`/bundle/${cluster.city.slug}/${cluster.from}/${cluster.to}`, { state: { cluster } })
  }

  return (
    <button className={styles.card} onClick={go}>
      <span className={styles.rank}>{String(rank).padStart(2, '0')}</span>

      <div className={styles.body}>
        <div className={styles.cityRow}>
          <span className={styles.cityName}>{cluster.city.name}</span>
          <span className={styles.countryCode}>{cluster.city.country}</span>
        </div>
        <div className={styles.meta}>
          <span className={styles.dateRange}>{formatDateRange(cluster.from, cluster.to)}</span>
          {cluster.matchedArtists.length > 0 && (
            <>
              <span className={styles.dot}>·</span>
              <span className={styles.matchedCount}>{cluster.matchedArtists.length} matched</span>
            </>
          )}
        </div>
        <ArtistLine artists={cluster.matchedArtists} totalArtistCount={cluster.totalArtistCount} />
      </div>

      <div className={styles.scoreCol}>
        <span className={styles.score}>{cluster.clusterScore.toFixed(1)}</span>
        <span className={styles.timing}>{timingLabel(cluster.from)}</span>
      </div>
    </button>
  )
}

export function Discover() {
  const [data, setData]       = useState<ClustersResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const getToken   = useGetToken()
  const getTokenRef = useRef(getToken)
  getTokenRef.current = getToken

  useEffect(() => {
    void (async () => {
      try {
        const token = await getTokenRef.current().catch(() => null).then(t => t ?? undefined)
        setData(await fetchClusters(token))
      } catch (e) {
        setError('Failed to load clusters')
        console.error(e)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const clusters = data?.clusters ?? []

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.heading}>Where next?</h1>
        <p className={styles.subheading}>
          Wed–Tue windows · ranked by your taste · {clusters.length} options
        </p>
      </div>

      {loading && (
        <>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </>
      )}

      {error && <p className={styles.error}>{error}</p>}

      {!loading && clusters.length === 0 && (
        <p className={styles.empty}>No events found in the coming weeks.</p>
      )}

      {clusters.map((cluster, i) => (
        <ClusterCard
          key={`${cluster.city.slug}-${cluster.from}`}
          cluster={cluster}
          rank={i + 1}
        />
      ))}
    </div>
  )
}
