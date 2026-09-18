import { useCallback, useEffect, useRef, useState } from 'react'
import { getAnonKey, getSupabaseUrl, isSupabaseConfigured } from '../lib/supabase'
import styles from './MessageDialog.module.css'

/* ═══════════════════════════════════════════════════════════════
   「想对我说」留言弹窗
   ───────────────────────────────────────────────────────────────
   提交后由 Supabase Edge Function `send-message` 校验、限频、落库并邮件通知。
   弹窗挂在 .kv-scope 内（不是 portal），才能继承 KV 色板变量。
   ═══════════════════════════════════════════════════════════════ */

const MAX_CONTENT = 500
const MAX_SIGNATURE = 40
const MAX_CONTACT = 120
/** 同一浏览器两次提交之间的冷却，与函数端按 IP 限频互补 */
const COOLDOWN_MS = 60_000
const COOLDOWN_KEY = 'lyx-message-last-sent'

type Status = 'idle' | 'sending' | 'sent' | 'error'

function readCooldownLeft(): number {
  try {
    const last = Number(localStorage.getItem(COOLDOWN_KEY) || 0)
    const left = COOLDOWN_MS - (Date.now() - last)
    return left > 0 ? left : 0
  } catch {
    return 0
  }
}

export default function MessageDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [content, setContent] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [signature, setSignature] = useState('')
  const [contact, setContact] = useState('')
  /** 蜜罐：对用户不可见，正常访客不会填 */
  const [website, setWebsite] = useState('')

  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')
  const [cooldownLeft, setCooldownLeft] = useState(0)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const configured = isSupabaseConfigured()

  // 打开时：聚焦、锁定背景滚动、读一次冷却剩余
  useEffect(() => {
    if (!open) return
    setCooldownLeft(readCooldownLeft())
    const t = window.setTimeout(() => textareaRef.current?.focus(), 60)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.clearTimeout(t)
      document.body.style.overflow = prevOverflow
    }
  }, [open])

  // 冷却倒计时
  useEffect(() => {
    if (!open || cooldownLeft <= 0) return
    const id = window.setInterval(() => setCooldownLeft(readCooldownLeft()), 1000)
    return () => window.clearInterval(id)
  }, [open, cooldownLeft])

  const handleClose = useCallback(() => {
    if (status === 'sending') return
    onClose()
  }, [status, onClose])

  // ESC 关闭
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, handleClose])

  const submit = async () => {
    setError('')
    const text = content.trim()
    if (!text) { setError('写点什么再发吧'); return }
    if (!isAnonymous && !signature.trim()) { setError('请填写署名，或切换为匿名'); return }
    if (readCooldownLeft() > 0) { setError('刚发过一条，请稍后再试'); return }
    if (!configured) { setError('留言服务未配置，暂时无法发送'); return }

    setStatus('sending')
    try {
      const res = await fetch(`${getSupabaseUrl()}/functions/v1/send-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: getAnonKey(),
          Authorization: `Bearer ${getAnonKey()}`,
        },
        body: JSON.stringify({
          content: text,
          isAnonymous,
          signature: isAnonymous ? '' : signature.trim(),
          contact: contact.trim(),
          website,
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof data?.error === 'string' && data.error ? data.error : '发送失败，请稍后再试')
        setStatus('error')
        return
      }

      try { localStorage.setItem(COOLDOWN_KEY, String(Date.now())) } catch { /* 忽略 */ }
      setCooldownLeft(COOLDOWN_MS)
      setStatus('sent')
    } catch {
      setError('网络异常，没能发出去')
      setStatus('error')
    }
  }

  const reset = () => {
    setContent('')
    setSignature('')
    setContact('')
    setWebsite('')
    setError('')
    setStatus('idle')
  }

  if (!open) return null

  const remaining = Math.ceil(cooldownLeft / 1000)
  const sending = status === 'sending'

  return (
    <div className={styles.overlay} onClick={handleClose} role="presentation">
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="msg-dialog-title"
        onClick={e => e.stopPropagation()}
      >
        <span className="plate-tick plate-tick--tl" aria-hidden="true" />
        <span className="plate-tick plate-tick--tr" aria-hidden="true" />
        <span className="plate-tick plate-tick--bl" aria-hidden="true" />
        <span className="plate-tick plate-tick--br" aria-hidden="true" />

        <header className={styles.head}>
          <div>
            <span className={styles.kicker}>Leave a Word</span>
            <h3 className={styles.title} id="msg-dialog-title">想对我说</h3>
          </div>
          <button className={styles.close} onClick={handleClose} aria-label="关闭" disabled={sending}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><use href="#icon-close" /></svg>
          </button>
        </header>

        {status === 'sent' ? (
          <div className={styles.done}>
            <span className={styles.doneMark} aria-hidden="true">◇</span>
            <p className={styles.doneTitle}>收到了，谢谢</p>
            <p className={styles.doneText}>
              {isAnonymous ? '以匿名的方式' : `以「${signature.trim()}」的名义`}留下的这段话已经送到。
              我会认真读。
            </p>
            <div className={styles.doneActions}>
              <button className={styles.btnGhost} onClick={reset}>再写一条</button>
              <button className={styles.btnPrimary} onClick={handleClose}>关闭</button>
            </div>
          </div>
        ) : (
          <>
            <div className={styles.body}>
              <label className={styles.field}>
                <span className={styles.fieldKey}>
                  留言
                  <em className={styles.counter}>{content.length} / {MAX_CONTENT}</em>
                </span>
                <textarea
                  ref={textareaRef}
                  className={styles.textarea}
                  value={content}
                  maxLength={MAX_CONTENT}
                  rows={5}
                  placeholder="想说的话、建议、指正，都可以写在这里。"
                  onChange={e => setContent(e.target.value)}
                  disabled={sending}
                />
              </label>

              {/* 蜜罐：屏幕阅读器与用户都碰不到，只有自动填表脚本会填 */}
              <div className={styles.honeypot} aria-hidden="true">
                <label>
                  网址
                  <input
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={website}
                    onChange={e => setWebsite(e.target.value)}
                  />
                </label>
              </div>

              <div className={styles.row}>
                <div className={styles.segmented} role="group" aria-label="署名方式">
                  <button
                    type="button"
                    className={`${styles.segBtn}${!isAnonymous ? ` ${styles.segBtnOn}` : ''}`}
                    onClick={() => setIsAnonymous(false)}
                    disabled={sending}
                  >署名</button>
                  <button
                    type="button"
                    className={`${styles.segBtn}${isAnonymous ? ` ${styles.segBtnOn}` : ''}`}
                    onClick={() => setIsAnonymous(true)}
                    disabled={sending}
                  >匿名</button>
                </div>

                {!isAnonymous && (
                  <label className={styles.inline}>
                    <span className={styles.inlineKey}>名字</span>
                    <input
                      className={styles.input}
                      type="text"
                      value={signature}
                      maxLength={MAX_SIGNATURE}
                      placeholder="怎么称呼你"
                      onChange={e => setSignature(e.target.value)}
                      disabled={sending}
                    />
                  </label>
                )}
              </div>

              <label className={styles.field}>
                <span className={styles.fieldKey}>
                  联系方式
                  <em className={styles.optional}>选填 · 仅我可见，方便回你</em>
                </span>
                <input
                  className={styles.input}
                  type="text"
                  value={contact}
                  maxLength={MAX_CONTACT}
                  placeholder="邮箱 / 微信，不想留就空着"
                  onChange={e => setContact(e.target.value)}
                  disabled={sending}
                />
              </label>

              {error && <p className={styles.error}>{error}</p>}
            </div>

            <footer className={styles.foot}>
              <p className={styles.privacy}>
                留言只有我能看到，不会公开。按「匿名」提交则连署名也不记录。
              </p>
              <button
                className={styles.btnPrimary}
                onClick={submit}
                disabled={sending || remaining > 0}
              >
                {sending ? '发送中…' : remaining > 0 ? `${remaining} 秒后可再发` : '送出去'}
              </button>
            </footer>
          </>
        )}
      </div>
    </div>
  )
}
