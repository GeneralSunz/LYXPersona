/**
 * send-message —— 「想对我说」留言接收
 * ───────────────────────────────────────────────────────────────
 * 职责：校验 → 蜜罐拦截 → IP 限频 → 落库(messages) → 邮件通知(Resend)
 *
 * 为什么必须走函数而不能前端直连数据库：
 *   前端打包里的 anon key 是公开的。若给 anon 开 INSERT 权限，
 *   任何人都能直接打 PostgREST 写库，绕过这里的蜜罐与限频。
 *   所以 007_messages.sql 刻意回收了 anon/authenticated 的全部权限，
 *   本函数是唯一的写入口，用 service_role 落库。
 *
 * 需要配置的密钥（不设 RESEND_API_KEY 时仍可落库，只是不发信）：
 *   supabase secrets set RESEND_API_KEY=re_xxxxxxxx
 *   supabase secrets set MAIL_TO=2962668488@qq.com
 *   supabase secrets set IP_SALT=<随便一串随机字符>
 *
 * SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 由平台自动注入，不必手工设置。
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const MAIL_TO = (Deno.env.get('MAIL_TO') || '2962668488@qq.com').trim()
const RESEND_API_KEY = (Deno.env.get('RESEND_API_KEY') || '').trim()
const SUPABASE_URL = (Deno.env.get('SUPABASE_URL') || '').trim()
const SERVICE_KEY = (Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '').trim()
/** IP 哈希的盐。没配也有默认值，但建议自己设一个 */
const IP_SALT = (Deno.env.get('IP_SALT') || 'lyx-persona-default-salt').trim()

const LIMITS = {
  contentMax: 500,
  signatureMax: 40,
  contactMax: 120,
  /** 同一 IP 一小时内最多几条 */
  perHour: 5,
  windowMs: 60 * 60 * 1000,
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/** 邮件正文是 HTML，用户内容必须先转义，否则能注入标签 */
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function buildEmail(fields: {
  content: string
  signature: string
  isAnonymous: boolean
  contact: string
  timeLocal: string
  ipHash: string
}): string {
  const who = fields.isAnonymous ? '匿名' : esc(fields.signature)
  const row = (k: string, v: string) =>
    `<tr><td style="padding:6px 14px 6px 0;color:#8a8175;font-size:13px;white-space:nowrap;vertical-align:top">${k}</td>` +
    `<td style="padding:6px 0;color:#24211c;font-size:13px">${v}</td></tr>`

  return `
  <div style="background:#f4ede3;padding:28px;font-family:-apple-system,'Segoe UI','Microsoft YaHei',sans-serif">
    <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #ded6c7">
      <div style="padding:18px 22px;border-bottom:1px solid #ded6c7;background:#fbf8f2">
        <div style="font-size:12px;letter-spacing:.22em;color:#b49562">LYX PERSONA · 想对我说</div>
        <div style="margin-top:6px;font-size:17px;color:#24211c">收到一条新留言</div>
      </div>

      <div style="padding:22px">
        <div style="white-space:pre-wrap;line-height:1.9;font-size:15px;color:#24211c">${esc(fields.content)}</div>
      </div>

      <div style="padding:0 22px 22px">
        <table style="border-collapse:collapse">
          ${row('署名', who)}
          ${row('联系方式', fields.contact ? esc(fields.contact) : '<span style="color:#a79d8c">未留</span>')}
          ${row('时间', fields.timeLocal)}
          ${row('来源哈希', `<span style="color:#a79d8c;font-family:monospace;font-size:12px">${fields.ipHash.slice(0, 16)}…</span>`)}
        </table>
      </div>

      <div style="padding:14px 22px;border-top:1px solid #ded6c7;background:#fbf8f2;color:#a79d8c;font-size:12px">
        这条留言已存入 Supabase 的 messages 表，可在控制台查看全部记录。
      </div>
    </div>
  </div>`
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return json({ error: '服务端未配置（缺少 SUPABASE_URL / SERVICE_ROLE_KEY）' }, 500)
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: '请求格式错误' }, 400)
  }

  // ── 蜜罐 ──
  // 页面上这个字段对用户不可见（CSS 隐藏 + 无 label），
  // 正常访客不会填；自动填表脚本会填。命中就假装成功，不给机器人任何反馈。
  if (typeof body.website === 'string' && body.website.trim() !== '') {
    return json({ ok: true })
  }

  const content = String(body.content ?? '').trim()
  const isAnonymous = body.isAnonymous !== false
  const signature = isAnonymous ? '' : String(body.signature ?? '').trim()
  const contact = String(body.contact ?? '').trim()

  // ── 校验 ──
  if (!content) return json({ error: '留言内容不能为空' }, 400)
  if (content.length > LIMITS.contentMax) {
    return json({ error: `留言不能超过 ${LIMITS.contentMax} 字` }, 400)
  }
  if (!isAnonymous && !signature) {
    return json({ error: '请填写署名，或切换为匿名' }, 400)
  }
  if (signature.length > LIMITS.signatureMax) {
    return json({ error: `署名不能超过 ${LIMITS.signatureMax} 字` }, 400)
  }
  if (contact.length > LIMITS.contactMax) {
    return json({ error: `联系方式不能超过 ${LIMITS.contactMax} 字` }, 400)
  }

  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown'
  const ipHash = await sha256Hex(`${ip}::${IP_SALT}`)

  const svcHeaders: Record<string, string> = {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json',
  }

  // ── 限频：同一 IP 一小时内最多 LIMITS.perHour 条 ──
  // 查不到或查询失败都放行 —— 限频是防刷，不该因为统计接口抖动而挡住正常留言。
  try {
    const since = new Date(Date.now() - LIMITS.windowMs).toISOString()
    const q = `${SUPABASE_URL}/rest/v1/messages?select=id&ip_hash=eq.${encodeURIComponent(ipHash)}&created_at=gte.${encodeURIComponent(since)}`
    const r = await fetch(q, { headers: svcHeaders })
    if (r.ok) {
      const rows = await r.json()
      if (Array.isArray(rows) && rows.length >= LIMITS.perHour) {
        return json({ error: '留言太频繁了，请过一会儿再试' }, 429)
      }
    }
  } catch {
    /* 限频失败不阻断 */
  }

  // ── 落库 ──
  const inserted = await fetch(`${SUPABASE_URL}/rest/v1/messages`, {
    method: 'POST',
    headers: { ...svcHeaders, Prefer: 'return=minimal' },
    body: JSON.stringify({
      content,
      signature: signature || null,
      is_anonymous: isAnonymous,
      contact: contact || null,
      ip_hash: ipHash,
      user_agent: (req.headers.get('user-agent') || '').slice(0, 300),
    }),
  })

  if (!inserted.ok) {
    const detail = await inserted.text().catch(() => '')
    console.error('insert failed', inserted.status, detail)
    return json({ error: '留言保存失败，请稍后再试' }, 502)
  }

  // ── 邮件通知 ──
  // 落库成功就算成功。发信失败只记日志、不报错 —— 留言已经收下了，
  // 不能因为邮件服务抖动就让访客以为发送失败而重复提交。
  let mailed = false
  if (RESEND_API_KEY) {
    try {
      const timeLocal = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // 未验证自有域名时，Resend 只允许从 onboarding@resend.dev 发信
          from: 'LYXPersona <onboarding@resend.dev>',
          to: [MAIL_TO],
          subject: `【想对我说】${isAnonymous ? '匿名留言' : signature}`,
          html: buildEmail({ content, signature, isAnonymous, contact, timeLocal, ipHash }),
        }),
      })
      mailed = resp.ok
      if (!resp.ok) {
        console.error('resend failed', resp.status, await resp.text().catch(() => ''))
      }
    } catch (e) {
      console.error('resend threw', e instanceof Error ? e.message : String(e))
    }
  } else {
    console.warn('RESEND_API_KEY 未设置，留言已入库但未发信')
  }

  return json({ ok: true, mailed })
})
