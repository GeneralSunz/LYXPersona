import type { FileItem } from '../types/file'
import { formatSize, formatTime } from '../utils/format'

interface Item {
  kind: 'folder' | 'file'
  id: string
  name: string
  file?: FileItem
}

interface Props {
  item: Item
  index: number
  searchMode: boolean
  onClick: () => void
}

/* 分类色取自《无终奇语》参考图色域：灰蓝 / 锈橙 / 砂金 / 石褐 */
const CATEGORY_COLORS: Record<string, string> = {
  folder:   '#beaa85',
  document: '#8fa3ae',
  image:    '#b4623a',
  archive:  '#c9ab6e',
  other:    '#6e675a',
}

const CATEGORY_ICONS: Record<string, string> = {
  folder:   '#icon-folder',
  document: '#icon-document',
  image:    '#icon-image',
  archive:  '#icon-archive',
  other:    '#icon-other',
}

export default function CelestialBody({ item, index, searchMode, onClick }: Props) {
  const isFolder = item.kind === 'folder'
  const file = item.file
  const category = isFolder ? 'folder' : (file?.category ?? 'other')
  const color = CATEGORY_COLORS[category]
  const iconId = CATEGORY_ICONS[category]

  /**
   * 光标高光：只往元素上写两个 CSS 变量，交给 atmosphere.css 的
   * .file-card::after 取用。不碰任何布局、状态或交互。
   */
  const trackPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`)
    e.currentTarget.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`)
  }

  return (
    <div
      className={`file-card${searchMode ? ' file-card--search' : ''}`}
      style={{
        '--card-clr': color,
        '--delay': `${index * 0.05}s`,
      } as React.CSSProperties}
      onClick={onClick}
      onPointerMove={trackPointer}
    >
      {/* Top color bar */}
      <div className="card-topbar" />

      {/* 档案编号 —— 藏品图鉴的 No. 记法；卷宗按"箱底祭器"（区域）记 */}
      <span className="card-index">
        {isFolder
          ? `卷宗 ${String(index + 1).padStart(2, '0')}`
          : `No.${String(index + 1).padStart(2, '0')}`}
      </span>

      {/* Corner brackets */}
      <svg className="corner-tl" viewBox="0 0 20 20"><use href="#corner-tl" /></svg>
      <svg className="corner-tr" viewBox="0 0 20 20"><use href="#corner-tr" /></svg>
      <svg className="corner-bl" viewBox="0 0 20 20"><use href="#corner-bl" /></svg>
      <svg className="corner-br" viewBox="0 0 20 20"><use href="#corner-br" /></svg>

      {/* Icon */}
      <div className="card-icon-wrap">
        <svg className="card-icon" viewBox="0 0 24 24">
          <use href={iconId} />
        </svg>
      </div>

      {/* Name */}
      <span className="card-name" title={item.name}>{item.name}</span>

      {/* Meta */}
      <div className="card-meta">
        {file ? (
          <>
            <span>{formatSize(file.size)}</span>
            <span className="card-meta-dot">·</span>
            <span>{formatTime(file.uploadedAt)}</span>
          </>
        ) : isFolder ? (
          <span>卷宗</span>
        ) : (
          <span>{item.name}</span>
        )}
      </div>

      {/* Hover overlay */}
      <div className="card-overlay">
        <svg viewBox="0 0 24 24" width="15" height="15">
          <use href={iconId} />
        </svg>
        <span>{isFolder ? '进入' : '预览'}</span>
      </div>
    </div>
  )
}
