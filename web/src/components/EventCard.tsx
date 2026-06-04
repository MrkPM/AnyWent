import { Link } from 'react-router-dom'
import { formatTime } from '../lib/dates.js'
import type { ApiEvent } from '../types/index.js'
import styles from './EventCard.module.css'

const SOURCE_LABELS: Record<string, string> = {
  ra: 'RA', songkick: 'Songkick', goout: 'GoOut', dice: 'Dice', email: 'Newsletter', manual: 'AnyWent',
}

interface Props { event: ApiEvent; debug?: boolean }

export function EventCard({ event, debug }: Props) {
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
      <div className={styles.thumb}>
        {event.imageUrl && (
          <img
            src={event.imageUrl}
            alt=""
            className={styles.thumbImg}
            onError={e => { e.currentTarget.style.display = 'none' }}
          />
        )}
      </div>
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
        {debug && (
          <span className={styles.score} title="affinity score">
            {event.affinityScore.toFixed(2)}
          </span>
        )}
        <span className={styles.datetime}>
          {event.timeKnown ? formatTime(event.startsAt) : '–'}
        </span>
        <div className={styles.sourceList}>
          {event.sources.map(s => (
            <button
              key={s.source}
              className={styles.source}
              onClick={e => { e.preventDefault(); e.stopPropagation(); window.open(s.ticketUrl ?? s.sourceUrl, '_blank', 'noopener,noreferrer') }}
            >
              {SOURCE_LABELS[s.source] ?? s.source} ↗
            </button>
          ))}
        </div>
      </div>
    </Link>
  )
}
