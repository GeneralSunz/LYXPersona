import type { FileItem } from '../types/file'
import FileCard from './FileCard'
import FileListItem from './FileListItem'
import styles from './FileList.module.css'

interface Props {
  files: FileItem[]
  viewMode: 'grid' | 'list'
  selectedIds: string[]
  onPreview: (file: FileItem) => void
  onDelete: (id: string) => void
  onToggleSelect: (id: string) => void
  onSelectAll: () => void
  onClearSelection: () => void
  onDeleteSelected: (ids: string[]) => void
  onMove?: (id: string) => void
  onMoveSelected?: () => void
}

export default function FileList({ files, viewMode, selectedIds, onPreview, onDelete, onToggleSelect, onSelectAll, onClearSelection, onDeleteSelected, onMove, onMoveSelected }: Props) {
  const allSelected = files.length > 0 && selectedIds.length === files.length
  const someSelected = selectedIds.length > 0

  if (files.length === 0) {
    return (
      <div className={styles.empty}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        <p>没有匹配的文件</p>
      </div>
    )
  }

  if (viewMode === 'grid') {
    return (
      <>
        <div className={styles.grid}>
          {files.map(f => (
            <FileCard
              key={f.id}
              file={f}
              selected={selectedIds.includes(f.id)}
              onPreview={onPreview}
              onDelete={onDelete}
              onToggleSelect={onToggleSelect}
              onMove={onMove}
            />
          ))}
        </div>
        {someSelected && (
          <div className={styles.batchBar}>
            <label className={styles.batchCheck}>
              <input
                type="checkbox"
                checked={allSelected}
                onChange={allSelected ? onClearSelection : onSelectAll}
              />
              <span>全选</span>
            </label>
            <span className={styles.batchCount}>已选 {selectedIds.length} 项</span>
            {onMoveSelected && (
              <button className={styles.batchMove} onClick={onMoveSelected}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                移动选中
              </button>
            )}
            <button className={styles.batchDelete} onClick={() => onDeleteSelected(selectedIds)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              删除选中
            </button>
          </div>
        )}
      </>
    )
  }

  return (
    <>
      <div className={styles.list}>
        {files.map(f => (
          <FileListItem
            key={f.id}
            file={f}
            selected={selectedIds.includes(f.id)}
            onPreview={onPreview}
            onDelete={onDelete}
            onToggleSelect={onToggleSelect}
            onMove={onMove}
          />
        ))}
      </div>
      {someSelected && (
        <div className={styles.batchBar}>
          <label className={styles.batchCheck}>
            <input
              type="checkbox"
              checked={allSelected}
              onChange={allSelected ? onClearSelection : onSelectAll}
            />
            <span>全选</span>
          </label>
          <span className={styles.batchCount}>已选 {selectedIds.length} 项</span>
          <button className={styles.batchDelete} onClick={() => onDeleteSelected(selectedIds)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            删除选中
          </button>
        </div>
      )}
    </>
  )
}
