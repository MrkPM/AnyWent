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

// ── Calendar week grouping (Mon–Sun) ─────────────────────────────────────────

// Returns the Monday of the week containing the given YYYY-MM-DD date.
function weekMonday(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00Z')
  const day = d.getUTCDay()                        // 0=Sun … 6=Sat
  const offset = day === 0 ? 6 : day - 1          // days since Monday
  d.setUTCDate(d.getUTCDate() - offset)
  return d.toISOString().slice(0, 10)
}

function thisMonday(): string {
  return weekMonday(new Date().toISOString().slice(0, 10))
}

function weekLabel(mondayStr: string): string {
  const base = thisMonday()
  const next = new Date(base + 'T12:00:00Z')
  next.setUTCDate(next.getUTCDate() + 7)
  if (mondayStr === base) return 'This Week'
  if (mondayStr === next.toISOString().slice(0, 10)) return 'Next Week'
  const d = new Date(mondayStr + 'T12:00:00Z')
  return `Week of ${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
}

function weekDateRange(mondayStr: string): string {
  const mon = new Date(mondayStr + 'T12:00:00Z')
  const sun = new Date(mon)
  sun.setUTCDate(mon.getUTCDate() + 6)
  return formatDateRange(mon.toISOString().slice(0, 10), sun.toISOString().slice(0, 10))
}

// Group by Mon–Sun calendar week; within each week keep only the best-scoring
// window per city (a city appears once per week, not once per pre-computed window).
function groupByCalendarWeek(windows: EventWindow[]): [string, EventWindow[]][] {
  // week → city → best window
  const weeks = new Map<string, Map<string, EventWindow>>()
  for (const w of windows) {
    const week = weekMonday(w.startDate)
    if (!weeks.has(week)) weeks.set(week, new Map())
    const cities = weeks.get(week)!
    const existing = cities.get(w.city.id)
    if (!existing || w.affinityScore > existing.affinityScore) {
      cities.set(w.city.id, w)
    }
  }
  return [...weeks.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, cityMap]) => [
      week,
      [...cityMap.values()].sort((a, b) => b.affinityScore - a.affinityScore),
    ])
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

// ── Week section ──────────────────────────────────────────────────────────────

function WeekSection({ monday, windows }: { monday: string; windows: EventWindow[] }) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionLabel}>{weekLabel(monday)}</span>
        <span className={styles.sectionDates}>{weekDateRange(monday)}</span>
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

  const weeks = data ? groupByCalendarWeek(data.windows) : []

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.heading}>Where next?</h1>
        <p className={styles.subheading}>
          Best cities by week, ranked by what's on — personalised when signed in.
        </p>
      </header>

      {loading && (
        <>
          <SkeletonSection />
          <SkeletonSection />
        </>
      )}

      {error && <p className={styles.error}>{error}</p>}

      {data && weeks.length === 0 && (
        <p className={styles.empty}>No upcoming windows found. Check back once scrapers have run.</p>
      )}

      {weeks.map(([monday, windows]) => (
        <WeekSection key={monday} monday={monday} windows={windows} />
      ))}
    </div>
  )
}
