import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../store/AuthContext'
import styles from './Login.module.css'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const { signIn, user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) navigate('/admin', { replace: true })
  }, [user, navigate])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const msg = await signIn(email, password)
      if (msg) setError(msg)
      // 不在此处手动 navigate，交给 useEffect 监听 user 变化后自动跳转，
      // 避免 ProtectedRoute 在 user 尚未更新时重定向回登录页
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.page}>
      {/* 与下载门户同一套版记底图 */}
      <div className="app-bg parchment-bg furnace-glow">
        <div className="guide-grid" />
        <div className="arch-gate bg-arch" />
        <div className="sun-disc bg-sun" />
      </div>
      <div className="app-vignette" />

      <form className={styles.form} onSubmit={handleSubmit}>
        <Link to="/" className={styles.backLink}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          返回下载页
        </Link>

        <div className="header-caption">
          <span className="plate-caption">Sarkaz · Soul Furnace</span>
        </div>

        <h1 className={styles.title}>熔炉档案局</h1>
        <p className={styles.desc}>管理员验证 · 登录以管理档案</p>

        {error && <p className={styles.error}>{error}</p>}

        <label className={styles.label}>
          邮箱
          <input
            className={styles.input}
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="admin@example.com"
            required
          />
        </label>

        <label className={styles.label}>
          密码
          <input
            className={styles.input}
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="输入密码"
            required
          />
        </label>

        <button className={styles.btn} type="submit" disabled={submitting}>
          {submitting ? '验证中...' : '登录'}
        </button>
      </form>
    </div>
  )
}
