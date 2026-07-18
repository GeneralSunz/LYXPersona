import { AwsClient } from 'aws4fetch'

interface Env {
  MY_BUCKET: R2Bucket
  R2_ACCOUNT_ID: string
  R2_ACCESS_KEY_ID: string
  R2_SECRET_ACCESS_KEY: string
  R2_BUCKET_NAME: string
  R2_PUBLIC_URL: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': '*',
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders })
    }

    const url = new URL(request.url)

    // POST /upload-url — 返回一个预签名的直传 URL
    if (request.method === 'POST' && url.pathname === '/upload-url') {
      const { filename, contentType } = await request.json() as { filename?: string; contentType?: string }
      const ext = (filename || 'file').split('.').pop() || ''
      const key = `${crypto.randomUUID()}.${ext}`

      const r2 = new AwsClient({
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
        service: 's3',
      })

      const endpoint = new URL(`https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${env.R2_BUCKET_NAME}/${key}`)

      const signed = await r2.sign(endpoint, {
        method: 'PUT',
        headers: contentType ? { 'Content-Type': contentType } : undefined,
        aws: { signQuery: true },
      })

      return new Response(JSON.stringify({
        uploadUrl: signed.url,
        publicUrl: `${env.R2_PUBLIC_URL}/${key}`,
        key,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // DELETE /file?key=xxx — 删除 R2 中的文件
    if (request.method === 'DELETE' && url.pathname === '/file') {
      const key = url.searchParams.get('key')
      if (!key) {
        return new Response('Missing key', { status: 400, headers: corsHeaders })
      }

      const r2 = new AwsClient({
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
        service: 's3',
      })

      const endpoint = new URL(`https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${env.R2_BUCKET_NAME}/${key}`)

      const signed = await r2.sign(endpoint, {
        method: 'DELETE',
        aws: { signQuery: true },
      })

      const resp = await fetch(signed.url, { method: 'DELETE' })
      if (!resp.ok) {
        return new Response(`Delete failed: ${resp.status}`, { status: resp.status, headers: corsHeaders })
      }

      return new Response(null, { status: 204, headers: corsHeaders })
    }

    return new Response('Not Found', { status: 404 })
  },
}
