import { Link } from 'react-router-dom'
import styles from './NotFound.module.css'

export default function NotFound() {
  return (
    <div className={styles.page}>
      {/* 与下载门户同一套版记底图 */}
      <div className="app-bg parchment-bg furnace-glow">
        <div className="guide-grid" />
        <div className="sun-disc bg-sun" />
      </div>
      <div className="app-vignette" />

      <div className={styles.content}>
        <svg className={styles.emblem} viewBox="0 0 80 80" aria-hidden="true">
          <use href="#sun-gate" />
        </svg>
        <h1 className={styles.code}>404</h1>
        <p className={styles.message}>此页未被书写</p>
        <Link to="/" className={styles.back}>返回首页</Link>
      </div>
    </div>
  )
}
