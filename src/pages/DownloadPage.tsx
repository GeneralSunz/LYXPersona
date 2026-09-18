import { useState, useEffect, useMemo, lazy, Suspense } from 'react'
import { Link } from 'react-router-dom'
import { isSupabaseConfigured } from '../lib/supabase'
import { fetchAllFiles, fetchFolders } from '../lib/database'
import type { FileItem, Folder } from '../types/file'
import { formatSize } from '../utils/format'
import {
  THEME,
  STATE_NOTES,
  FLOOR_OMEGA,
  FLOOR_INTERLUDE,
  FLOORS,
  floorForDepth,
  QUOTES,
  PLATE_SECTIONS,
} from '../content/sarkaz'

import StarBackground from '../components/StarBackground'
import FurnaceAtmosphere from '../components/FurnaceAtmosphere'
import CelestialBody from '../components/CelestialBody'

const FilePreview = lazy(() => import('../components/FilePreview'))

/** supabase-js 抛出的可能是 Error、PostgrestError 纯对象或字符串，统一成一行可读文本 */
function describeError(e: unknown): string {
  const tidy = (s: string) => {
    const one = s.replace(/\s+/g, ' ').trim()
    return one.length > 200 ? one.slice(0, 200) + ' …' : one
  }
  if (!e) return '未知错误'
  if (e instanceof Error) return tidy(e.message)
  if (typeof e === 'string') return tidy(e)
  const o = e as Record<string, unknown>
  const parts = [o.message, o.code, o.details, o.hint]
    .filter(v => typeof v === 'string' && v)
    .map(String)
  if (parts.length) return tidy(parts.join(' · '))
  try { return tidy(JSON.stringify(e)) } catch { return tidy(String(e)) }
}

/** 把常见错误翻译成一句人话，别让用户只看到一串技术细节 */
function diagnoseError(msg: string): string | null {
  const m = msg.toLowerCase()
  if (m.includes('failed to fetch') || m.includes('fetch failed') || m.includes('load failed') || m.includes('networkerror'))
    return '网络请求失败：后端已被暂停，或域名暂时不可达。'
  if (m.includes('请求超时')) return '请求超时：后端响应过慢或不可达。'
  if (m.includes('pgrst205') || m.includes('does not exist') || m.includes('schema cache'))
    return '数据表不可见：迁移未应用，或 API 角色缺少授权（见 006_grants.sql）。'
  if (m.includes('invalid api key') || m.includes('jwt'))
    return 'API Key 无效或已被轮换，需要更新 env 配置。'
  if (m.includes('permission denied')) return '权限不足：RLS 策略或 GRANT 缺失。'
  return null
}

/** 尊重系统的减弱动效设置 —— 格言轮换与氛围层都以此为准 */
function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** 数字滚动：统计栏的三个数从 0 走到目标值，落定时用缓出，不做回弹 */
function useCountUp(target: number, enabled: boolean, duration = 950): number {
  const [value, setValue] = useState(enabled ? 0 : target)

  useEffect(() => {
    if (!enabled) { setValue(target); return }
    let raf = 0
    const t0 = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration)
      setValue(target * (1 - Math.pow(1 - p, 3)))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, enabled, duration])

  return value
}

export default function DownloadPage() {
  const [allFiles, setAllFiles] = useState<FileItem[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string | null; name: string }[]>([{ id: null, name: '档案总览' }])
  const [search, setSearch] = useState('')
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null)
  const [isNavigating, setIsNavigating] = useState(false)
  const [navKey, setNavKey] = useState(0)
  const [loading, setLoading] = useState(isSupabaseConfigured())
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [quoteIndex, setQuoteIndex] = useState(0)

  // Load data
  // 注意：失败必须显式落到 loadError —— 早期版本用 .catch(() => {}) 静默吞掉，
  // 结果「后端被暂停」在界面上长得跟「确实没有档案」一模一样，掩盖过一次真实故障。
  useEffect(() => {
    if (!isSupabaseConfigured()) return
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    Promise.all([fetchAllFiles(), fetchFolders()])
      .then(([files, flds]) => {
        if (cancelled) return
        setAllFiles(files)
        setFolders(flds)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setLoadError(describeError(e))
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [reloadKey])

  // 统计栏的格言轮换：慢速交叉淡入，只换文字不加特效
  useEffect(() => {
    if (prefersReducedMotion()) return
    const id = window.setInterval(() => setQuoteIndex(i => (i + 1) % QUOTES.length), 9000)
    return () => window.clearInterval(id)
  }, [])

  // 背景视差、灰烬、聚光、扫描线等展示层全部收敛在 FurnaceAtmosphere 里，
  // 它通过 --par-x / --par-y / --scroll-shift 广播给底图，本页不再自己监听指针。

  // Compute items to display
  const items = useMemo(() => {
    const q = search.toLowerCase()
    let shownFolders = folders.filter(f =>
      currentFolderId === null ? !f.parentId : f.parentId === currentFolderId
    )
    if (search) {
      shownFolders = shownFolders.filter(f => f.name.toLowerCase().includes(q))
    }
    const shownFiles = allFiles.filter(f => {
      // 搜索时：根目录全局搜索，子文件夹内仅搜当前文件夹
      if (search) {
        return currentFolderId === null
          ? f.name.toLowerCase().includes(q)
          : f.folderId === currentFolderId && f.name.toLowerCase().includes(q)
      }
      // 非搜索时：根目录显示未归档文件，子文件夹内显示对应文件
      return currentFolderId === null
        ? f.folderId === null
        : f.folderId === currentFolderId
    })
    return [
      ...shownFolders.map(f => ({ kind: 'folder' as const, id: f.id, name: f.name })),
      ...shownFiles.map(f => ({ kind: 'file' as const, id: f.id, name: f.name, file: f })),
    ]
  }, [allFiles, folders, currentFolderId, search])

  // Navigation with exit animation
  const navigateTo = (folderId: string | null) => {
    if (isNavigating) return
    setIsNavigating(true)

    setTimeout(() => {
      setCurrentFolderId(folderId)
      if (folderId === null) {
        setBreadcrumbs([{ id: null, name: '档案总览' }])
      } else {
        const trail: { id: string | null; name: string }[] = [{ id: null, name: '档案总览' }]
        const build = (fId: string | null) => {
          if (!fId) return
          const folder = folders.find(f => f.id === fId)
          if (!folder) return
          if (folder.parentId) build(folder.parentId)
          trail.push({ id: folder.id, name: folder.name })
        }
        build(folderId)
        setBreadcrumbs(trail)
      }
      setSearch('')
      setNavKey(k => k + 1)
      setIsNavigating(false)
    }, 250)
  }

  const handleItemClick = (item: typeof items[number]) => {
    if (item.kind === 'folder') {
      navigateTo(item.id)
    } else {
      setPreviewFile(item.file!)
    }
  }

  const isRoot = currentFolderId === null && !search
  const totalSize = allFiles.reduce((s, f) => s + f.size, 0)

  // 卷宗层数 → 熔炉层级：进第一层卷宗即第Ⅰ层「熔魂之始」
  const depth = breadcrumbs.length - 1
  const floor = search ? FLOOR_INTERLUDE : floorForDepth(depth)
  const showFloorPlate = Boolean(search) || depth > 0
  const quote = QUOTES[quoteIndex]

  // 统计栏数字滚动（减弱动效时直接落值）
  const animateStats = !prefersReducedMotion()
  const filesShown = useCountUp(allFiles.length, animateStats)
  const sizeShown = useCountUp(totalSize, animateStats)
  const foldersShown = useCountUp(folders.length, animateStats)

  return (
    <div className="app-frame">
      {/* Background layers —— 参考图照片 + 制图辅助线 + 拱门/日轮/色块母题 */}
      {/* Background layers —— 参考图照片 + 制图辅助线 + 拱门/日轮/色块母题 */}
      <div className="app-bg parchment-bg furnace-glow">
        <div className="guide-grid" />
        <div className="arch-gate bg-arch" />
        <div className="sun-disc bg-sun" />
        <div className="bg-sun-pulse" aria-hidden="true"><span /><span /><span /></div>
        <div className="sector-block sector-block--bowl bg-sector-l" />
        <div className="sector-block sector-block--tri bg-sector-r" />
        <div className="checker-strip bg-checker" />
      </div>
      <div className="app-vignette" />

      <StarBackground />
      <FurnaceAtmosphere />

      <div className="app-container">
        {/* ═══ Header ═══ */}
        <header className="app-header">
          {/* Corner brackets */}
          <svg className="corner-tl" viewBox="0 0 20 20"><use href="#corner-tl" /></svg>
          <svg className="corner-tr" viewBox="0 0 20 20"><use href="#corner-tr" /></svg>
          <svg className="corner-bl" viewBox="0 0 20 20"><use href="#corner-bl" /></svg>
          <svg className="corner-br" viewBox="0 0 20 20"><use href="#corner-br" /></svg>

          {/* 拉丁版记行 —— 主题副题 + 系列归属，中间一枚砂金飞鸟符 */}
          <div className="header-caption">
            <span className="plate-caption">{THEME.subtitle}</span>
            <svg className="header-caption-glyph" viewBox="0 0 24 16" aria-hidden="true">
              <use href="#gold-bird" />
            </svg>
            <span className="plate-caption">集成战略</span>
          </div>

          {/* Title ornaments —— 两翼饰线夹一枚日轮 */}
          <div className="title-ornament-bar">
            <svg viewBox="0 0 60 28" preserveAspectRatio="none"><use href="#title-orn-l" /></svg>
            <svg className="title-ornament-sun" viewBox="0 0 80 80"><use href="#sun-gate" /></svg>
            <svg viewBox="0 0 60 28" preserveAspectRatio="none"><use href="#title-orn-r" /></svg>
          </div>

          {/* Title —— 全站唯一的名称 */}
          <h1 className="app-title">熔炉档案局</h1>
          <p className="app-subtitle">魂灵熔炉</p>

          {/* 预言诗篇（节选）—— 原文四行，此处照录前两行 */}
          <div className="prophecy">
            <span className="prophecy-label">{THEME.prophecyLabel}</span>
            {THEME.prophecy.map(line => (
              <p className="prophecy-line" key={line}>{line}</p>
            ))}
          </div>

          {/* Header divider */}
          <div className="header-divider">
            <div className="header-divider-line" />
            <svg viewBox="0 0 28 12"><use href="#chain-divider" /></svg>
            <div className="header-divider-line" />
          </div>
        </header>

        {/* ═══ Toolbar ═══ */}
        <div className="toolbar">
          {/* Toolbar corner brackets */}
          <svg className="corner-tl" viewBox="0 0 14 14"><use href="#corner-blood-tl" /></svg>

          {!isRoot && (
            <button
              className="toolbar-back"
              onClick={() => navigateTo(
                currentFolderId !== null
                  ? breadcrumbs[breadcrumbs.length - 2]?.id ?? null
                  : null
              )}
              title="返回上级"
            >
              <svg viewBox="0 0 24 24"><use href="#arrow-left" /></svg>
              <span>返回</span>
            </button>
          )}

          <nav className="breadcrumb">
            {breadcrumbs.map((cr, i) => (
              <span key={cr.id ?? 'root'} className="breadcrumb-row">
                {i > 0 && (
                  <span className="breadcrumb-sep">
                    <svg viewBox="0 0 14 20"><use href="#chevron-right" /></svg>
                  </span>
                )}
                <button
                  className={`breadcrumb-btn${i === breadcrumbs.length - 1 ? ' breadcrumb-btn--active' : ''}`}
                  onClick={() => navigateTo(cr.id)}
                >
                  {cr.name}
                </button>
              </span>
            ))}
          </nav>

          <div className="search-wrap">
            <svg className="search-icon" viewBox="0 0 24 24">
              <circle cx="10" cy="10" r="6" fill="none" stroke="#c89b3c" strokeWidth="1.2" opacity="0.6" />
              <line x1="14.5" y1="14.5" x2="21" y2="21" stroke="#c89b3c" strokeWidth="1.2" opacity="0.6" />
            </svg>
            <input
              className="search-input"
              type="text"
              placeholder="探明去路 · 搜索档案"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* ═══ 层级版记 —— 卷宗的每一层，对应熔炉的一层 ═══ */}
        {showFloorPlate && (
          <div
            className="floor-plate"
            key={`${floor.name}-${navKey}`}
            style={{ '--floor-clr': floor.color } as React.CSSProperties}
          >
            <span className="floor-plate-mark">{floor.mark}</span>
            <div className="floor-plate-body">
              <span className="floor-plate-name">{floor.name}</span>
              <span className="floor-plate-line">{floor.line}</span>
            </div>
          </div>
        )}

        {/* ═══ Stats Bar ═══ */}
        {isRoot && allFiles.length > 0 && (
          <div className="stats-bar">
            <span className="stats-label">旧乡晶尘</span>
            <span className="stats-sep" />
            <svg className="stats-icon" viewBox="0 0 24 24"><use href="#icon-document" /></svg>
            <span>共 {Math.round(filesShown)} 份档案</span>
            <span className="stats-dot">|</span>
            <span>占用 {formatSize(sizeShown)}</span>
            {folders.length > 0 && (
              <>
                <span className="stats-dot">|</span>
                <span>{Math.round(foldersShown)} 个卷宗</span>
              </>
            )}
            <span className="stats-spacer" />
            {/* key 变化触发一次淡入：只换文字，不加动效层 */}
            <span className="stats-quote" key={quoteIndex}>
              {quote.text}
              <em className="stats-quote-source">—— {quote.source}</em>
            </span>
          </div>
        )}

        {/* ═══ File Grid ═══ */}
        <div key={navKey} className={`file-grid${search ? ' file-grid--search' : ''}`}>
          {loading ? (
            <div className="empty-state">
              <div className="loading-spinner" />
              <p className="empty-state-text">正在加载档案...</p>
            </div>
          ) : loadError ? (
            /* 后端不可达 —— 用游戏内的「戛然而止」界面：断开的是熔炉，不是档案 */
            <div
              className="empty-state empty-state--error end-plate"
              style={{ '--floor-clr': FLOOR_OMEGA.color } as React.CSSProperties}
            >
              <span className="end-plate-mark">{FLOOR_OMEGA.mark}</span>
              <h2 className="end-plate-title">{STATE_NOTES.error.title}</h2>
              <p className="end-plate-source">{STATE_NOTES.error.source}</p>
              <p className="end-plate-sub">{STATE_NOTES.error.en}</p>
              <p className="end-plate-line">{STATE_NOTES.error.line}</p>

              <div className="end-plate-rule">
                <span>连接中断</span>
              </div>

              <p className="end-plate-note">
                熔炉后端暂时无法访问，已有档案并未丢失。<br />
                先点下方重试；若持续失败，多半是 Supabase 项目被暂停，需到后台唤醒。
              </p>
              {diagnoseError(loadError) && (
                <p className="error-diagnosis">{diagnoseError(loadError)}</p>
              )}
              <code className="error-detail">{loadError}</code>
              <button className="retry-btn" onClick={() => setReloadKey(k => k + 1)}>
                重试连接
              </button>
            </div>
          ) : (
            <>
              {items.map((item, i) => (
                <CelestialBody
                  key={item.id}
                  item={item}
                  index={i}
                  searchMode={!!search}
                  onClick={() => handleItemClick(item)}
                />
              ))}

              {items.length === 0 && (
                <div
                  className="empty-state end-plate"
                  style={{
                    '--floor-clr': (search ? FLOOR_INTERLUDE : FLOORS[0]).color,
                  } as React.CSSProperties}
                >
                  <span className="end-plate-mark">
                    {search ? FLOOR_INTERLUDE.mark : FLOORS[0].mark}
                  </span>
                  <h2 className="end-plate-title">
                    {search ? STATE_NOTES.search.title : STATE_NOTES.empty.title}
                  </h2>
                  <p className="end-plate-source">
                    {search ? STATE_NOTES.search.source : STATE_NOTES.empty.source}
                  </p>
                  <p className="end-plate-line">
                    {search ? STATE_NOTES.search.line : STATE_NOTES.empty.line}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* ═══ Footer / Status Bar ═══ */}
        <footer className="status-bar">
          <div className="status-divider">
            <div className="status-divider-line" />
            <svg viewBox="0 0 24 10"><use href="#section-divider" /></svg>
            <div className="status-divider-line" />
          </div>
          <div className="status-inner">
            <span className="status-info">
              <svg viewBox="0 0 24 24"><use href="#icon-folder" /></svg>
              熔炉档案局 —— 没有终点，只有未来
            </span>
            <Link to="/" className="admin-link">
              <svg className="admin-link-icon" viewBox="0 0 32 32"><use href="#rune-ring" /></svg>
              返回个人主页
            </Link>
            <Link to="/resume" className="admin-link">
              <svg className="admin-link-icon" viewBox="0 0 32 32"><use href="#rune-ring" /></svg>
              在线简历
            </Link>
            <Link to="/admin" className="admin-link">
              <svg className="admin-link-icon" viewBox="0 0 32 32"><use href="#rune-ring" /></svg>
              管理员入口
            </Link>
          </div>
          {/* 版记分区行 —— 官方专题页的八个分区名，只作索引式的落款 */}
          <div className="status-sections">
            <svg className="status-sections-glyph" viewBox="0 0 24 16" aria-hidden="true">
              <use href="#gold-bird" />
            </svg>
            {PLATE_SECTIONS.map(s => (
              <span className="status-section" key={s.name} title={s.use}>{s.name}</span>
            ))}
          </div>
        </footer>

        {/* ═══ Preview Modal ═══ */}
        {previewFile && (
          <Suspense fallback={null}>
            <FilePreview key={previewFile.id} file={previewFile} onClose={() => setPreviewFile(null)} />
          </Suspense>
        )}
      </div>
    </div>
  )
}
