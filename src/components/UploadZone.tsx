import { useState, useRef, useCallback, type DragEvent } from 'react'
import { useFiles } from '../store/FileContext'
import styles from './UploadZone.module.css'

interface UploadingFile {
  name: string
  status: 'pending' | 'uploading' | 'done' | 'error'
  progress: number
  speed: string
  error?: string
}

export default function UploadZone() {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState<UploadingFile[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const dragCounter = useRef(0)
  const { addFile } = useFiles()

  const uploadingRef = useRef(false)

  const processFiles = useCallback(async (fileList: FileList) => {
    if (uploadingRef.current) return
    uploadingRef.current = true

    const files = Array.from(fileList)
    const oversized = files.filter(f => f.size > 150 * 1024 * 1024)
    if (oversized.length > 0) {
      uploadingRef.current = false
      alert(`以下文件超过 150MB 限制：\n${oversized.map(f => `  ${f.name} (${(f.size / 1024 / 1024).toFixed(1)}MB)`).join('\n')}`)
      return
    }

    setUploading(files.map(f => ({ name: f.name, status: 'pending' as const, progress: 0, speed: '' })))

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (i > 0) await new Promise(r => setTimeout(r, 1000))

      const startTime = Date.now()
      setUploading(prev => {
        const next = [...prev]
        next[i] = { ...next[i], status: 'uploading', progress: 0, speed: '' }
        return next
      })

      try {
        await addFile(file, (loaded, total) => {
          const elapsed = (Date.now() - startTime) / 1000
          const pct = Math.round((loaded / total) * 100)
          const speedBps = elapsed > 0 ? loaded / elapsed : 0
          const speed = speedBps > 1024 * 1024
            ? `${(speedBps / 1024 / 1024).toFixed(1)} MB/s`
            : `${(speedBps / 1024).toFixed(0)} KB/s`
          setUploading(prev => {
            const next = [...prev]
            next[i] = { ...next[i], progress: pct, speed }
            return next
          })
        })
        setUploading(prev => {
          const next = [...prev]
          next[i] = { ...next[i], status: 'done' }
          return next
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : '上传失败'
        setUploading(prev => {
          const next = [...prev]
          next[i] = { ...next[i], status: 'error', error: msg }
          return next
        })
      }
    }

    uploadingRef.current = false
    setTimeout(() => setUploading([]), 3000)
  }, [addFile])

  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault()
    dragCounter.current++
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setDragging(true)
    }
  }

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault()
    dragCounter.current--
    if (dragCounter.current === 0) {
      setDragging(false)
    }
  }

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    dragCounter.current = 0
    setDragging(false)
    if (e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files)
    }
  }

  const handleClick = () => inputRef.current?.click()

  const handleFileSelect = () => {
    const el = inputRef.current
    if (el && el.files && el.files.length > 0) {
      processFiles(el.files)
      el.value = ''
    }
  }

  const isWorking = uploading.some(f => f.status !== 'done' && f.status !== 'error')

  return (
    <div
      className={`${styles.zone} ${dragging ? styles.dragging : ''} ${uploading.length > 0 ? styles.uploading : ''}`}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={isWorking ? undefined : handleClick}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        className={styles.input}
        onChange={handleFileSelect}
      />

      {uploading.length > 0 ? (
        <div className={styles.statusList}>
          {uploading.map((f, i) => (
            <div key={i} className={styles.statusItem}>
              <div className={styles.statusRow}>
                <span className={styles.statusName}>{f.name}</span>
                {f.status === 'error' ? (
                  <span className={styles.statusError}>{f.error}</span>
                ) : f.status === 'done' ? (
                  <span className={styles.statusDone}>✓</span>
                ) : f.status === 'uploading' ? (
                  <span className={styles.statusPct}>{f.progress}%</span>
                ) : (
                  <span className={styles.spinner} />
                )}
              </div>
              {f.status === 'uploading' && (
                <div className={styles.progressTrack}>
                  <div className={styles.progressBar} style={{ width: `${f.progress}%` }} />
                </div>
              )}
              {f.status === 'uploading' && f.progress >= 100 && (
                <div className={styles.speedRow}>
                  <span className={styles.speedText}>正在保存...</span>
                </div>
              )}
              {f.status === 'uploading' && f.progress < 100 && f.speed && (
                <div className={styles.speedRow}>
                  <span className={styles.speedText}>{f.speed}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <>
          <svg className={styles.icon} width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <div className={styles.label}>
            <span className={styles.link}>点击上传</span>
            <span className={styles.hint}>或拖拽文件到此处 · 单文件最大 150MB</span>
          </div>
        </>
      )}
    </div>
  )
}
