import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { fetchEvent } from '../lib/api.js'
import { SourceAttribution } from '../components/SourceAttribution.js'
import { formatDate, formatTime } from '../lib/dates.js'
import type { ApiEvent } from '../types/index.js'
import styles from './EventDetail.module.css'

const TYPE_LABELS: Record<string, string> = {
  concert:    'Concert',
  club_night: 'Club Night',
  exhibition: 'Exhibition',
  festival:   'Festival',
  opening:    'Opening',
  other:      'Event',
}

const VENUE_TYPE_LABELS: Record<string, string> = {
  club:          'Club',
  concert_hall:  'Concert Hall',
  museum:        'Museum',
  gallery:       'Gallery',
  project_space: 'Project Space',
  festival_site: 'Festival Site',
  other:         'Venue',
}

function formatDateRange(startsAt: string, endsAt: string | null): string {
  const startDay = startsAt.slice(0, 10)
  const endDay   = endsAt?.slice(0, 10) ?? null
  if (!endDay || endDay === startDay) return formatDate(startsAt)
  return `${formatDate(startsAt)} – ${formatDate(endsAt!)}`
}

export function EventDetail() {
  const { id } = useParams<{ id: string }>()
  const [event, setEvent] = useState<ApiEvent | null>(null)
  const [error, setError]   = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    fetchEvent(id).then(setEvent).catch(err => setError(err.message))
  }, [id])

  if (error) return <p className={styles.error}>{error}</p>
  if (!event) return <p className={styles.loading}>Loading…</p>

  const isMultiDay = event.endsAt && event.endsAt.slice(0, 10) !== event.startsAt.slice(0, 10)
  const headliner  = event.artists.find(a => a.role === 'headliner') ?? event.artists[0]
  const supporting = event.artists.filter(a => a !== headliner)

  return (
    <div className={styles.page}>
      <Link to="/" className={styles.back}>← Back</Link>

      {/* Hero image */}
      <div className={styles.hero}>
        {event.imageUrl && (
          <img
            src={event.imageUrl}
            alt=""
            className={styles.heroImg}
            onError={e => { e.currentTarget.style.display = 'none' }}
          />
        )}
      </div>

      {/* Type badge */}
      <span className={styles.typeBadge}>
        {TYPE_LABELS[event.type] ?? event.type}
      </span>

      <h1 className={styles.title}>{event.title}</h1>

      <div className={styles.meta}>
        <span className={styles.venue}>{event.venue.name}</span>
        <span className={styles.dot}>·</span>
        <span>{VENUE_TYPE_LABELS[event.venue.type] ?? event.venue.type}</span>
        <span className={styles.dot}>·</span>
        <span>{formatDateRange(event.startsAt, event.endsAt)}</span>
        {!isMultiDay && event.timeKnown && (
          <>
            <span className={styles.dot}>·</span>
            <span>{formatTime(event.startsAt)}</span>
          </>
        )}
      </div>

      {/* Lineup */}
      {event.artists.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionLabel}>Lineup</h2>
          <ul className={styles.artists}>
            {headliner && (
              <li className={styles.artist}>
                <span className={styles.artistName}>{headliner.name}</span>
                <span className={styles.role}>Headliner</span>
              </li>
            )}
            {supporting.map(a => (
              <li key={a.id} className={styles.artist}>
                <span className={styles.artistName}>{a.name}</span>
                {a.role && <span className={styles.role}>{a.role}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className={styles.actions}>
        <SourceAttribution sources={event.sources} />
      </div>
    </div>
  )
}
