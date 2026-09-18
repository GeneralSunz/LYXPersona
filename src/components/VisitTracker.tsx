import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { getAnonKey, getSupabaseUrl, isSupabaseConfigured } from '../lib/supabase'

/**
 * 访问上报
 * ───────────────────────────────────────────────────────────────
 * 挂在路由上，每次路径变化尝试上报一次。三条自我约束：
 *
 *   1. **绝不阻塞页面** —— fire-and-forget，不 await、不重试、失败不提示。
 *   2. **每个会话每条路径只报一次** —— sessionStorage 去重，刷新不重复计数。
 *   3. **尊重 Do Not Track** —— 浏览器明确拒绝追踪就完全不报。
 *
 * 数据经 Edge Function `track-visit` 落库。前端拿不到读权限，
 * page_views 只对已登录的管理员开放 SELECT。
 */
export default function VisitTracker() {
  const { pathname } = useLocation()

  useEffect(() => {
    if (!isSupabaseConfigured()) return

    // ── 尊重 Do Not Track ──
    const dnt = navigator.doNotTrack
      ?? (window as unknown as { doNotTrack?: string }).doNotTrack
    if (dnt === '1' || dnt === 'yes') return

    // ── 会话内去重 ──
    const dedupeKey = `lyx-pv:${pathname}`
    try {
      if (sessionStorage.getItem(dedupeKey)) return
      sessionStorage.setItem(dedupeKey, '1')
    } catch {
      return // 隐私模式下 sessionStorage 可能不可用，那就干脆不报
    }

    // ── 会话 id：把同一次访问里的多个页面串起来 ──
    let sessionId = ''
    try {
      sessionId = sessionStorage.getItem('lyx-sid') || ''
      if (!sessionId) {
        sessionId = crypto.randomUUID()
        sessionStorage.setItem('lyx-sid', sessionId)
      }
    } catch {
      /* 拿不到就留空，不影响计数 */
    }

    try {
      fetch(`${getSupabaseUrl()}/functions/v1/track-visit`, {
        method: 'POST',
        // keepalive 让请求在页面卸载（比如立刻点走）时也能发出去
        keepalive: true,
        headers: {
          'Content-Type': 'application/json',
          apikey: getAnonKey(),
          Authorization: `Bearer ${getAnonKey()}`,
        },
        body: JSON.stringify({
          path: pathname,
          referrer: document.referrer || '',
          sessionId,
        }),
      }).catch(() => { /* 静默 */ })
    } catch {
      /* 静默 */
    }
  }, [pathname])

  return null
}
