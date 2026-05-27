import { useEffect, useMemo } from 'react'
import { QueryBar } from '../components/QueryBar.js'
import { EventCard } from '../components/EventCard.js'
import { useEvents } from '../hooks/useEvents.js'
import { upcomingWeekend } from '../lib/dates.js'
import styles from './Home.module.css'

const DEFAULT_CITY = 'berlin'

export function Home() {
  const { data, loading, error, load } = useEvents()
  const defaultWeekend = useMemo(() => upcomingWeekend(), [])

  // Auto-load on mount with the same defaults the QueryBar shows
  useEffect(() => {
    load(DEFAULT_CITY, defaultWeekend.from, defaultWeekend.to)
  }, [load, defaultWeekend])

  return (
    <div>
      <h1 className={styles.heading}>Where should I go this weekend?</h1>

      <QueryBar onSearch={q => load(q.citySlug, q.from, q.to)} loading={loading} />

      {error && <p className={styles.error}>{error}</p>}

      {data && (
        <>
          <div className={styles.summary}>
            <span className={styles.city}>{data.city.name}</span>
            <span className={styles.count}>{data.events.length} events</span>
          </div>
          <div className={styles.events}>
            {data.events.map(event => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
          {data.events.length === 0 && (
            <p className={styles.empty}>No events found for this city and date range.</p>
          )}
        </>
      )}
    </div>
  )
}
