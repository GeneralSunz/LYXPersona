import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import styles from './Stats.module.css'

/* ═══════════════════════════════════════════════════════════════
   访问统计（仅管理员）
   ───────────────────────────────────────────────────────────────
   数据源：public.page_views。该表只对 authenticated 开放 SELECT，
   anon 既读不到也写不进（写入只走 track-visit 函数）。
   ═══════════════════════════════════════════════════════════════ */

interface ViewRow {
  path: string
  referrer_host: string | null
  ip_hash: string | null
  session_id: string | null
  user_agent: string | null
  created_at: string
}

/** 明细聚合的窗口。总量用 count 单独取，不受这个上限影响 */
const DETAIL_LIMIT = 3000
const TREND_DAYS = 7

function deviceOf(ua: string | null): string {
  if (!ua) return '未知'
  if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS'
  if (/Android/i.test(ua)) return 'Android'
  if (/Windows/i.test(ua)) return 'Windows'
  if (/Macintosh|Mac OS X/i.test(ua)) return 'macOS'
  if (/Linux/i.test(ua)) return 'Linux'
  return '其他'
}

function startOfToday(): number {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return '刚刚'
  if (m < 60) return `${m} 分钟前`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} 小时前`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d} 天前`
  return new Date(iso).toLocaleDateString('zh-CN')
}

function fmtTime(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ` +
    `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** 把 [标签, 次数] 数组按次数降序取前 n */
function topN(map: Map<string, number>, n: number): [string, number][] {
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n)
}

function bump(map: Map<string, number>, key: string) {
  map.set(key, (map.get(key) || 0) + 1)
}

export default function Stats() {
  const [total, setTotal] = useState(0)
  const [rows, setRows] = useState<ViewRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [countRes, rowsRes] = await Promise.all([
        supabase
          .from('page_views')
          .select('id', { count: 'exact', head: true })
          .eq('is_bot', false),
        supabase
          .from('page_views')
          .select('path, referrer_host, ip_hash, session_id, user_agent, created_at')
          .eq('is_bot', false)
          .order('created_at', { ascending: false })
          .limit(DETAIL_LIMIT),
      ])

      if (rowsRes.error) throw rowsRes.error
      setTotal(countRes.count ?? 0)
      setRows((rowsRes.data ?? []) as ViewRow[])
    } catch (e) {
      setError(e instanceof Error ? e.message : '读取失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load, reloadKey])

  const stat = useMemo(() => {
    const todayStart = startOfToday()
    const visitors = new Set<string>()
    const todayVisitors = new Set<string>()
    const paths = new Map<string, number>()
    const refs = new Map<string, number>()
    const devices = new Map<string, number>()
    const sessions = new Set<string>()
    let today = 0

    // 近 7 天（含今天）的日序列，先铺好零值再累加，避免没有访问的那天缺柱
    const days: { label: string; key: string; pv: number }[] = []
    for (let i = TREND_DAYS - 1; i >= 0; i--) {
      const d = new Date()
      d.setHours(0, 0, 0, 0)
      d.setDate(d.getDate() - i)
      days.push({
        label: `${d.getMonth() + 1}/${d.getDate()}`,
        key: `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`,
        pv: 0,
      })
    }
    const dayIndex = new Map(days.map((d, i) => [d.key, i]))

    for (const r of rows) {
      const t = new Date(r.created_at)
      if (t.getTime() >= todayStart) today++
      if (r.ip_hash) {
        visitors.add(r.ip_hash)
        if (t.getTime() >= todayStart) todayVisitors.add(r.ip_hash)
      }
      if (r.session_id) sessions.add(r.session_id)
      bump(paths, r.path)
      bump(refs, r.referrer_host || '直接访问')
      bump(devices, deviceOf(r.user_agent))
      const k = `${t.getFullYear()}-${t.getMonth()}-${t.getDate()}`
      const idx = dayIndex.get(k)
      if (idx !== undefined) days[idx].pv++
    }

    return {
      uv: visitors.size,
      today,
      todayUv: todayVisitors.size,
      sessions: sessions.size,
      paths: topN(paths, 8),
      refs: topN(refs, 6),
      devices: topN(devices, 5),
      days,
      maxDay: Math.max(1, ...days.map(d => d.pv)),
      recent: rows.slice(0, 25),
    }
  }, [rows])

  const maxPath = Math.max(1, ...stat.paths.map(([, n]) => n))

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <span className="plate-caption">Traffic</span>
          <h1 className={styles.title}>访问统计</h1>
        </div>
        <button className={styles.refresh} onClick={() => setReloadKey(k => k + 1)} disabled={loading}>
          {loading ? '读取中…' : '刷新'}
        </button>
      </header>

      {error ? (
        <div className={styles.error}>
          <p>读不到统计数据：{error}</p>
          <p className={styles.errorHint}>
            该表只对已登录的管理员开放。若确认已登录仍失败，检查 008_page_views.sql 是否已应用。
          </p>
        </div>
      ) : (
        <>
          {/* ── 总量 ── */}
          <div className={styles.cards}>
            <div className={styles.card}>
              <span className={styles.cardValue}>{total.toLocaleString()}</span>
              <span className={styles.cardLabel}>总访问量 PV</span>
            </div>
            <div className={styles.card}>
              <span className={styles.cardValue}>{stat.uv.toLocaleString()}</span>
              <span className={styles.cardLabel}>独立访客 UV</span>
            </div>
            <div className={styles.card}>
              <span className={styles.cardValue}>{stat.today.toLocaleString()}</span>
              <span className={styles.cardLabel}>今日访问</span>
            </div>
            <div className={styles.card}>
              <span className={styles.cardValue}>{stat.todayUv.toLocaleString()}</span>
              <span className={styles.cardLabel}>今日访客</span>
            </div>
            <div className={styles.card}>
              <span className={styles.cardValue}>{stat.sessions.toLocaleString()}</span>
              <span className={styles.cardLabel}>会话数</span>
            </div>
          </div>

          {total === 0 ? (
            <div className={styles.empty}>
              还没有记录。统计数据从部署那一刻开始累积，之前的访问无法追溯。
            </div>
          ) : (
            <>
              {/* ── 近 7 天趋势 ── */}
              <section className={styles.panel}>
                <h2 className={styles.panelTitle}>近 {TREND_DAYS} 天</h2>
                <div className={styles.trend}>
                  {stat.days.map(d => (
                    <div className={styles.trendCol} key={d.key}>
                      <span className={styles.trendValue}>{d.pv || ''}</span>
                      <div
                        className={styles.trendBar}
                        style={{ height: `${Math.round((d.pv / stat.maxDay) * 100)}%` }}
                        title={`${d.label} · ${d.pv} 次`}
                      />
                      <span className={styles.trendLabel}>{d.label}</span>
                    </div>
                  ))}
                </div>
              </section>

              <div className={styles.grid}>
                {/* ── 热门页面 ── */}
                <section className={styles.panel}>
                  <h2 className={styles.panelTitle}>热门页面</h2>
                  <ul className={styles.bars}>
                    {stat.paths.map(([p, n]) => (
                      <li className={styles.barRow} key={p}>
                        <span className={styles.barName} title={p}>{p}</span>
                        <span className={styles.barTrack}>
                          <span className={styles.barFill} style={{ width: `${(n / maxPath) * 100}%` }} />
                        </span>
                        <span className={styles.barValue}>{n}</span>
                      </li>
                    ))}
                  </ul>
                </section>

                {/* ── 来源 ── */}
                <section className={styles.panel}>
                  <h2 className={styles.panelTitle}>来源</h2>
                  <ul className={styles.bars}>
                    {stat.refs.map(([r, n]) => {
                      const max = Math.max(1, ...stat.refs.map(([, v]) => v))
                      return (
                        <li className={styles.barRow} key={r}>
                          <span className={styles.barName} title={r}>{r}</span>
                          <span className={styles.barTrack}>
                            <span className={styles.barFill} style={{ width: `${(n / max) * 100}%` }} />
                          </span>
                          <span className={styles.barValue}>{n}</span>
                        </li>
                      )
                    })}
                  </ul>

                  <h2 className={`${styles.panelTitle} ${styles.panelTitleGap}`}>设备</h2>
                  <ul className={styles.chips}>
                    {stat.devices.map(([d, n]) => (
                      <li className={styles.chip} key={d}>
                        {d}<em>{n}</em>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>

              {/* ── 最近访问 ── */}
              <section className={styles.panel}>
                <h2 className={styles.panelTitle}>
                  最近访问
                  <em className={styles.panelNote}>
                    明细取最近 {Math.min(rows.length, DETAIL_LIMIT)} 条 · 已剔除爬虫
                  </em>
                </h2>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>时间</th>
                        <th>页面</th>
                        <th>来源</th>
                        <th>设备</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stat.recent.map((r, i) => (
                        <tr key={`${r.created_at}-${i}`}>
                          <td className={styles.tdTime} title={new Date(r.created_at).toLocaleString('zh-CN')}>
                            {relativeTime(r.created_at)}
                            <em>{fmtTime(r.created_at)}</em>
                          </td>
                          <td className={styles.tdPath}>{r.path}</td>
                          <td>{r.referrer_host || '直接访问'}</td>
                          <td>{deviceOf(r.user_agent)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </>
      )}
    </div>
  )
}
