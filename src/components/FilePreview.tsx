import { useEffect, useState } from 'react'
import mammoth from 'mammoth'
import type { FileItem } from '../types/file'
import { formatSize } from '../utils/format'
import styles from './FilePreview.module.css'

interface Props {
  file: FileItem
  onClose: () => void
}

type PreviewState = 'loading' | 'ready' | 'unsupported' | 'too-large'

const MAX_PREVIEW_SIZE = 20 * 1024 * 1024 // 20MB，超过则提示下载

export default function FilePreview({ file, onClose }: Props) {
  const [previewState, setPreviewState] = useState<PreviewState>(
    file.previewUrl ? (file.size > MAX_PREVIEW_SIZE ? 'too-large' : 'loading') : 'unsupported'
  )
  const [docxHtml, setDocxHtml] = useState('')
  const [textContent, setTextContent] = useState('')
  const [copied, setCopied] = useState(false)
  const [progress, setProgress] = useState(0)

  // ESC 关闭
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  // 加载预览内容
  useEffect(() => {
    if (!file.previewUrl) {
      setPreviewState('unsupported')
      return
    }
    const url = file.previewUrl

    let cancelled = false

    const load = async () => {
      if (file.size > MAX_PREVIEW_SIZE) {
        setPreviewState('too-large')
        return
      }

      setPreviewState('loading')
      setProgress(0)

      const isDocx = file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      const isText = file.type.startsWith('text/') || file.name.endsWith('.md')

      try {
        if (file.type === 'application/pdf' || file.type.startsWith('image/')) {
          setProgress(60)
          await new Promise(r => setTimeout(r, 200))
          if (cancelled) return
          setProgress(100)
          setPreviewState('ready')
          return
        }

        if (isDocx || isText) {
          const xhr = new XMLHttpRequest()

          if (isDocx) xhr.responseType = 'arraybuffer'
          else xhr.responseType = 'text'

          xhr.onprogress = (e) => {
            if (e.lengthComputable) {
              setProgress(Math.min(95, Math.round((e.loaded / e.total) * 100)))
            }
          }

          await new Promise<void>((resolve, reject) => {
            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) resolve()
              else reject(new Error(`HTTP ${xhr.status}`))
            }
            xhr.onerror = () => reject(new Error('网络错误'))
            xhr.open('GET', url)
            xhr.send()
          })

          if (cancelled) return
          setProgress(95)

          if (isDocx) {
            const result = await mammoth.convertToHtml({ arrayBuffer: xhr.response as ArrayBuffer })
            if (cancelled) return
            setDocxHtml(result.value)
          } else {
            setTextContent(xhr.responseText)
          }

          setProgress(100)
          setPreviewState('ready')
          return
        }

        setPreviewState('unsupported')
      } catch {
        if (!cancelled) setPreviewState('unsupported')
      }
    }

    load()
    return () => { cancelled = true }
  }, [file])

  const handleDownload = () => {
    if (!file.previewUrl) return
    const a = document.createElement('a')
    a.href = file.previewUrl
    a.download = file.name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const handleCopyLink = async () => {
    if (!file.previewUrl) return
    try {
      await navigator.clipboard.writeText(file.previewUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard not available
    }
  }

  const canDownload = !!file.previewUrl

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.top}>
          <span className={styles.fileName} title={file.name}>{file.name}</span>
          <button className={styles.closeBtn} onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className={styles.body}>
          {previewState === 'loading' && (
            <div className={styles.placeholder}>
              <div className={styles.progressTrack}>
                <div
                  className={styles.progressBar}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className={styles.hint}>
                {progress > 0 && progress < 100 ? `加载中 ${progress}%` : '加载中...'}
              </span>
            </div>
          )}

          {previewState === 'ready' && file.type.startsWith('image/') && (
            <img
              src={file.previewUrl}
              alt={file.name}
              className={styles.image}
              onError={() => setPreviewState('unsupported')}
            />
          )}

          {previewState === 'ready' && file.type === 'application/pdf' && (
            <object
              data={file.previewUrl}
              type="application/pdf"
              className={styles.pdfViewer}
            >
              <p className={styles.hint}>浏览器不支持内嵌 PDF 预览</p>
            </object>
          )}

          {previewState === 'ready' &&
            file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' && (
            <div
              className={styles.docxBody}
              dangerouslySetInnerHTML={{ __html: docxHtml }}
            />
          )}

          {previewState === 'ready' &&
            (file.type.startsWith('text/') || file.name.endsWith('.md')) && (
            <pre className={styles.textBlock}>{textContent}</pre>
          )}

          {previewState === 'ready' &&
            !file.type.startsWith('image/') &&
            file.type !== 'application/pdf' &&
            file.type !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' &&
            !(file.type.startsWith('text/') || file.name.endsWith('.md')) && (
            <div className={styles.placeholder}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <span className={styles.hint}>此类型暂不支持预览</span>
            </div>
          )}

          {previewState === 'too-large' && (
            <div className={styles.placeholder}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span className={styles.hint}>文件过大（{formatSize(file.size)}），无法在线预览</span>
              <span className={styles.hintSub}>请下载后查看</span>
            </div>
          )}

          {previewState === 'unsupported' && (
            <div className={styles.placeholder}>
              {!file.previewUrl ? (
                <>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  <span className={styles.hint}>此类型暂不支持预览</span>
                </>
              ) : (
                <>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  <span className={styles.hint}>上传真实文件后即可预览</span>
                </>
              )}
            </div>
          )}
        </div>

        <div className={styles.bottom}>
          <div className={styles.meta}>
            <span>{file.type || '未知类型'}</span>
            <span className={styles.dot}>·</span>
            <span>{formatSize(file.size)}</span>
          </div>
          <div className={styles.bottomActions}>
            <button
              className={`${styles.copyBtn} ${!canDownload ? styles.disabled : ''}`}
              onClick={handleCopyLink}
              disabled={!canDownload}
            >
              {copied ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  已复制
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                  复制链接
                </>
              )}
            </button>
            <button
              className={`${styles.downloadBtn} ${!canDownload ? styles.disabled : ''}`}
              onClick={handleDownload}
              disabled={!canDownload}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              下载
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
