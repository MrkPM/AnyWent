import { useState, useEffect } from 'react'
import { fetchCities } from '../lib/api.js'
import { upcomingWeekend } from '../lib/dates.js'
import type { ApiCity } from '../types/index.js'
import styles from './QueryBar.module.css'

interface Query {
  citySlug: string
  from: string
  to: string
}

interface Props {
  onSearch: (query: Query) => void
  loading: boolean
  initialCity?: string
  initialFrom?: string
  initialTo?: string
}

export function QueryBar({ onSearch, loading, initialCity, initialFrom, initialTo }: Props) {
  const [cities, setCities] = useState<ApiCity[]>([])
  const weekend = upcomingWeekend()
  const [citySlug, setCitySlug] = useState(initialCity ?? 'berlin')
  const [from, setFrom] = useState(initialFrom ?? weekend.from)
  const [to, setTo] = useState(initialTo ?? weekend.to)

  useEffect(() => {
    fetchCities().then(setCities).catch(console.error)
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSearch({ citySlug, from, to })
  }

  return (
    <form className={styles.bar} onSubmit={handleSubmit}>
      <div className={styles.field}>
        <span className={styles.label}>City</span>
        <select
          value={citySlug}
          onChange={e => { setCitySlug(e.target.value); onSearch({ citySlug: e.target.value, from, to }) }}
          className={styles.select}
        >
          {cities.length === 0 && <option value="berlin">Berlin</option>}
          {cities.map(c => (
            <option key={c.id} value={c.slug}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className={styles.field}>
        <span className={styles.label}>From</span>
        <input
          type="date"
          value={from}
          max={to}
          onChange={e => {
            const val = e.target.value
            setFrom(val)
            if (val > to) setTo(val)
          }}
          className={styles.input}
        />
      </div>

      <div className={styles.field} style={{ borderRight: 'none', marginRight: 0 }}>
        <span className={styles.label}>To</span>
        <input
          type="date"
          value={to}
          min={from}
          onChange={e => {
            const val = e.target.value
            setTo(val)
            if (val < from) setFrom(val)
          }}
          className={styles.input}
        />
      </div>

      <button type="submit" className={styles.button} disabled={loading}>
        {loading ? '…' : 'Search ↗'}
      </button>
    </form>
  )
}
