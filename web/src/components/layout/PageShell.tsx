import { Nav } from './Nav.js'
import { Footer } from './Footer.js'
import styles from './PageShell.module.css'

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.shell}>
      <Nav />
      <main className={styles.main}>{children}</main>
      <Footer />
    </div>
  )
}
