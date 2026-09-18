/**
 * 静态资源路径助手
 * ───────────────────────────────────────────────────────────────
 * Vite 部署到 GitHub Pages 时 base 是 /仓库名/，运行时拼接的字符串
 * **不会**被 Vite 改写。凡是在 JS 里拼出来的资源路径（照片、PDF），
 * 都必须过这一层，否则线上一定 404。
 */

/** 去掉尾部斜杠的 base，本地构建为 ''，线上为 '/filevault' */
const BASE = import.meta.env.BASE_URL.replace(/\/+$/, '')

/** 把 public/ 下的绝对路径转成带 base 的真实 URL */
export function asset(path: string): string {
  return `${BASE}${path.startsWith('/') ? path : `/${path}`}`
}
