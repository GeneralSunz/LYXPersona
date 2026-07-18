import { useState } from 'react'
import type { Folder } from '../types/file'
import Modal from './Modal'
import styles from './FolderSidebar.module.css'

interface Props {
  folders: Folder[]
  activeFolderId: string | null
  onSelect: (id: string | null) => void
  onCreate: (name: string) => Promise<void>
  onDelete: (id: string, deleteFiles?: boolean) => Promise<void>
}

export default function FolderSidebar({ folders, activeFolderId, onSelect, onCreate, onDelete }: Props) {
  const [showCreate, setShowCreate] = useState(false)
  const [createName, setCreateName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Folder | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteFilesChecked, setDeleteFilesChecked] = useState(false)

  const rootFolders = folders.filter(f => !f.parentId)

  const handleCreate = async () => {
    if (!createName.trim() || isCreating) return
    setCreateError('')
    setIsCreating(true)
    try {
      await onCreate(createName.trim())
      setShowCreate(false)
      setCreateName('')
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : '创建失败')
    } finally {
      setIsCreating(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget || isDeleting) return
    setIsDeleting(true)
    try {
      await onDelete(deleteTarget.id, deleteFilesChecked)
      setDeleteTarget(null)
      setDeleteFilesChecked(false)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <span className={styles.title}>文件夹</span>
        <button className={styles.addBtn} onClick={() => { setShowCreate(true); setCreateName(''); setCreateError('') }} title="新建文件夹">          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      {showCreate && (
        <Modal
          open
          title="新建文件夹"
          onConfirm={handleCreate}
          onCancel={() => { if (!isCreating) { setShowCreate(false); setCreateName('') }}}
          confirmText="创建"
          loading={isCreating}
          confirmDisabled={!createName.trim()}
        >
          <input
            className={styles.createInput}
            type="text"
            placeholder="文件夹名称"
            value={createName}
            onChange={e => setCreateName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreate() }}
            autoFocus
            disabled={isCreating}
          />
          {createError && <p className={styles.createError}>{createError}</p>}
        </Modal>
      )}

      <div className={styles.list}>
        <div
          className={`${styles.item} ${activeFolderId === null ? styles.active : ''}`}
          onClick={() => onSelect(null)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          </svg>
          全部文件
        </div>

        {rootFolders.map(folder => (
          <div key={folder.id} className={styles.folderRow}>
            <div
              className={`${styles.item} ${activeFolderId === folder.id ? styles.active : ''}`}
              onClick={() => onSelect(folder.id)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
              {folder.name}
            </div>
            <button
              className={styles.deleteBtn}
              title="删除文件夹"
              onClick={e => {
                e.stopPropagation()
                setDeleteTarget(folder)
                setDeleteFilesChecked(false)
              }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {deleteTarget && (
        <Modal
          open
          title="删除文件夹"
          onConfirm={handleConfirmDelete}
          onCancel={() => { if (!isDeleting) { setDeleteTarget(null); setDeleteFilesChecked(false) } }}
          confirmText="删除"
          danger
          loading={isDeleting}
        >
          <p className={styles.deleteMsg}>确定删除文件夹「{deleteTarget.name}」吗？</p>
          <label className={styles.deleteCheckLabel}>
            <input
              type="checkbox"
              className={styles.deleteCheckbox}
              checked={deleteFilesChecked}
              onChange={e => setDeleteFilesChecked(e.target.checked)}
            />
            <span>同时删除文件夹内的所有文件</span>
          </label>
        </Modal>
      )}
    </aside>
  )
}
