import type { Folder } from '../types/file'
import Modal from './Modal'
import styles from './MoveModal.module.css'

interface Props {
  open: boolean
  folders: Folder[]
  movingCount: number
  onMove: (folderId: string | null) => void
  onCancel: () => void
  loading?: boolean
}

export default function MoveModal({ open, folders, movingCount, onMove, onCancel, loading }: Props) {
  return (
    <Modal open={open} title="移动到文件夹" onCancel={onCancel} cancelText="取消" loading={loading}>
      <p className={styles.desc}>选择目标文件夹（共 {movingCount} 个文件）</p>
      {loading ? (
        <div className={styles.loadingState}>
          <span className={styles.spinner} />
          <span>正在移动...</span>
        </div>
      ) : (
      <div className={styles.list}>
        <button className={styles.folderItem} onClick={() => onMove(null)} disabled={loading}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          </svg>
          <span>根目录</span>
        </button>
        {folders.map(folder => (
          <button key={folder.id} className={styles.folderItem} onClick={() => onMove(folder.id)} disabled={loading}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            <span>{folder.name}</span>
          </button>
        ))}
        {folders.length === 0 && (
          <p className={styles.empty}>暂无文件夹</p>
        )}
      </div>
      )}
    </Modal>
  )
}
