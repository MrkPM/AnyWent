import styles from './Footer.module.css'

const version = import.meta.env.VITE_VERSION ?? '0.1.0'

export function Footer() {
  return (
    <footer className={styles.footer}>
      <span className={styles.version}>v{version}</span>
    </footer>
  )
}
