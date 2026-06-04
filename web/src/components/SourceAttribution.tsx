import type { ApiEventSource } from '../types/index.js'
import styles from './SourceAttribution.module.css'

const SOURCE_LABELS: Record<string, string> = {
  ra:       'Resident Advisor',
  songkick: 'Songkick',
  goout:    'GoOut',
  dice:     'Dice',
  email:    'Newsletter',
  manual:   'AnyWent',
}

interface Props {
  sources: ApiEventSource[]
}

export function SourceAttribution({ sources }: Props) {
  return (
    <>
      {sources.map(s => (
        <a
          key={s.source}
          href={s.ticketUrl ?? s.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.attribution}
        >
          {s.ticketUrl ? 'Tickets via' : 'Via'} {SOURCE_LABELS[s.source] ?? s.source} ↗
        </a>
      ))}
    </>
  )
}
