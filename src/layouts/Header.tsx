import { Link } from 'react-router-dom'
import { useAuth } from '../store/AuthContext'
import { isSupabaseConfigured } from '../lib/supabase'
import styles from './Header.module.css'

export default function Header() {
  const { user, signOut } = useAuth()
  const configured = isSupabaseConfigured()

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link to="/admin" className={styles.brand}>
          <span className={styles.logo}>熔</span>
          <span className={styles.title}>熔炉档案局</span>
        </Link>
        <div className={styles.actions}>
          <Link to="/" className={styles.downloadLink}>下载门户</Link>
          {configured && user && (
            <>
              <span className={styles.userEmail}>{user.email}</span>
              <button className={styles.logoutBtn} onClick={signOut}>退出</button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
