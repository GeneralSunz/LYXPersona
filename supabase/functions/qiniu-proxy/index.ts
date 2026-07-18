import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ── Pure JS SHA-1 ──
// (FIPS 180-4 compliant, no native crypto dependencies)

function sha1(msg: Uint8Array): Uint8Array {
  const h0 = 0x67452301, h1 = 0xEFCDAB89, h2 = 0x98BADCFE, h3 = 0x10325476, h4 = 0xC3D2E1F0
  const ml = msg.length * 8
  const blockCount = Math.ceil((msg.length + 1 + 8) / 64)
  const buf = new Uint8Array(blockCount * 64)
  buf.set(msg)
  buf[msg.length] = 0x80
  const dv = new DataView(buf.buffer)
  dv.setUint32(buf.length - 8, 0, false)
  dv.setUint32(buf.length - 4, ml >> 0, false) // low 32 bits
  let [a, b, c, d, e] = [h0, h1, h2, h3, h4]
  const w = new Uint32Array(80)
  for (let offset = 0; offset < buf.length; offset += 64) {
    for (let t = 0; t < 16; t++) w[t] = dv.getUint32(offset + t * 4, false)
    for (let t = 16; t < 80; t++) w[t] = rotl(w[t - 3] ^ w[t - 8] ^ w[t - 14] ^ w[t - 16], 1)
    let [ta, tb, tc, td, te] = [a, b, c, d, e]
    for (let t = 0; t < 80; t++) {
      const [f, k] = t < 20 ? [(tb & tc) | (~tb & td), 0x5A827999]
          : t < 40 ? [tb ^ tc ^ td, 0x6ED9EBA1]
          : t < 60 ? [(tb & tc) | (tb & td) | (tc & td), 0x8F1BBCDC]
          : [tb ^ tc ^ td, 0xCA62C1D6]
      const tmp = (rotl(ta, 5) + f + te + k + w[t]) | 0
      te = td; td = tc; tc = rotl(tb, 30); tb = ta; ta = tmp
    }
    a = (a + ta) | 0; b = (b + tb) | 0; c = (c + tc) | 0; d = (d + td) | 0; e = (e + te) | 0
  }
  const out = new Uint8Array(20)
  const odv = new DataView(out.buffer)
  odv.setUint32(0, a, false)
  odv.setUint32(4, b, false)
  odv.setUint32(8, c, false)
  odv.setUint32(12, d, false)
  odv.setUint32(16, e, false)
  return out
}

function rotl(x: number, n: number): number {
  return ((x << n) | (x >>> (32 - n))) >>> 0
}

// ── HMAC-SHA1 using pure JS SHA-1 ──

function hmacSha1(keyBytes: Uint8Array, data: Uint8Array): Uint8Array {
  // If key > 64 bytes, hash it
  if (keyBytes.length > 64) keyBytes = sha1(keyBytes)
  // Pad key to 64 bytes
  const padded = new Uint8Array(64)
  padded.set(keyBytes)

  const ipad = new Uint8Array(64)
  const opad = new Uint8Array(64)
  for (let i = 0; i < 64; i++) {
    ipad[i] = padded[i] ^ 0x36
    opad[i] = padded[i] ^ 0x5c
  }

  // inner hash
  const innerInput = new Uint8Array(64 + data.length)
  innerInput.set(ipad)
  innerInput.set(data, 64)

  // outer hash
  const innerHash = sha1(innerInput)
  const outerInput = new Uint8Array(64 + 20)
  outerInput.set(opad)
  outerInput.set(innerHash, 64)

  return sha1(outerInput)
}

// ── URL-safe base64 ──

function toUrlSafe(buf: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i])
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function strToUrlSafe(s: string): string {
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// ── Serve ──

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { action } = body

    if (action === 'get-upload-token') {
      const accessKey = (Deno.env.get('QINIU_ACCESS_KEY') || '').trim()
      const secretKey = (Deno.env.get('QINIU_SECRET_KEY') || '').trim()
      const bucket = (Deno.env.get('QINIU_BUCKET') || '').trim()

      const filename = body.filename || 'file'
      const ext = filename.includes('.') ? filename.split('.').pop() : ''
      const key = crypto.randomUUID() + (ext ? '.' + ext : '')

      const putPolicy = JSON.stringify({
        scope: bucket + ':' + key,
        deadline: Math.floor(Date.now() / 1000) + 7200,
      })

      const encodedPutPolicy = strToUrlSafe(putPolicy)
      const sign = hmacSha1(new TextEncoder().encode(secretKey), new TextEncoder().encode(encodedPutPolicy))
      const encodedSign = toUrlSafe(sign)
      const token = accessKey + ':' + encodedPutPolicy + ':' + encodedSign

      return new Response(JSON.stringify({ token, key }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'delete') {
      const accessKey = (Deno.env.get('QINIU_ACCESS_KEY') || '').trim()
      const secretKey = (Deno.env.get('QINIU_SECRET_KEY') || '').trim()
      const bucket = (Deno.env.get('QINIU_BUCKET') || '').trim()

      const encodedEntry = strToUrlSafe(bucket + ':' + body.key)
      const sign = hmacSha1(new TextEncoder().encode(secretKey), new TextEncoder().encode('/delete/' + encodedEntry + '\n'))
      const encodedSign = toUrlSafe(sign)

      const resp = await fetch('https://rs.qiniu.com/delete/' + encodedEntry, {
        method: 'POST',
        headers: { Authorization: 'QBox ' + accessKey + ':' + encodedSign },
      })

      if (!resp.ok && resp.status !== 612) {
        return new Response(await resp.text(), { status: resp.status, headers: corsHeaders })
      }

      return new Response(null, { status: 204, headers: corsHeaders })
    }

    return new Response('unknown action', { status: 400, headers: corsHeaders })
  } catch (err) {
    return new Response(err instanceof Error ? err.message : 'internal error', {
      status: 500,
      headers: corsHeaders,
    })
  }
})
