import { QueryBar } from '../components/QueryBar.js'
import { EventCard } from '../components/EventCard.js'
import { useEvents } from '../hooks/useEvents.js'
import styles from './Home.module.css'

export function Home() {
  const { data, loading, error, load } = useEvents()

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
