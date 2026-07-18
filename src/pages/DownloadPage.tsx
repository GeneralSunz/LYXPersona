import { useState, useEffect, useMemo, lazy, Suspense } from 'react'
import { Link } from 'react-router-dom'
import { isSupabaseConfigured } from '../lib/supabase'
import { fetchAllFiles, fetchFolders } from '../lib/database'
import type { FileItem, Folder } from '../types/file'
import { formatSize } from '../utils/format'

import StarBackground from '../components/StarBackground'
import CelestialBody from '../components/CelestialBody'

const FilePreview = lazy(() => import('../components/FilePreview'))

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

  // Load data
  useEffect(() => {
    if (!isSupabaseConfigured()) return
    setLoading(true)
    Promise.all([fetchAllFiles(), fetchFolders()])
      .then(([files, flds]) => { setAllFiles(files); setFolders(flds) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

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

  return (
    <div className="app-frame">
      {/* Background layers */}
      <div className="app-bg parchment-bg furnace-glow" />
      <div className="app-vignette" />

      <StarBackground />

      <div className="app-container">
        {/* ═══ Header ═══ */}
        <header className="app-header">
          {/* Corner brackets */}
          <svg className="corner-tl" viewBox="0 0 20 20"><use href="#corner-tl" /></svg>
          <svg className="corner-tr" viewBox="0 0 20 20"><use href="#corner-tr" /></svg>
          <svg className="corner-bl" viewBox="0 0 20 20"><use href="#corner-bl" /></svg>
          <svg className="corner-br" viewBox="0 0 20 20"><use href="#corner-br" /></svg>

          {/* Title ornaments */}
          <div className="title-ornament-bar">
            <svg viewBox="0 0 60 28"><use href="#title-orn-l" /></svg>
            <svg viewBox="0 0 60 28"><use href="#title-orn-r" /></svg>
          </div>

          {/* Title */}
          <h1 className="app-title">熔炉档案局</h1>
          <p className="app-subtitle">魂灵熔炉 · 卡兹戴尔的能量之源</p>

          {/* Wiki descriptions */}
          <p className="app-desc">死魂灵的声音将你引离现实。一场仪式，一场沟通。超脱大地的畅想即将开始。</p>
          <p className="app-desc-detail">我见诸城，满目疮痍；我见源石，布满大地。</p>

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
              placeholder="搜索档案..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* ═══ Stats Bar ═══ */}
        {isRoot && allFiles.length > 0 && (
          <div className="stats-bar">
            <svg className="stats-icon" viewBox="0 0 24 24"><use href="#icon-document" /></svg>
            <span>共 {allFiles.length} 份档案</span>
            <span className="stats-dot">|</span>
            <span>占用 {formatSize(totalSize)}</span>
            {folders.length > 0 && (
              <>
                <span className="stats-dot">|</span>
                <span>{folders.length} 个卷宗</span>
              </>
            )}
            <span className="stats-spacer" />
            <span className="stats-quote">燃烧在萨卡兹的文明里似乎有特殊的含义</span>
          </div>
        )}

        {/* ═══ File Grid ═══ */}
        <div key={navKey} className={`file-grid${search ? ' file-grid--search' : ''}`}>
          {loading ? (
            <div className="empty-state">
              <div className="loading-spinner" />
              <p className="empty-state-text">正在加载档案...</p>
            </div>
          ) : items.map((item, i) => (
            <CelestialBody
              key={item.id}
              item={item}
              index={i}
              searchMode={!!search}
              onClick={() => handleItemClick(item)}
            />
          ))}

          {items.length === 0 && (
            <div className="empty-state">
              <svg className="empty-state-icon" viewBox="0 0 24 24"><use href="#icon-document" /></svg>
              <p className="empty-state-text">
                {search ? '未找到匹配的档案' : '✦ 过去、当下与未来，尚无人书写 ✦'}
              </p>
              {!search && (
                <span className="empty-state-hint">我见你，头顶黑冠；将万千生灵，熬成回忆。</span>
              )}
            </div>
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
            <Link to="/admin" className="admin-link">
              <svg className="admin-link-icon" viewBox="0 0 32 32"><use href="#rune-ring" /></svg>
              管理员入口
            </Link>
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
