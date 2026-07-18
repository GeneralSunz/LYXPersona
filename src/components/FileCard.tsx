import { useState } from 'react'
import FileIcon from './FileIcon'
import type { FileItem } from '../types/file'
import { formatSize, formatTime } from '../utils/format'
import styles from './FileCard.module.css'

interface Props {
  file: FileItem
  selected?: boolean
  onPreview: (file: FileItem) => void
  onDelete: (id: string) => void
  onToggleSelect: (id: string) => void
  onMove?: (id: string) => void
}

export default function FileCard({ file, selected, onPreview, onDelete, onToggleSelect, onMove }: Props) {
  const [copied, setCopied] = useState(false)

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!file.previewUrl) return
    const a = document.createElement('a')
    a.href = file.previewUrl
    a.download = file.name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!file.previewUrl) return
    try {
      await navigator.clipboard.writeText(file.previewUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard not available
    }
  }

  const handleCheckClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleSelect(file.id)
  }

  return (
    <div className={`${styles.card} ${selected ? styles.selected : ''}`}>
      <div className={styles.checkbox} onClick={handleCheckClick}>
        <input type="checkbox" checked={!!selected} readOnly />
      </div>
      <div className={styles.preview} onClick={() => onPreview(file)}>
        <FileIcon category={file.category} />
      </div>
      <div className={styles.body} onClick={() => onPreview(file)}>
        <p className={styles.name} title={file.name}>{file.name}</p>
        <div className={styles.meta}>
          <span>{formatSize(file.size)}</span>
          <span className={styles.dot}>·</span>
          <span>{formatTime(file.uploadedAt)}</span>
        </div>
      </div>
      <div className={styles.actions}>
        <button className={styles.actionBtn} title="复制链接" onClick={handleCopyLink}>
          {copied ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          )}
        </button>
        {onMove && (
          <button className={styles.actionBtn} title="移动到" onClick={e => { e.stopPropagation(); onMove(file.id) }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </button>
        )}
        <button className={styles.actionBtn} title="下载" onClick={handleDownload}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </button>
        <button className={`${styles.actionBtn} ${styles.deleteBtn}`} title="删除" onClick={() => onDelete(file.id)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>
    </div>
  )
}
