import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { QueryBar } from '../components/QueryBar.js'
import { EventCard } from '../components/EventCard.js'
import { useEvents } from '../hooks/useEvents.js'
import { useGetToken } from '../hooks/useAuth.js'
import { upcomingWeekend, formatGroupDate } from '../lib/dates.js'
import type { ApiEvent } from '../types/index.js'
import styles from './Home.module.css'

const DEFAULT_CITY = 'berlin'
const ONGOING_KEY  = '__ongoing__'

function groupEventsByDate(events: ApiEvent[], activeFrom: string): [string, ApiEvent[]][] {
  const map = new Map<string, ApiEvent[]>()

  for (const event of events) {
    // Events whose starts_at is before the query window are ongoing exhibitions —
    // bucket them separately rather than showing them under a past date header.
    const key = event.startsAt.slice(0, 10) >= activeFrom
      ? event.startsAt.slice(0, 10)
      : ONGOING_KEY
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(event)
  }

  // Dated groups in chronological order, ongoing bucket at the end
  const dated = [...map.entries()]
    .filter(([k]) => k !== ONGOING_KEY)
    .sort(([a], [b]) => a.localeCompare(b))

  const result: [string, ApiEvent[]][] = [...dated]
  if (map.has(ONGOING_KEY)) result.push([ONGOING_KEY, map.get(ONGOING_KEY)!])
  return result
}

export function Home() {
  const { data, loading, error, load } = useEvents()
  const defaultWeekend = useMemo(() => upcomingWeekend(), [])
  const [searchParams] = useSearchParams()

  const initialCity = searchParams.get('city') ?? DEFAULT_CITY
  const initialFrom = searchParams.get('from') ?? defaultWeekend.from
  const initialTo   = searchParams.get('to')   ?? defaultWeekend.to

  const [activeFrom, setActiveFrom] = useState(initialFrom)

  const getToken    = useGetToken()
  const getTokenRef = useRef(getToken)
  getTokenRef.current = getToken

  useEffect(() => {
    const TOKEN_TIMEOUT_MS = 500
    void (async () => {
      const token = await Promise.race([
        getTokenRef.current().catch(() => null),
        new Promise<null>(resolve => setTimeout(() => resolve(null), TOKEN_TIMEOUT_MS)),
      ]).then(t => t ?? undefined)
      load(initialCity, initialFrom, initialTo, token)
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load])

  const grouped = useMemo(
    () => (data ? groupEventsByDate(data.events, activeFrom) : []),
    [data, activeFrom],
  )

  const totalCount = data?.events.length ?? 0

  return (
    <div>
      <h1 className={styles.heading}>Where should I go this weekend?</h1>

      <QueryBar
        initialCity={initialCity}
        initialFrom={initialFrom}
        initialTo={initialTo}
        onSearch={q => {
          setActiveFrom(q.from)
          void (async () => {
            const token = await getTokenRef.current().catch(() => null).then(t => t ?? undefined)
            load(q.citySlug, q.from, q.to, token)
          })()
        }}
        loading={loading}
      />

      {loading && !data && <p className={styles.loading}>Loading…</p>}
      {error && <p className={styles.error}>{error}</p>}

      {data && (
        <>
          <div className={styles.summary}>
            <span className={styles.city}>{data.city.name}</span>
            <span className={styles.count}>{totalCount} events</span>
          </div>

          {grouped.length === 0 && (
            <p className={styles.empty}>No events found for this city and date range.</p>
          )}

          {grouped.map(([day, events]) => (
            <div key={day} className={styles.dateGroup}>
              <h2 className={styles.dateHeader}>
                {day === ONGOING_KEY ? 'Currently showing' : formatGroupDate(day)}
              </h2>
              {events.map(event => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          ))}
        </>
      )}
    </div>
  )
}
