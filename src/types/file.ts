export type FileCategory = 'document' | 'image' | 'archive' | 'other'

export interface Folder {
  id: string
  name: string
  parentId: string | null
  createdAt: Date
}

export interface FileItem {
  id: string
  name: string
  size: number
  type: string
  category: FileCategory
  uploadedAt: Date
  previewUrl?: string
  /** Internal: Supabase storage path, used for delete operations */
  storagePath?: string
  folderId?: string | null
}

export type ViewMode = 'grid' | 'list'

export type SortField = 'uploadedAt' | 'name' | 'size'
export type SortOrder = 'asc' | 'desc'