import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchWindows } from '../lib/api.js'
import { useGetToken } from '../hooks/useAuth.js'
import type { WindowsResponse, EventWindow } from '../types/index.js'
import styles from './Discover.module.css'

function pad(n: number) { return String(n).padStart(2, '0') }

function formatDateRange(start: string, end: string): string {
  const s = new Date(start + 'T12:00:00Z')
  const e = new Date(end   + 'T12:00:00Z')
  const sm = s.toLocaleDateString('en-GB', { month: 'short' })
  const em = e.toLocaleDateString('en-GB', { month: 'short' })
  const sd = s.getUTCDate()
  const ed = e.getUTCDate()
  return sm === em ? `${sd}–${ed} ${sm}` : `${sd} ${sm} – ${ed} ${em}`
}

function urgencyLabel(days: number): string {
  if (days <= 0)  return 'now'
  if (days === 1) return 'tomorrow'
  if (days < 7)  return `in ${days} days`
  const weeks = Math.ceil(days / 7)
  return `in ${weeks} ${weeks === 1 ? 'week' : 'weeks'}`
}

// ── Density bars ─────────────────────────────────────────────────────────────

function DensityProfile({ values, highlight }: { values: number[]; highlight: boolean }) {
  return (
    <div className={styles.density}>
      {values.map((v, i) => (
        <div
          key={i}
          className={styles.densityBar}
          style={{
            height: `${Math.max(v, 3)}%`,
            opacity: highlight && v > 60 ? 1 : highlight ? 0.5 : v > 60 ? 0.7 : 0.3,
          }}
        />
      ))}
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonCard({ rank }: { rank: number }) {
  return (
    <div className={styles.skeleton}>
      <span className={styles.skeletonRank}>{pad(rank)}</span>
      <div className={styles.skeletonBody}>
        <div className={styles.skeletonCity} style={{ width: `${140 + (rank % 3) * 40}px` }} />
        <div className={styles.skeletonMeta} />
      </div>
      <div className={styles.skeletonRight}>
        <div className={styles.skeletonBars} />
        <div className={styles.skeletonDays} />
      </div>
    </div>
  )
}

// ── Window card ───────────────────────────────────────────────────────────────

function WindowCard({ window: w, rank }: { window: EventWindow; rank: number }) {
  const navigate = useNavigate()
  const urgent = w.daysUntil < 7
  const isTop  = rank === 1

  function handleClick() {
    // Navigate to city mode — Home reads these search params on mount
    navigate(`/?city=${w.city.slug}&from=${w.startDate}&to=${w.endDate}`)
  }

  return (
    <button
      className={`${styles.card} ${isTop ? styles.cardTop : ''}`}
      onClick={handleClick}
      aria-label={`${w.city.name}, ${formatDateRange(w.startDate, w.endDate)}, ${w.eventCount} events`}
    >
      <span className={`${styles.rank} ${isTop ? styles.rankTop : ''}`}>{pad(rank)}</span>

      <div className={styles.body}>
        <div className={styles.cityRow}>
          <span className={styles.cityName}>{w.city.name}</span>
          <span className={styles.countryCode}>{w.city.country.code}</span>
        </div>
        <div className={styles.meta}>
          <span className={styles.dateRange}>{formatDateRange(w.startDate, w.endDate)}</span>
          <span className={styles.dot}>·</span>
          <span className={styles.eventCount}>{w.eventCount} events</span>
        </div>
      </div>

      <div className={styles.right}>
        <DensityProfile values={w.densityProfile} highlight={isTop} />
        <span className={`${styles.daysUntil} ${urgent ? styles.daysUrgent : ''}`}>
          {urgencyLabel(w.daysUntil)}
        </span>
      </div>
    </button>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function Discover() {
  const [data,    setData]    = useState<WindowsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const getToken    = useGetToken()
  const getTokenRef = useRef(getToken)
  getTokenRef.current = getToken

  useEffect(() => {
    const TOKEN_TIMEOUT_MS = 500
    void (async () => {
      try {
        const token = await Promise.race([
          getTokenRef.current().catch(() => null),
          new Promise<null>(resolve => setTimeout(() => resolve(null), TOKEN_TIMEOUT_MS)),
        ]).then(t => t ?? undefined)

        const result = await fetchWindows(token)
        setData(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.heading}>Where next?</h1>
        <p className={styles.subheading}>
          Best city windows ranked by what's on — personalised when you're signed in.
        </p>
      </header>

      <div className={styles.list}>
        {loading && Array.from({ length: 8 }, (_, i) => (
          <SkeletonCard key={i} rank={i + 1} />
        ))}

        {error && (
          <p className={styles.error}>{error}</p>
        )}

        {data && data.windows.length === 0 && (
          <p className={styles.empty}>No upcoming windows found. Check back once scrapers have run.</p>
        )}

        {data && data.windows.map((w, i) => (
          <WindowCard key={w.id} window={w} rank={i + 1} />
        ))}
      </div>
    </div>
  )
}
