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
  source: string
  sourceUrl: string
}

export function SourceAttribution({ source, sourceUrl }: Props) {
  return (
    <a
      href={sourceUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={styles.attribution}
    >
      Via {SOURCE_LABELS[source] ?? source} ↗
    </a>
  )
}
