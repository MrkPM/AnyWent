import { Link, useLocation } from 'react-router-dom'
import styles from './Nav.module.css'

const links = [
  { to: '/',      label: 'Discover' },
  { to: '/saved', label: 'Saved' },
]

export function Nav() {
  const { pathname } = useLocation()
  return (
    <nav className={styles.nav}>
      <Link to="/" className={styles.logo}>AnyWent</Link>
      <div className={styles.links}>
        {links.map(l => (
          <Link
            key={l.to}
            to={l.to}
            className={pathname === l.to ? `${styles.link} ${styles.active}` : styles.link}
          >
            {l.label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
