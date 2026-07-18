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

const CATEGORY_COLORS: Record<string, string> = {
  folder:   '#d97706',
  document: '#4a7c8c',
  image:    '#8b1a1a',
  archive:  '#6b7280',
  other:    '#5a5a5a',
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

  return (
    <div
      className={`file-card${searchMode ? ' file-card--search' : ''}`}
      style={{
        '--card-clr': color,
        '--delay': `${index * 0.06}s`,
      } as React.CSSProperties}
      onClick={onClick}
    >
      {/* Top color bar */}
      <div className="card-topbar" />

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
        <svg viewBox="0 0 24 24" width="14" height="14">
          <use href="#icon-document" />
        </svg>
        <span>{isFolder ? '进入' : '预览'}</span>
      </div>
    </div>
  )
}
