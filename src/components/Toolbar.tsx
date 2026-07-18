import type { SortField, SortOrder, ViewMode } from '../types/file'
import styles from './Toolbar.module.css'

interface Props {
  searchQuery: string
  viewMode: ViewMode
  sortField: SortField
  sortOrder: SortOrder
  onSearchChange: (query: string) => void
  onViewModeChange: (mode: ViewMode) => void
  onSortChange: (field: SortField, order: SortOrder) => void
}

const sortLabels: Record<SortField, string> = {
  uploadedAt: '时间',
  name: '名称',
  size: '大小',
}

export default function Toolbar({ searchQuery, viewMode, sortField, sortOrder, onSearchChange, onViewModeChange, onSortChange }: Props) {
  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      onSortChange(field, sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      onSortChange(field, 'desc')
    }
  }

  return (
    <div className={styles.toolbar}>
      <div className={styles.search}>
        <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          className={styles.searchInput}
          type="text"
          placeholder="搜索文件名或类型..."
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
        />
      </div>

      <div className={styles.sorts}>
        {(Object.keys(sortLabels) as SortField[]).map(field => (
          <button
            key={field}
            className={`${styles.sortBtn} ${sortField === field ? styles.active : ''}`}
            onClick={() => toggleSort(field)}
            title={`按${sortLabels[field]}${sortField === field ? (sortOrder === 'asc' ? '↑' : '↓') : ''}`}
          >
            {sortLabels[field]}
            {sortField === field && (
              <svg className={styles.sortArrow} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                {sortOrder === 'asc' ? <line x1="12" y1="19" x2="12" y2="5" /> : <line x1="12" y1="5" x2="12" y2="19" />}
                {sortOrder === 'asc' ? <polyline points="5 12 12 5 19 12" /> : <polyline points="5 12 12 19 19 12" />}
              </svg>
            )}
          </button>
        ))}
      </div>

      <div className={styles.views}>
        <button
          className={`${styles.viewBtn} ${viewMode === 'grid' ? styles.active : ''}`}
          onClick={() => onViewModeChange('grid')}
          title="网格视图"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
          </svg>
        </button>
        <button
          className={`${styles.viewBtn} ${viewMode === 'list' ? styles.active : ''}`}
          onClick={() => onViewModeChange('list')}
          title="列表视图"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" />
            <line x1="3" y1="12" x2="3.01" y2="12" />
            <line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  )
}
