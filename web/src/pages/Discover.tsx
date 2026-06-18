import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchClusters } from '../lib/api.js'
import { useGetToken } from '../hooks/useAuth.js'
import type { ApiCluster, ClustersResponse } from '../types/index.js'
import styles from './Discover.module.css'

// IATA airport codes — shown as graphic backdrop when no event poster is available
const IATA: Record<string, string> = {
  berlin:    'BER',
  amsterdam: 'AMS',
  prague:    'PRG',
  paris:     'CDG',
  mallorca:  'PMI',
  vienna:    'VIE',
  dresden:   'DRS',
  munich:    'MUC',
  ibiza:     'IBZ',
  lyon:      'LYS',
  marseille: 'MRS',
  nice:      'NCE',
  florence:  'FLR',
  milan:     'MXP',
  rome:      'FCO',
  thehague:  'RTM',
  lisbon:    'LIS',
  porto:     'OPO',
  barcelona: 'BCN',
}

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
  if (diffDays <= 0) return 'Now'
  if (diffDays <= 7) return 'Next week'
  const weeks = Math.round(diffDays / 7)
  return `${weeks}w`
}

function groupConsecutive(clusters: ApiCluster[]): Array<{ primary: ApiCluster; extras: ApiCluster[] }> {
  const groups: Array<{ primary: ApiCluster; extras: ApiCluster[] }> = []
  for (const cluster of clusters) {
    const last = groups[groups.length - 1]
    if (last && last.primary.city.slug === cluster.city.slug) {
      last.extras.push(cluster)
    } else {
      groups.push({ primary: cluster, extras: [] })
    }
  }
  return groups
}

function SkeletonCard() {
  return (
    <div className={styles.skeleton}>
      <div className={styles.skTop}>
        <div className={styles.skCity} />
        <div className={styles.skTiming} />
      </div>
      <div className={styles.skArtists} />
      <div className={styles.skMeta} />
    </div>
  )
}

function ClusterCard({ cluster }: { cluster: ApiCluster }) {
  const navigate = useNavigate()
  const topImage = cluster.topEvents.find(e => e.imageUrl)?.imageUrl ?? null
  const iata     = IATA[cluster.city.slug] ?? cluster.city.slug.toUpperCase().slice(0, 3)

  return (
    <button
      className={`${styles.card} ${topImage ? styles.hasImage : styles.noImage}`}
      onClick={() =>
        navigate(`/bundle/${cluster.city.slug}/${cluster.from}/${cluster.to}`, {
          state: { cluster },
        })
      }
    >
      {topImage ? (
        <>
          <img
            src={topImage}
            alt=""
            className={styles.image}
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
          />
          <div className={styles.scrim} />
        </>
      ) : (
        <span className={styles.iata} aria-hidden="true">{iata}</span>
      )}

      <div className={styles.content}>
        <div className={styles.topRow}>
          <span className={styles.cityName}>{cluster.city.name}</span>
          <div className={styles.topRight}>
            <span className={styles.country}>{cluster.city.country}</span>
            <span className={styles.sep}>·</span>
            <span className={styles.timing}>{timingLabel(cluster.from)}</span>
          </div>
        </div>

        <div className={styles.bottom}>
          {cluster.matchedArtists.length > 0 && (
            <div className={styles.artists}>
              {cluster.matchedArtists.map(a => a.name).join(' · ')}
            </div>
          )}
          <div className={styles.metaRow}>
            <span className={styles.dateRange}>{formatDateRange(cluster.from, cluster.to)}</span>
            {cluster.matchedArtists.length > 0 && (
              <>
                <span className={styles.metaDot}>·</span>
                <span className={styles.matchedCount}>{cluster.matchedArtists.length} matched</span>
              </>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}

function ClusterGroup({
  group,
  isExpanded,
  onToggle,
}: {
  group:      { primary: ApiCluster; extras: ApiCluster[] }
  isExpanded: boolean
  onToggle:   () => void
}) {
  const { primary, extras } = group
  const hasExtras = extras.length > 0

  return (
    <div className={styles.group}>
      <ClusterCard cluster={primary} />

      {hasExtras && (
        <>
          {/* grid-template-rows: 46px → 1fr animates without layout thrash */}
          <div className={`${styles.extras} ${isExpanded ? styles.extrasOpen : ''}`}>
            {/* Transparent overlay captures clicks to expand when collapsed */}
            {!isExpanded && (
              <button
                className={styles.peekTrigger}
                onClick={onToggle}
                aria-label={`Show ${extras.length} more ${primary.city.name} date windows`}
              />
            )}
            <div>
              {extras.map(c => (
                <ClusterCard key={`${c.city.slug}-${c.from}`} cluster={c} />
              ))}
            </div>
          </div>

          {isExpanded && (
            <button className={styles.collapseBtn} onClick={onToggle} aria-label="Collapse">
              ↑
            </button>
          )}
        </>
      )}
    </div>
  )
}

export function Discover() {
  const [data, setData]                     = useState<ClustersResponse | null>(null)
  const [loading, setLoading]               = useState(true)
  const [error, setError]                   = useState<string | null>(null)
  const [retryCount, setRetryCount]         = useState(0)
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set())
  const getToken    = useGetToken()
  const getTokenRef = useRef(getToken)
  getTokenRef.current = getToken

  useEffect(() => {
    setLoading(true)
    setError(null)
    void (async () => {
      try {
        const token = await getTokenRef.current().catch(() => null).then(t => t ?? undefined)
        setData(await fetchClusters(token))
      } catch (e) {
        setError('Failed to load')
        console.error(e)
      } finally {
        setLoading(false)
      }
    })()
  }, [retryCount])

  function toggleGroup(i: number) {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  const clusters = data?.clusters ?? []
  const groups   = groupConsecutive(clusters)

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.heading}>Where next?</h1>
        <p className={styles.subheading}>
          Wed–Tue windows · ranked by your taste · {clusters.length} options
        </p>
      </div>

      <div className={styles.list}>
        {loading && (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        )}

        {error && (
          <div className={styles.errorState}>
            <p className={styles.errorText}>{error}</p>
            <button className={styles.retryButton} onClick={() => setRetryCount(c => c + 1)}>
              Try again
            </button>
          </div>
        )}

        {!loading && !error && clusters.length === 0 && (
          <p className={styles.empty}>No events found in the coming weeks.</p>
        )}

        {groups.map((group, i) => (
          <ClusterGroup
            key={`${group.primary.city.slug}-${group.primary.from}`}
            group={group}
            isExpanded={expandedGroups.has(i)}
            onToggle={() => toggleGroup(i)}
          />
        ))}
      </div>
    </div>
  )
}
