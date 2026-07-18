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

const COLORS = ['#c89b3c', '#e8c86a', '#8a6a28', '#8b1a1a', '#4a7c8c', '#c89b3c']

export default function StarBackground() {
  const embers = useMemo(() =>
    Array.from({ length: 35 }, (): Ember => ({
      left: `${Math.random() * 100}%`,
      size: `${Math.random() * 4 + 1.5}px`,
      delay: `${Math.random() * 12}s`,
      duration: `${6 + Math.random() * 10}s`,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      drift: `${(Math.random() - 0.5) * 60}px`,
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
              boxShadow: `0 0 ${parseFloat(e.size) * 3}px ${e.color}`,
              '--drift': e.drift,
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* Ambient glow layers — gold/blood/phosphor */}
      <div className={styles.glowTop} />
      <div className={styles.glowBottom} />
      <div className={styles.glowLeft} />
      <div className={styles.glowRight} />

      {/* Vignette */}
      <div className={styles.vignette} />
    </>
  )
}
