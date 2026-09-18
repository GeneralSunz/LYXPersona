/**
 * track-visit —— 访问上报
 * ───────────────────────────────────────────────────────────────
 * 职责：校验 → 识别爬虫 → IP 限频 → 落库(page_views)
 *
 * 设计原则：**统计绝不能影响页面**。
 *   任何异常都吞掉，永远返回 204。前端也是 fire-and-forget，
 *   不 await、不重试、失败不提示。
 *
 * 为什么写入不直接走前端：
 *   前端打包里的 anon key 是公开的。若给 anon 开 INSERT，
 *   任何人拿这个 key 就能往 page_views 里灌数据，统计立刻失真。
 *   所以 008_page_views.sql 把 anon 的权限全收了，只留本函数这一个入口。
 *
 * 隐私：不存原始 IP，只存加盐哈希。前端还会尊重 Do Not Track。
 *
 * 需要的密钥（沿用 send-message 的那一套）：
 *   IP_SALT —— 没有会退回默认值，但建议显式设置
 * SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 由平台自动注入。
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SUPABASE_URL = (Deno.env.get('SUPABASE_URL') || '').trim()
const SERVICE_KEY = (Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '').trim()
const IP_SALT = (Deno.env.get('IP_SALT') || 'lyx-persona-default-salt').trim()

/** 同一 IP 一小时内最多记多少条。正常访客远达不到，只挡刷量 */
const PER_HOUR = 100

/**
 * 爬虫 / 监控 / 命令行工具识别。
 * 这些请求会污染统计（我自己部署时用 curl 测过好几次），
 * 单独打标而不是直接丢弃 —— 保留记录便于事后核对，界面上默认剔除。
 */
const BOT_RE = /bot\b|crawler|spider|crawl|slurp|bingpreview|facebookexternalhit|headless|python-requests|python-urllib|curl\/|wget|axios|node-fetch|go-http-client|okhttp|java\/|libwww|monitor|uptime|pingdom|scrapy|httpclient|postman|insomnia/i

function noContent(): Response {
  return new Response(null, { status: 204, headers: corsHeaders })
}

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/** 只留主机名，去掉协议与路径；无法解析则返回 null */
function hostOf(url: string): string | null {
  if (!url) return null
  try {
    return new URL(url).hostname.slice(0, 120)
  } catch {
    return null
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  if (req.method !== 'POST') return noContent()
  if (!SUPABASE_URL || !SERVICE_KEY) return noContent()

  try {
    const body = await req.json().catch(() => null) as Record<string, unknown> | null
    if (!body) return noContent()

    // ── 路径校验 ──
    let path = String(body.path ?? '').trim()
    if (!path.startsWith('/')) path = `/${path}`
    if (path.length > 300) path = path.slice(0, 300)
    if (path.length < 1) return noContent()

    // 去掉查询串与哈希，避免把 ?utm_source=xxx 这种当成不同页面
    path = path.split('?')[0].split('#')[0].slice(0, 300)

    const referrer = String(body.referrer ?? '').slice(0, 500)
    const sessionId = String(body.sessionId ?? '').slice(0, 64)
    const ua = (req.headers.get('user-agent') || '').slice(0, 300)

    const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown'
    const ipHash = await sha256Hex(`${ip}::${IP_SALT}`)
    const isBot = BOT_RE.test(ua) || ua === ''

    const svcHeaders: Record<string, string> = {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    }

    // ── 限频 ──
    // 失败一律放行：限频是防刷，不该因为统计接口抖动而丢正常数据。
    try {
      const since = new Date(Date.now() - 3600_000).toISOString()
      const q = `${SUPABASE_URL}/rest/v1/page_views?select=id&ip_hash=eq.${encodeURIComponent(ipHash)}&created_at=gte.${encodeURIComponent(since)}`
      const r = await fetch(q, { headers: { ...svcHeaders, Prefer: 'count=exact' } })
      if (r.ok) {
        const rows = await r.json()
        if (Array.isArray(rows) && rows.length >= PER_HOUR) return noContent()
      }
    } catch { /* 放行 */ }

    // ── 落库 ──
    await fetch(`${SUPABASE_URL}/rest/v1/page_views`, {
      method: 'POST',
      headers: { ...svcHeaders, Prefer: 'return=minimal' },
      body: JSON.stringify({
        path,
        referrer: referrer || null,
        referrer_host: hostOf(referrer),
        user_agent: ua || null,
        ip_hash: ipHash,
        session_id: sessionId || null,
        is_bot: isBot,
      }),
    })
  } catch {
    /* 统计失败不影响任何事 */
  }

  return noContent()
})
