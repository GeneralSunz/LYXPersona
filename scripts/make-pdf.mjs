/* ═══════════════════════════════════════════════════════════════
   生成简历 PDF
   ───────────────────────────────────────────────────────────────
   思路：先用 vite build 产出 dist，再用 vite preview 起一个本地静态服务，
   最后用本机 Chrome 的无头模式把 /resume 这一页打成 A4 PDF。
   好处是 PDF 与网页共用同一份 profile.ts 数据，永远不会对不上。

   用法：npm run pdf   （= vite build && node scripts/make-pdf.mjs）
   ═══════════════════════════════════════════════════════════════ */

import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, statSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const PORT = 4188
const ROOT = process.cwd()
const DIST = path.join(ROOT, 'dist')
const VITE_BIN = path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js')
const OUT = path.join(ROOT, 'public', 'resume.pdf')

const CHROME_CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
]

function findBrowser() {
  const fromEnv = process.env.CHROME_PATH
  if (fromEnv && existsSync(fromEnv)) return fromEnv
  const hit = CHROME_CANDIDATES.find(p => p && existsSync(p))
  if (!hit) {
    throw new Error(
      '未找到 Chrome / Edge。请设置环境变量 CHROME_PATH 指向浏览器可执行文件。',
    )
  }
  return hit
}

const sleep = ms => new Promise(r => setTimeout(r, ms))

/** 轮询直到预览服务可访问 */
async function waitForServer(url, timeoutMs = 40000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { redirect: 'follow' })
      if (res.ok) return true
    } catch {
      /* 还没起来，继续等 */
    }
    await sleep(400)
  }
  return false
}

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'ignore', windowsHide: true })
    child.on('error', reject)
    child.on('exit', code =>
      code === 0 ? resolve() : reject(new Error(`${path.basename(cmd)} 退出码 ${code}`)),
    )
  })
}

async function main() {
  if (!existsSync(DIST)) {
    throw new Error('未找到 dist/。请先执行 npm run build（或直接用 npm run pdf）。')
  }
  if (!existsSync(VITE_BIN)) {
    throw new Error('未找到 vite。请先执行 npm install。')
  }

  const browser = findBrowser()
  console.log(`[pdf] 浏览器: ${browser}`)

  mkdirSync(path.dirname(OUT), { recursive: true })

  const server = spawn(
    process.execPath,
    [VITE_BIN, 'preview', '--port', String(PORT), '--strictPort'],
    { stdio: 'ignore', windowsHide: true },
  )

  const cleanup = () => {
    if (!server.killed) server.kill()
  }

  try {
    const base = `http://localhost:${PORT}`
    const ready = await waitForServer(`${base}/resume`)
    if (!ready) throw new Error(`预览服务未能在 ${PORT} 端口就绪`)
    console.log('[pdf] 预览服务就绪，开始打印…')

    await run(browser, [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--no-pdf-header-footer',
      '--force-device-scale-factor=1',
      '--virtual-time-budget=12000',
      `--print-to-pdf=${OUT}`,
      `${base}/resume`,
    ])

    if (!existsSync(OUT)) throw new Error('Chrome 未产出 PDF')
    const { size } = statSync(OUT)
    console.log(`[pdf] ✓ 已生成 ${path.relative(ROOT, OUT)} (${(size / 1024).toFixed(1)} KB)`)
  } finally {
    cleanup()
  }
}

main().catch(err => {
  console.error(`[pdf] ✗ ${err.message}`)
  process.exit(1)
})
