import { AwsClient } from 'npm:aws4fetch@1.0.18'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const url = new URL(req.url)

  try {
    // ── 获取配置 ──
    const accountId = (Deno.env.get('R2_ACCOUNT_ID') || '').trim()
    const accessKeyId = (Deno.env.get('R2_ACCESS_KEY_ID') || '').trim()
    const secretAccessKey = (Deno.env.get('R2_SECRET_ACCESS_KEY') || '').trim()
    const bucket = (Deno.env.get('R2_BUCKET_NAME') || '').trim()
    const publicUrl = (Deno.env.get('R2_PUBLIC_URL') || '').trim()

    if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) {
      return new Response('R2 configuration missing', { status: 500, headers: corsHeaders })
    }

    const r2 = new AwsClient({
      accessKeyId,
      secretAccessKey,
      service: 's3',
    })

    // ── POST /upload-url ──
    if (req.method === 'POST' && url.pathname.endsWith('/upload-url')) {
      const body = await req.json() as { filename?: string; contentType?: string; key?: string }
      const ext = (body.filename || 'file').split('.').pop() || ''
      const key = body.key || `${crypto.randomUUID()}.${ext}`

      const endpoint = new URL(`https://${accountId}.r2.cloudflarestorage.com/${bucket}/${key}`)

      const signed = await r2.sign(endpoint, {
        method: 'PUT',
        headers: body.contentType ? { 'Content-Type': body.contentType } : undefined,
        aws: { signQuery: true },
      })

      return new Response(JSON.stringify({
        uploadUrl: signed.url,
        publicUrl: `${publicUrl.replace(/\/+$/, '')}/${key}`,
        key,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── DELETE /file?key=xxx ──
    if (req.method === 'DELETE' && url.pathname.endsWith('/file')) {
      const key = url.searchParams.get('key')
      if (!key) {
        return new Response('Missing key', { status: 400, headers: corsHeaders })
      }

      const endpoint = new URL(`https://${accountId}.r2.cloudflarestorage.com/${bucket}/${key}`)
      const signed = await r2.sign(endpoint, {
        method: 'DELETE',
        aws: { signQuery: true },
      })

      const resp = await fetch(signed.url, { method: 'DELETE' })
      if (!resp.ok && resp.status !== 404) {
        return new Response(`Delete failed: ${resp.status}`, { status: resp.status, headers: corsHeaders })
      }

      return new Response(null, { status: 204, headers: corsHeaders })
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders })
  } catch (err) {
    return new Response(err instanceof Error ? err.message : 'internal error', {
      status: 500,
      headers: corsHeaders,
    })
  }
})
