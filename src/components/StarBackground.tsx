import { useMemo } from 'react'
import styles from './StarBackground.module.css'

interface Ember {
  left: string
  size: string
  delay: string
  duration: string
  color: string
  drift: string
}

/* 灰烬颗粒：砂金 / 浅砂 / 锈橙 / 灰蓝 —— 参考图色域内的低饱和微粒 */
const COLORS = ['#cfc2a5', '#beaa85', '#c9ab6e', '#b4623a', '#8fa3ae', '#e0d5bb']

export default function StarBackground() {
  const embers = useMemo(() =>
    Array.from({ length: 28 }, (): Ember => ({
      left: `${Math.random() * 100}%`,
      size: `${Math.random() * 2.4 + 1}px`,
      delay: `${Math.random() * 16}s`,
      duration: `${10 + Math.random() * 14}s`,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      drift: `${(Math.random() - 0.5) * 70}px`,
    })),
  [])

  return (
    <>
      <div className={styles.emberField}>
        {embers.map((e, i) => (
          <span key={i} className={styles.ember}
            style={{
              left: e.left,
              width: e.size, height: e.size,
              animationDelay: e.delay,
              animationDuration: e.duration,
              backgroundColor: e.color,
              boxShadow: `0 0 ${parseFloat(e.size) * 2}px ${e.color}`,
              '--drift': e.drift,
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* 环境光：砂金 / 砖红 / 灰绿，只做层次，不做发光 */}
      <div className={styles.glowTop} />
      <div className={styles.glowBottom} />
      <div className={styles.glowLeft} />
      <div className={styles.glowRight} />

      {/* 边缘压暗 */}
      <div className={styles.vignette} />
    </>
  )
}
