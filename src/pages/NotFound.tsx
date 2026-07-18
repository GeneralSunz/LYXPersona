import { Link } from 'react-router-dom'
import styles from './NotFound.module.css'

export default function NotFound() {
  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <h1 className={styles.code}>404</h1>
        <p className={styles.message}>页面未找到</p>
        <Link to="/" className={styles.back}>返回首页</Link>
      </div>
    </div>
  )
}
