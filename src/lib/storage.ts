import { supabase, getSupabaseUrl, getAnonKey } from './supabase'

const authHeader = () => ({ 'Authorization': `Bearer ${getAnonKey()}` })

const BUCKET_NAME = 'files'

// ── Backend detection ──

function isQiniuConfigured(): boolean {
  return Boolean(import.meta.env.VITE_QINIU_ENABLED && import.meta.env.VITE_QINIU_DOMAIN)
}

function isR2Configured(): boolean {
  return Boolean(import.meta.env.VITE_R2_WORKER_URL)
}

// ── Qiniu upload URLs by region ──

const QINIU_UPLOAD_URLS: Record<string, string> = {
  z0: 'https://upload.qiniup.com',      // 华东
  z1: 'https://upload-z1.qiniup.com',   // 华北
  z2: 'https://upload-z2.qiniup.com',   // 华南
  na0: 'https://upload-na0.qiniup.com', // 北美
  as0: 'https://upload-as0.qiniup.com', // 东南亚
}

// ── Qiniu helpers ──

async function uploadToQiniu(
  file: File,
  onProgress?: (loaded: number, total: number) => void
): Promise<{ storagePath: string; publicUrl: string }> {
  const workerUrl = import.meta.env.VITE_SUPABASE_EDGE_FUNCTION_URL
    ? `${import.meta.env.VITE_SUPABASE_EDGE_FUNCTION_URL}/qiniu-proxy`
    : `${getSupabaseUrl()}/functions/v1/qiniu-proxy`

  // 1) Get upload token from Edge Function
  const resp = await fetch(workerUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getAnonKey()}` },
    body: JSON.stringify({ action: 'get-upload-token', filename: file.name }),
  })
  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    throw new Error(text || `获取上传凭证失败 (${resp.status})`)
  }
  const { token, key } = await resp.json()

  // 2) Upload directly to Qiniu
  const region = import.meta.env.VITE_QINIU_REGION || 'z2'
  const uploadUrl = QINIU_UPLOAD_URLS[region] || `https://upload-${region}.qiniup.com`

  return new Promise((resolve, reject) => {
    const formData = new FormData()
    formData.append('token', token)
    formData.append('key', key)
    formData.append('file', file)

    const xhr = new XMLHttpRequest()

    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(e.loaded, e.total)
      }
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const domain = import.meta.env.VITE_QINIU_DOMAIN!
        const publicUrl = `${domain.replace(/\/+$/, '')}/${key}`
        resolve({ storagePath: key, publicUrl })
      } else {
        try {
          const err = JSON.parse(xhr.responseText)
          reject(new Error(err.error || `上传失败 (${xhr.status})`))
        } catch {
          reject(new Error(`上传失败 (${xhr.status})`))
        }
      }
    }

    xhr.onerror = () => reject(new Error('网络错误，上传失败'))
    xhr.onabort = () => reject(new Error('上传已取消'))

    xhr.open('POST', uploadUrl)
    xhr.send(formData)
  })
}

async function deleteFromQiniu(storagePath: string): Promise<void> {
  const workerUrl = import.meta.env.VITE_SUPABASE_EDGE_FUNCTION_URL
    ? `${import.meta.env.VITE_SUPABASE_EDGE_FUNCTION_URL}/qiniu-proxy`
    : `${getSupabaseUrl()}/functions/v1/qiniu-proxy`

  const resp = await fetch(workerUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getAnonKey()}` },
    body: JSON.stringify({ action: 'delete', key: storagePath }),
  })

  if (!resp.ok && resp.status !== 404 && resp.status !== 612) {
    throw new Error(`删除失败 (${resp.status})`)
  }
}

// ── R2 helpers ──

async function uploadToR2(
  file: File,
  onProgress?: (loaded: number, total: number) => void
): Promise<{ storagePath: string; publicUrl: string }> {
  const workerUrl = import.meta.env.VITE_R2_WORKER_URL!

  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), 15000)
  let resp: Response
  try {
    resp = await fetch(`${workerUrl}/upload-url`, {
      signal: ac.signal,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({ filename: file.name, contentType: file.type }),
    })
  } finally {
    clearTimeout(timer)
  }
  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    throw new Error(text || `获取上传地址失败 (${resp.status})`)
  }

  const { uploadUrl, publicUrl, key } = await resp.json()

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.timeout = 0 // 不限时上传

    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(e.loaded, e.total)
      }
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ storagePath: key, publicUrl })
      } else {
        reject(new Error(`上传失败 (${xhr.status})`))
      }
    }

    xhr.onerror = () => reject(new Error('网络错误，上传失败'))
    xhr.ontimeout = () => reject(new Error('上传超时，请检查网络连接'))
    xhr.onabort = () => reject(new Error('上传已取消'))

    xhr.open('PUT', uploadUrl)
    xhr.setRequestHeader('Content-Type', file.type)
    xhr.send(file)
  })
}

async function deleteFromR2(storagePath: string): Promise<void> {
  const workerUrl = import.meta.env.VITE_R2_WORKER_URL!

  const resp = await fetch(`${workerUrl}/file?key=${encodeURIComponent(storagePath)}`, {
    method: 'DELETE',
    headers: authHeader(),
  })

  if (!resp.ok && resp.status !== 404) {
    throw new Error(`删除失败 (${resp.status})`)
  }
}

// ── Supabase helpers (via XHR for progress) ──

async function uploadToSupabase(
  file: File,
  onProgress?: (loaded: number, total: number) => void
): Promise<{ storagePath: string; publicUrl: string }> {
  const ext = file.name.split('.').pop() || ''
  const storagePath = `${crypto.randomUUID()}.${ext}`
  const url = `${getSupabaseUrl()}/storage/v1/object/${BUCKET_NAME}/${storagePath}`

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(e.loaded, e.total)
      }
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(storagePath)
        resolve({ storagePath, publicUrl: data.publicUrl })
      } else {
        try {
          const err = JSON.parse(xhr.responseText)
          reject(new Error(err.message || err.error || `上传失败 (${xhr.status})`))
        } catch {
          reject(new Error(`上传失败 (${xhr.status})`))
        }
      }
    }

    xhr.onerror = () => reject(new Error('网络错误，上传失败'))
    xhr.onabort = () => reject(new Error('上传已取消'))

    xhr.open('POST', url)
    xhr.setRequestHeader('Authorization', `Bearer ${getAnonKey()}`)
    xhr.setRequestHeader('Content-Type', file.type)
    xhr.send(file)
  })
}

// ── Public API (auto-detect backend) ──

export async function uploadFile(
  file: File
): Promise<{ storagePath: string; publicUrl: string }> {
  if (isQiniuConfigured()) return uploadToQiniu(file)
  if (isR2Configured()) return uploadToR2(file)
  return uploadToSupabase(file)
}

export async function uploadFileWithProgress(
  file: File,
  onProgress?: (loaded: number, total: number) => void
): Promise<{ storagePath: string; publicUrl: string }> {
  if (isQiniuConfigured()) return uploadToQiniu(file, onProgress)
  if (isR2Configured()) return uploadToR2(file, onProgress)
  return uploadToSupabase(file, onProgress)
}

export async function deleteFile(storagePath: string) {
  if (isQiniuConfigured()) return deleteFromQiniu(storagePath)
  if (isR2Configured()) return deleteFromR2(storagePath)

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([storagePath])

  if (error) throw error
}

export { isQiniuConfigured, isR2Configured }
