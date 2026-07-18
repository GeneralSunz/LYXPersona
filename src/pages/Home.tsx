import { useState, lazy, Suspense } from 'react'
import type { FileItem } from '../types/file'
import { useFiles } from '../store/FileContext'
import UploadZone from '../components/UploadZone'
import CategoryTabs from '../components/CategoryTabs'
import Toolbar from '../components/Toolbar'
import FileList from '../components/FileList'
import FolderSidebar from '../components/FolderSidebar'
import Modal from '../components/Modal'
import MoveModal from '../components/MoveModal'
import { formatSize } from '../utils/format'
import styles from './Home.module.css'

const FilePreview = lazy(() => import('../components/FilePreview'))

export default function Home() {
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<FileItem | null>(null)
  const [deleteBatchCount, setDeleteBatchCount] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)
  const [moveTarget, setMoveTarget] = useState<FileItem | null>(null)
  const [moveBatchCount, setMoveBatchCount] = useState(0)
  const [isMoving, setIsMoving] = useState(false)
  const {
    files,
    allFiles,
    folders,
    viewMode,
    searchQuery,
    activeCategory,
    activeFolderId,
    sortField,
    sortOrder,
    selectedIds,
    setViewMode,
    setSearch,
    setCategory,
    setActiveFolder,
    setSort,
    deleteFile,
    deleteFiles,
    moveFile,
    moveFiles,
    toggleSelect,
    selectAll,
    clearSelection,
    addFolder,
    removeFolder,
  } = useFiles()

  const totalSize = allFiles.reduce((sum, f) => sum + f.size, 0)

  const handleDelete = (id: string) => {
    const file = allFiles.find(f => f.id === id)
    if (file) setDeleteTarget(file)
  }

  const handleDeleteBatch = () => {
    if (selectedIds.length > 0) setDeleteBatchCount(selectedIds.length)
  }

  const confirmDeleteFile = async () => {
    if (!deleteTarget || isDeleting) return
    setIsDeleting(true)
    try {
      await deleteFile(deleteTarget.id)
      setDeleteTarget(null)
    } finally {
      setIsDeleting(false)
    }
  }

  const confirmDeleteBatch = async () => {
    if (deleteBatchCount === 0 || isDeleting) return
    setIsDeleting(true)
    try {
      await deleteFiles(selectedIds)
      setDeleteBatchCount(0)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleMove = (id: string) => {
    const file = allFiles.find(f => f.id === id)
    if (file) setMoveTarget(file)
  }

  const handleMoveBatch = () => {
    if (selectedIds.length > 0) setMoveBatchCount(selectedIds.length)
  }

  const confirmMove = async (folderId: string | null) => {
    if (!moveTarget || isMoving) return
    setIsMoving(true)
    try {
      await moveFile(moveTarget.id, folderId)
      setMoveTarget(null)
    } finally {
      setIsMoving(false)
    }
  }

  const confirmMoveBatch = async (folderId: string | null) => {
    if (moveBatchCount === 0 || isMoving) return
    setIsMoving(true)
    try {
      await moveFiles(selectedIds, folderId)
      setMoveBatchCount(0)
    } finally {
      setIsMoving(false)
    }
  }

  return (
    <div className={styles.page}>
      {/* Folder sidebar + main content */}
      <div className={styles.layout}>
        <FolderSidebar
          folders={folders}
          activeFolderId={activeFolderId}
          onSelect={setActiveFolder}
          onCreate={addFolder}
          onDelete={removeFolder}
        />

        <div className={styles.main}>
          <UploadZone />

          <CategoryTabs active={activeCategory} onChange={setCategory} />

          <Toolbar
            searchQuery={searchQuery}
            viewMode={viewMode}
            sortField={sortField}
            sortOrder={sortOrder}
            onSearchChange={setSearch}
            onViewModeChange={setViewMode}
            onSortChange={setSort}
          />

          <FileList
            files={files}
            viewMode={viewMode}
            selectedIds={selectedIds}
            onPreview={setPreviewFile}
            onDelete={handleDelete}
            onToggleSelect={toggleSelect}
            onSelectAll={selectAll}
            onClearSelection={clearSelection}
            onDeleteSelected={handleDeleteBatch}
            onMove={handleMove}
            onMoveSelected={handleMoveBatch}
          />

          <div className={styles.footer}>
            <span>共 {allFiles.length} 个文件</span>
            <span className={styles.footerDot}>·</span>
            <span>使用 {formatSize(totalSize)}</span>
            {selectedIds.length > 0 && (
              <>
                <span className={styles.footerDot}>·</span>
                <span className={styles.footerSelected}>已选 {selectedIds.length} 项</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Single file delete confirmation */}
      {deleteTarget && (
        <Modal
          open
          title="删除文件"
          onConfirm={confirmDeleteFile}
          onCancel={() => { if (!isDeleting) setDeleteTarget(null) }}
          confirmText="删除"
          danger
          loading={isDeleting}
        >
          确定删除「{deleteTarget.name}」吗？<br />此操作不可恢复。
        </Modal>
      )}

      {/* Batch delete confirmation */}
      {deleteBatchCount > 0 && (
        <Modal
          open
          title="批量删除"
          onConfirm={confirmDeleteBatch}
          onCancel={() => { if (!isDeleting) setDeleteBatchCount(0) }}
          confirmText="删除"
          danger
          loading={isDeleting}
        >
          确定删除选中的 {deleteBatchCount} 个文件吗？<br />此操作不可恢复。
        </Modal>
      )}

      {/* Single file move */}
      {moveTarget && (
        <MoveModal
          open
          folders={folders}
          movingCount={1}
          onMove={confirmMove}
          onCancel={() => { if (!isMoving) setMoveTarget(null) }}
          loading={isMoving}
        />
      )}

      {/* Batch move */}
      {moveBatchCount > 0 && (
        <MoveModal
          open
          folders={folders}
          movingCount={moveBatchCount}
          onMove={confirmMoveBatch}
          onCancel={() => { if (!isMoving) setMoveBatchCount(0) }}
          loading={isMoving}
        />
      )}

      {previewFile && (
        <Suspense fallback={null}>
          <FilePreview key={previewFile.id} file={previewFile} onClose={() => setPreviewFile(null)} />
        </Suspense>
      )}
    </div>
  )
}
