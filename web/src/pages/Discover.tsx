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
  return sm === em
    ? `${s.getUTCDate()}–${e.getUTCDate()} ${sm}`
    : `${s.getUTCDate()} ${sm} – ${e.getUTCDate()} ${em}`
}

// ── Time horizon grouping ─────────────────────────────────────────────────────

function horizonKey(daysUntil: number): number {
  return Math.floor(Math.max(daysUntil, 0) / 7)
}

function horizonLabel(key: number): string {
  if (key === 0) return 'This Weekend'
  if (key === 1) return 'Next Weekend'
  return `In ${key + 1} Weeks`
}

function groupByHorizon(windows: EventWindow[]): [number, EventWindow[]][] {
  const map = new Map<number, EventWindow[]>()
  for (const w of windows) {
    const key = horizonKey(w.daysUntil)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(w)
  }
  // Sort horizons chronologically; within each, windows already ordered by score from API
  return [...map.entries()].sort(([a], [b]) => a - b)
}

// ── Density bars ──────────────────────────────────────────────────────────────

function DensityProfile({ values }: { values: number[] }) {
  return (
    <div className={styles.density}>
      {values.map((v, i) => (
        <div
          key={i}
          className={styles.densityBar}
          style={{ height: `${Math.max(v, 3)}%` }}
        />
      ))}
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonSection() {
  return (
    <div className={styles.section}>
      <div className={styles.skeletonHeader} />
      {[0, 1, 2].map(i => (
        <div key={i} className={styles.skeleton}>
          <div className={styles.skeletonRank} />
          <div className={styles.skeletonBody}>
            <div className={styles.skeletonCity} style={{ width: `${120 + i * 36}px` }} />
            <div className={styles.skeletonMeta} />
          </div>
          <div className={styles.skeletonBars} />
        </div>
      ))}
    </div>
  )
}

// ── Window card ───────────────────────────────────────────────────────────────

function WindowCard({ window: w, rank }: { window: EventWindow; rank: number }) {
  const navigate = useNavigate()

  function handleClick() {
    navigate(`/?city=${w.city.slug}&from=${w.startDate}&to=${w.endDate}`)
  }

  return (
    <button
      className={styles.card}
      onClick={handleClick}
      aria-label={`${w.city.name}, ${formatDateRange(w.startDate, w.endDate)}, ${w.eventCount} events`}
    >
      <span className={styles.rank}>{pad(rank)}</span>

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

      <DensityProfile values={w.densityProfile} />
    </button>
  )
}

// ── Horizon section ───────────────────────────────────────────────────────────

function HorizonSection({ horizonKey: key, windows }: { horizonKey: number; windows: EventWindow[] }) {
  // Date span of the earliest start → latest end in this group
  const dates = windows.map(w => w.startDate).sort()
  const ends  = windows.map(w => w.endDate).sort()
  const span  = formatDateRange(dates[0], ends[ends.length - 1])

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionLabel}>{horizonLabel(key)}</span>
        <span className={styles.sectionDates}>{span}</span>
      </div>
      {windows.map((w, i) => (
        <WindowCard key={w.id} window={w} rank={i + 1} />
      ))}
    </div>
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
    void (async () => {
      try {
        const token = await Promise.race([
          getTokenRef.current().catch(() => null),
          new Promise<null>(resolve => setTimeout(() => resolve(null), 500)),
        ]).then(t => t ?? undefined)
        setData(await fetchWindows(token))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const horizons = data ? groupByHorizon(data.windows) : []

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.heading}>Where next?</h1>
        <p className={styles.subheading}>
          Best cities by time window, ranked by what's on — personalised when signed in.
        </p>
      </header>

      {loading && (
        <>
          <SkeletonSection />
          <SkeletonSection />
        </>
      )}

      {error && <p className={styles.error}>{error}</p>}

      {data && horizons.length === 0 && (
        <p className={styles.empty}>No upcoming windows found. Check back once scrapers have run.</p>
      )}

      {horizons.map(([key, windows]) => (
        <HorizonSection key={key} horizonKey={key} windows={windows} />
      ))}
    </div>
  )
}
