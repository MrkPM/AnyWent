import { useEffect, useState } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { fetchClusters } from '../lib/api.js'
import { useGetToken } from '../hooks/useAuth.js'
import type { ApiCluster, ApiClusterDay } from '../types/index.js'
import styles from './BundleDetail.module.css'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function generateDates(from: string): string[] {
  const dates: string[] = []
  const start = new Date(from + 'T12:00:00Z')
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setUTCDate(start.getUTCDate() + i)
    dates.push(d.toISOString().slice(0, 10))
  }
  return dates
}

function formatDateRange(from: string, to: string): string {
  const s = new Date(from + 'T12:00:00Z')
  const e = new Date(to   + 'T12:00:00Z')
  return `${s.getUTCDate()} ${MONTHS[s.getUTCMonth()]} – ${e.getUTCDate()} ${MONTHS[e.getUTCMonth()]}`
}

function DayPill({
  date,
  day,
  citySlug,
}: {
  date:     string
  day:      ApiClusterDay | undefined
  citySlug: string
}) {
  const navigate   = useNavigate()
  const d          = new Date(date + 'T12:00:00Z')
  const label      = DAY_LABELS[d.getUTCDay()]
  const num        = d.getUTCDate()
  const score      = day?.score ?? 0
  const eventCount = day?.eventCount ?? 0
  const isMatched  = score > 0

  return (
    <button
      className={`${styles.day} ${isMatched ? styles.matched : styles.dim}`}
      onClick={() => navigate(`/?city=${citySlug}&from=${date}&to=${date}`)}
    >
      <span className={styles.dayLabel}>{label}</span>
      <span className={styles.dayNum}>{num}</span>
      {isMatched && <span className={styles.dayScore}>{score.toFixed(1)}</span>}
      {eventCount > 0
        ? <span className={styles.dayEvents}>{eventCount} ev</span>
        : <span className={styles.dayEvents}>—</span>
      }
    </button>
  )
}

export function BundleDetail() {
  const { citySlug, from, to } = useParams<{ citySlug: string; from: string; to: string }>()
  const location  = useLocation()
  const navigate  = useNavigate()
  const getToken  = useGetToken()

  const stateCluster = (location.state as { cluster?: ApiCluster } | null)?.cluster
  const [cluster, setCluster] = useState<ApiCluster | null>(stateCluster ?? null)
  const [loading, setLoading] = useState(!stateCluster)

  useEffect(() => {
    if (stateCluster) return
    void (async () => {
      try {
        const token = await getToken().catch(() => null).then(t => t ?? undefined)
        const data  = await fetchClusters(token)
        const match = data.clusters.find(
          c => c.city.slug === citySlug && c.from === from && c.to === to,
        )
        setCluster(match ?? null)
      } finally {
        setLoading(false)
      }
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [citySlug, from, to])

  if (loading) {
    return (
      <div className={styles.page}>
        <p className={styles.status}>Loading…</p>
      </div>
    )
  }

  if (!cluster || !from || !citySlug) {
    return (
      <div className={styles.page}>
        <p className={styles.status}>Bundle not found.</p>
        <button className={styles.back} onClick={() => navigate('/discover')}>← Back to Discover</button>
      </div>
    )
  }

  const dates = generateDates(from)
  const dayMap = new Map<string, ApiClusterDay>((cluster.days ?? []).map(d => [d.date, d]))

  return (
    <div className={styles.page}>
      <button className={styles.back} onClick={() => navigate('/discover')}>← Discover</button>

      <div className={styles.header}>
        <div className={styles.cityRow}>
          <h1 className={styles.cityName}>{cluster.city.name}</h1>
          <span className={styles.countryCode}>{cluster.city.country}</span>
        </div>
        <div className={styles.meta}>
          <span className={styles.dateRange}>{formatDateRange(cluster.from, cluster.to)}</span>
          <span className={styles.dot}>·</span>
          <span className={styles.scoreLabel}>score {cluster.clusterScore.toFixed(1)}</span>
          <span className={styles.dot}>·</span>
          <span className={styles.eventsMeta}>
            {cluster.matchedEventCount} matched · {cluster.eventCount} total
          </span>
        </div>
      </div>

      <div className={styles.strip}>
        {dates.map(date => (
          <DayPill key={date} date={date} day={dayMap.get(date)} citySlug={citySlug} />
        ))}
      </div>

      <p className={styles.hint}>Tap any day to see its events</p>
    </div>
  )
}
