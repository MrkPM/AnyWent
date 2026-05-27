import { Link } from 'react-router-dom'
import { formatDate, formatTime } from '../lib/dates.js'
import type { ApiEvent } from '../types/index.js'
import styles from './EventCard.module.css'

const SOURCE_LABELS: Record<string, string> = {
  ra: 'RA', songkick: 'Songkick', dice: 'Dice', email: 'Newsletter', manual: 'AnyWent',
}

interface Props { event: ApiEvent }

export function EventCard({ event }: Props) {
  const headliner = event.artists.find(a => a.role === 'headliner') ?? event.artists[0]
  const supporting = event.artists.filter(a => a !== headliner)

  const title = headliner ? headliner.name : event.title
  const subtitle = headliner && event.title !== headliner.name
    ? event.title
    : supporting.length > 0
    ? supporting.slice(0, 3).map(a => a.name).join(', ') + (supporting.length > 3 ? ` +${supporting.length - 3}` : '')
    : null

  return (
    <Link to={`/events/${event.id}`} className={styles.card}>
      <div className={styles.left}>
        <div className={styles.title}>{title}</div>
        {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
        <div className={styles.meta}>
          <span className={styles.venue}>{event.venue.name}</span>
          <span className={styles.dot}>·</span>
          <span className={styles.venue}>{event.venue.type.replace('_', ' ')}</span>
        </div>
      </div>

      <div className={styles.right}>
        <span className={styles.datetime}>
          {formatDate(event.startsAt)} · {formatTime(event.startsAt)}
        </span>
        {event.ticketUrl ? (
          <a
            href={event.ticketUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.tickets}
            onClick={e => e.stopPropagation()}
          >
            Tickets ↗
          </a>
        ) : (
          <a
            href={event.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.source}
            onClick={e => e.stopPropagation()}
          >
            {SOURCE_LABELS[event.source] ?? event.source} ↗
          </a>
        )}
      </div>
    </Link>
  )
}
