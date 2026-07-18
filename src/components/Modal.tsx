import { useEffect, useRef, type ReactNode } from 'react'
import styles from './Modal.module.css'

interface ModalProps {
  open: boolean
  title: string
  children: ReactNode
  onConfirm?: () => void
  onCancel?: () => void
  confirmText?: string
  cancelText?: string
  confirmDisabled?: boolean
  danger?: boolean
  loading?: boolean
}

export default function Modal({
  open,
  title,
  children,
  onConfirm,
  onCancel,
  confirmText = '确定',
  cancelText = '取消',
  confirmDisabled = false,
  danger = false,
  loading = false,
}: ModalProps) {
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel?.()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.panel} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.title}>{title}</span>
          <button className={styles.closeBtn} onClick={onCancel} title="关闭">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className={styles.body}>{children}</div>
        {(onConfirm || onCancel) && (
          <div className={styles.footer}>
            {onCancel && (
              <button className={styles.cancelBtn} onClick={onCancel}>
                {cancelText}
              </button>
            )}
            {onConfirm && (
              <button
                ref={confirmRef}
                className={`${styles.confirmBtn} ${danger ? styles.danger : ''}`}
                onClick={onConfirm}
                disabled={confirmDisabled || loading}
              >
                {loading ? <span className={styles.spinner} /> : confirmText}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
