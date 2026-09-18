import { useEffect, useRef } from 'react'

/* ═══════════════════════════════════════════════════════════════
   熔炉氛围层 —— 「会动的那一半」
   ───────────────────────────────────────────────────────────────
   包含：canvas 灰烬粒子场 / 光标聚光 / 制图扫描线 / 滚动进度；
   同时把指针与滚动量以 CSS 变量广播给底图做视差。

   全部视觉都收敛在本组件 + styles/atmosphere.css 两处，
   删掉这两个文件即可完全回退到静态版，不影响结构排版。
   ═══════════════════════════════════════════════════════════════ */

/** 灰烬色域 —— 全部取自参考图，不做霓虹；重复项用来加权，暖色为主 */
const PALETTE = [
  '#cfc2a5', '#cfc2a5',
  '#c9ab6e', '#c9ab6e',
  '#beaa85', '#beaa85',
  '#b4623a',
  '#8fa3ae',
  '#e0d5bb',
]

interface Mote {
  x: number
  y: number
  z: number
  r: number
  vx: number
  vy: number
  sway: number
  phase: number
  sprite: number
  alpha: number
}

interface Spark {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  max: number
  sprite: number
}

function hexToRgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
}

/**
 * 每个颜色预烘一张柔光精灵。
 * 逐帧画 radialGradient 太贵，用 drawImage 缩放既快又有自然的辉光衰减。
 */
function makeSprite(color: string): HTMLCanvasElement {
  const size = 64
  const c = document.createElement('canvas')
  c.width = c.height = size
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  grad.addColorStop(0, hexToRgba(color, 1))
  grad.addColorStop(0.2, hexToRgba(color, 0.55))
  grad.addColorStop(0.52, hexToRgba(color, 0.13))
  grad.addColorStop(1, hexToRgba(color, 0))
  g.fillStyle = grad
  g.fillRect(0, 0, size, size)
  return c
}

export default function FurnaceAtmosphere() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const spotRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const spot = spotRef.current
    const bar = barRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const root = document.documentElement
    const sprites = PALETTE.map(makeSprite)

    let w = window.innerWidth
    let h = window.innerHeight
    let motes: Mote[] = []
    let sparks: Spark[] = []
    let raf = 0
    let last = performance.now()
    let nextSpark = 900
    // 聚光层的半径，从元素量出来，避免和 CSS 里的尺寸各写一份
    let spotHalf = 390

    // 指针：tx/ty 是目标，px/py 缓动跟随
    let tx = w / 2
    let ty = h * 0.38
    let px = tx
    let py = ty

    const spawnMote = (initial: boolean): Mote => {
      const z = 0.3 + Math.random() * 0.7
      return {
        x: Math.random() * w,
        y: initial ? Math.random() * h : h + 24,
        z,
        // 平方分布：多数是细灰，偶尔一颗大颗的散景
        r: (0.5 + Math.random() * Math.random() * 3.4) * z + 0.4,
        vx: (Math.random() - 0.5) * 7,
        vy: -(7 + Math.random() * 24) * z,
        sway: 5 + Math.random() * 22,
        phase: Math.random() * Math.PI * 2,
        sprite: (Math.random() * sprites.length) | 0,
        alpha: 0.28 + Math.random() * 0.5,
      }
    }

    const reseed = () => {
      const n = Math.round(Math.min(74, Math.max(26, (w * h) / 26000)))
      motes = Array.from({ length: n }, () => spawnMote(true))
    }

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = Math.max(1, Math.floor(w * dpr))
      canvas.height = Math.max(1, Math.floor(h * dpr))
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      // 清掉上一轮的 transform 再重设，避免 dpr 变更后叠加缩放
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.scale(dpr, dpr)
      if (spot) spotHalf = spot.offsetWidth / 2 || 390
      reseed()
    }

    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now

      px += (tx - px) * Math.min(1, dt * 6)
      py += (ty - py) * Math.min(1, dt * 6)

      if (spot) spot.style.transform = `translate3d(${(px - spotHalf).toFixed(1)}px, ${(py - spotHalf).toFixed(1)}px, 0)`
      root.style.setProperty('--par-x', `${((px / w - 0.5) * -14).toFixed(2)}px`)
      root.style.setProperty('--par-y', `${((py / h - 0.5) * -10).toFixed(2)}px`)

      ctx.clearRect(0, 0, w, h)
      ctx.globalCompositeOperation = 'lighter'

      for (const m of motes) {
        m.phase += dt * 0.8
        m.y += m.vy * dt
        m.x += (m.vx + Math.sin(m.phase) * m.sway) * dt

        // 光标把灰烬轻轻推开，读数上像一束光扫过浮尘
        const dx = m.x - px
        const dy = m.y - py
        const d2 = dx * dx + dy * dy
        if (d2 < 30000) {
          const d = Math.sqrt(d2) || 1
          const f = (1 - d / 173) * 54 * dt * m.z
          m.x += (dx / d) * f
          m.y += (dy / d) * f
        }

        if (m.y < -30 || m.x < -70 || m.x > w + 70) Object.assign(m, spawnMote(false))

        const s = m.r * 10
        ctx.globalAlpha = Math.min(0.85, m.alpha * (0.6 + m.z * 0.6))
        ctx.drawImage(sprites[m.sprite], m.x - s / 2, m.y - s / 2, s, s)
      }

      // 偶发的火星：竖直窜上去，带一小段拖尾
      nextSpark -= dt * 1000
      if (nextSpark <= 0 && sparks.length < 4) {
        nextSpark = 700 + Math.random() * 1500
        sparks.push({
          x: w * (0.15 + Math.random() * 0.7),
          y: h + 10,
          vx: (Math.random() - 0.5) * 34,
          vy: -(170 + Math.random() * 230),
          life: 0,
          max: 1.1 + Math.random() * 0.9,
          sprite: 1 + ((Math.random() * 2) | 0),
        })
      }
      sparks = sparks.filter(s => s.life < s.max)
      for (const s of sparks) {
        s.life += dt
        s.x += s.vx * dt
        s.y += s.vy * dt
        s.vy *= 0.985
        const k = 1 - s.life / s.max
        for (let i = 0; i < 4; i++) {
          const t = i / 4
          const sz = 15 * (1 - t * 0.62)
          ctx.globalAlpha = k * 0.85 * (1 - t)
          ctx.drawImage(
            sprites[s.sprite],
            s.x - s.vx * t * 0.035 - sz / 2,
            s.y - s.vy * t * 0.035 - sz / 2,
            sz,
            sz,
          )
        }
      }

      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'
    }

    const loop = (now: number) => {
      draw(now)
      raf = requestAnimationFrame(loop)
    }

    /* ── 滚动：进度条 + 视差广播 ── */
    let scrollRaf = 0
    const readScroll = () => {
      scrollRaf = 0
      const frame = document.querySelector('.app-frame')
      const inner = frame && frame.scrollHeight > frame.clientHeight + 4
      const y = inner ? frame!.scrollTop : window.scrollY || document.scrollingElement?.scrollTop || 0
      const max = inner
        ? Math.max(1, frame!.scrollHeight - frame!.clientHeight)
        : Math.max(1, (document.scrollingElement?.scrollHeight || 0) - window.innerHeight)
      const p = Math.min(1, Math.max(0, y / max))
      root.style.setProperty('--scroll-p', p.toFixed(4))
      root.style.setProperty('--scroll-shift', `${(-y * 0.16).toFixed(1)}px`)
      root.style.setProperty('--scroll-shift-2', `${(-y * 0.07).toFixed(1)}px`)
      if (bar) bar.style.transform = `scaleX(${p.toFixed(4)})`
    }
    const onScroll = () => {
      if (scrollRaf) return
      scrollRaf = requestAnimationFrame(readScroll)
    }

    const onPointer = (e: PointerEvent) => {
      tx = e.clientX
      ty = e.clientY
    }

    const onVisibility = () => {
      if (document.hidden) {
        if (raf) { cancelAnimationFrame(raf); raf = 0 }
      } else if (!raf && !reduced) {
        last = performance.now()
        raf = requestAnimationFrame(loop)
      }
    }

    resize()
    readScroll()

    if (reduced) {
      // 减弱动效：只画一帧静态浮尘，不注册任何监听
      draw(performance.now())
      return () => {}
    }

    raf = requestAnimationFrame(loop)
    window.addEventListener('resize', resize)
    window.addEventListener('pointermove', onPointer, { passive: true })
    // 捕获阶段：.app-frame 或 document 滚动都能收到，不必猜谁是滚动容器
    window.addEventListener('scroll', onScroll, true)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      if (raf) cancelAnimationFrame(raf)
      if (scrollRaf) cancelAnimationFrame(scrollRaf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onPointer)
      window.removeEventListener('scroll', onScroll, true)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return (
    <>
      <div className="atm-spotlight" ref={spotRef} aria-hidden="true" />
      <canvas className="atm-embers" ref={canvasRef} aria-hidden="true" />
      <div className="atm-progress-track" aria-hidden="true">
        <div className="atm-progress-bar" ref={barRef} />
      </div>
    </>
  )
}
