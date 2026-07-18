import { supabase } from './supabase'
import type { FileItem, FileCategory, Folder } from '../types/file'

// ── 超时辅助 ──

const QUERY_TIMEOUT = 15000

async function queryWithTimeout<T>(fn: () => Promise<T>): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('请求超时，请检查网络连接')), QUERY_TIMEOUT)
    ),
  ])
}

// ── 预览 URL 生成（根据后端自动选择）──

const R2_PUBLIC_URL = import.meta.env.VITE_R2_PUBLIC_URL as string | undefined

function getPreviewUrl(row: { storage_path: string; file_url: string | null }): string {
  // 优先使用数据库中存储的完整 URL（上传时写入）
  if (row.file_url) return row.file_url
  // 回退：根据当前后端配置生成
  if (R2_PUBLIC_URL) {
    return `${R2_PUBLIC_URL.replace(/\/+$/, '')}/${row.storage_path}`
  }
  return supabase.storage.from('files').getPublicUrl(row.storage_path).data.publicUrl
}

export async function fetchFiles(folderId?: string | null): Promise<FileItem[]> {
  return queryWithTimeout(async () => {
    let query = supabase
      .from('files')
      .select('*')
      .is('deleted_at', null)

    if (folderId === null) {
      query = query.is('folder_id', null)
    } else if (folderId) {
      query = query.eq('folder_id', folderId)
    }

    const { data, error } = await query.order('uploaded_at', { ascending: false })

    if (error) throw error

    return data.map(row => ({
      id: row.id,
      name: row.name,
      size: row.size,
      type: row.type,
      category: row.category as FileCategory,
      uploadedAt: new Date(row.uploaded_at),
      storagePath: row.storage_path,
      folderId: row.folder_id,
      previewUrl: getPreviewUrl(row),
    }))
  })
}

export async function fetchAllFiles(): Promise<FileItem[]> {
  return queryWithTimeout(async () => {
    const { data, error } = await supabase
      .from('files')
      .select('*')
      .is('deleted_at', null)
      .order('uploaded_at', { ascending: false })

    if (error) throw error

    return data.map(row => ({
      id: row.id,
      name: row.name,
      size: row.size,
      type: row.type,
      category: row.category as FileCategory,
      uploadedAt: new Date(row.uploaded_at),
      storagePath: row.storage_path,
      folderId: row.folder_id,
      previewUrl: getPreviewUrl(row),
    }))
  })
}

export async function insertFile(
  file: Omit<FileItem, 'id' | 'uploadedAt' | 'previewUrl' | 'storagePath'> & { storagePath: string; fileUrl?: string }
): Promise<FileItem> {
  return queryWithTimeout(async () => {
    const insertData: Record<string, unknown> = {
      name: file.name,
      size: file.size,
      type: file.type,
      category: file.category,
      storage_path: file.storagePath,
    }
    if (file.folderId) {
      insertData.folder_id = file.folderId
    }
    // 只在上传时存储完整 URL 到数据库
    if (file.fileUrl) {
      insertData.file_url = file.fileUrl
    }

    const { data, error } = await supabase
      .from('files')
      .insert(insertData)
      .select('*')
      .single()

    if (error) throw error

    return {
      id: data.id,
      name: data.name,
      size: data.size,
      type: data.type,
      category: data.category as FileCategory,
      uploadedAt: new Date(data.uploaded_at),
      storagePath: data.storage_path,
      folderId: data.folder_id,
      previewUrl: getPreviewUrl(data),
    }
  })
}

export async function updateFileFolder(id: string, folderId: string | null) {
  return queryWithTimeout(async () => {
    const updateData: Record<string, unknown> = {}
    if (folderId === null) {
      updateData.folder_id = null
    } else {
      updateData.folder_id = folderId
    }

    const { error } = await supabase
      .from('files')
      .update(updateData)
      .eq('id', id)

    if (error) throw error
  })
}

export async function removeFile(id: string) {
  return queryWithTimeout(async () => {
    const { error } = await supabase
      .from('files')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw error
  })
}

// ── Folder operations ──

export async function fetchFolders(): Promise<Folder[]> {
  return queryWithTimeout(async () => {
    const { data, error } = await supabase
      .from('folders')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      console.warn('fetchFolders:', error.message)
      return []
    }

    return data.map(row => ({
      id: row.id,
      name: row.name,
      parentId: row.parent_id,
      createdAt: new Date(row.created_at),
    }))
  })
}

export async function createFolder(name: string, parentId?: string | null): Promise<Folder> {
  return queryWithTimeout(async () => {
    const { data, error } = await supabase
      .from('folders')
      .insert({ name, parent_id: parentId || null })
      .select('*')
      .single()

    if (error) throw error

    return {
      id: data.id,
      name: data.name,
      parentId: data.parent_id,
      createdAt: new Date(data.created_at),
    }
  })
}

export async function deleteFolder(id: string) {
  return queryWithTimeout(async () => {
    // 先处理子文件夹：将其提升为根级文件夹，内部文件移至未归档
    const { data: subFolders, error: subQueryError } = await supabase
      .from('folders')
      .select('id')
      .eq('parent_id', id)

    if (subQueryError) throw subQueryError

    if (subFolders && subFolders.length > 0) {
      const subIds = subFolders.map(f => f.id)
      // 子文件夹内的文件移出
      const { error: subFilesError } = await supabase
        .from('files')
        .update({ folder_id: null })
        .in('folder_id', subIds)
      if (subFilesError) throw subFilesError

      // 删除子文件夹
      const { error: delSubError } = await supabase
        .from('folders')
        .delete()
        .in('id', subIds)
      if (delSubError) throw delSubError
    }

    // 目标文件夹内的文件移出
    const { error } = await supabase
      .from('files')
      .update({ folder_id: null })
      .eq('folder_id', id)

    if (error) throw error

    const { error: deleteError } = await supabase
      .from('folders')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError
  })
}
