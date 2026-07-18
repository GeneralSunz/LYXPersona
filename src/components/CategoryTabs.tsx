import type { FileCategory } from '../types/file'
import styles from './CategoryTabs.module.css'

const tabs: { key: FileCategory | 'all'; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'document', label: '文档' },
  { key: 'image', label: '图片' },
  { key: 'archive', label: '压缩包' },
  { key: 'other', label: '其他' },
]

interface Props {
  active: FileCategory | 'all'
  onChange: (cat: FileCategory | 'all') => void
}

export default function CategoryTabs({ active, onChange }: Props) {
  return (
    <div className={styles.tabs}>
      {tabs.map(t => (
        <button
          key={t.key}
          className={`${styles.tab} ${active === t.key ? styles.active : ''}`}
          onClick={() => onChange(t.key)}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
