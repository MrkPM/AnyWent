import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { fetchEvent } from '../lib/api.js'
import { SourceAttribution } from '../components/SourceAttribution.js'
import { formatDate, formatTime } from '../lib/dates.js'
import type { ApiEvent } from '../types/index.js'
import styles from './EventDetail.module.css'

export function EventDetail() {
  const { id } = useParams<{ id: string }>()
  const [event, setEvent] = useState<ApiEvent | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    fetchEvent(id).then(setEvent).catch(err => setError(err.message))
  }, [id])

  if (error) return <p className={styles.error}>{error}</p>
  if (!event) return <p className={styles.loading}>Loading…</p>

  return (
    <div className={styles.page}>
      <Link to="/" className={styles.back}>← Back</Link>

      <h1 className={styles.title}>{event.title}</h1>

      <div className={styles.meta}>
        <span>{event.venue.name}</span>
        <span className={styles.dot}>·</span>
        <span>{formatDate(event.startsAt)}</span>
        <span className={styles.dot}>·</span>
        <span>{formatTime(event.startsAt)}</span>
      </div>

      {event.artists.length > 0 && (
        <div className={styles.lineup}>
          <h2 className={styles.section}>Lineup</h2>
          <ul className={styles.artists}>
            {event.artists.map(a => (
              <li key={a.id} className={styles.artist}>
                <span className={styles.artistName}>{a.name}</span>
                {a.role && <span className={styles.role}>{a.role}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className={styles.actions}>
        {event.ticketUrl && (
          <a
            href={event.ticketUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.ticketBtn}
          >
            Get Tickets ↗
          </a>
        )}
        <SourceAttribution source={event.source} sourceUrl={event.sourceUrl} />
      </div>
    </div>
  )
}
