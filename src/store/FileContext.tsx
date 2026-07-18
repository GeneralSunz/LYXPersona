import { createContext, useContext, useReducer, useEffect, useState, type ReactNode } from 'react'
import type { FileItem, FileCategory, SortField, SortOrder, Folder } from '../types/file'
import { isSupabaseConfigured } from '../lib/supabase'
import { fetchAllFiles, fetchFolders, insertFile, createFolder, deleteFolder as deleteFolderDb, removeFile, updateFileFolder } from '../lib/database'
import { uploadFile, uploadFileWithProgress, deleteFile as deleteStorageFile } from '../lib/storage'
import { getFileCategory } from '../utils/file'

interface FileState {
  files: FileItem[]
  folders: Folder[]
  viewMode: 'grid' | 'list'
  searchQuery: string
  activeCategory: FileCategory | 'all'
  activeFolderId: string | null
  sortField: SortField
  sortOrder: SortOrder
  selectedIds: string[]
}

type FileAction =
  | { type: 'SET_VIEW_MODE'; payload: 'grid' | 'list' }
  | { type: 'SET_SEARCH'; payload: string }
  | { type: 'SET_CATEGORY'; payload: FileCategory | 'all' }
  | { type: 'SET_SORT'; payload: { field: SortField; order: SortOrder } }
  | { type: 'SET_FILES'; payload: FileItem[] }
  | { type: 'SET_FOLDERS'; payload: Folder[] }
  | { type: 'ADD_FILE'; payload: FileItem }
  | { type: 'DELETE_FILE'; payload: string }
  | { type: 'DELETE_FILES'; payload: string[] }
  | { type: 'MOVE_FILE'; payload: { id: string; folderId: string | null } }
  | { type: 'SET_ACTIVE_FOLDER'; payload: string | null }
  | { type: 'SELECT_FILE'; payload: string }
  | { type: 'DESELECT_FILE'; payload: string }
  | { type: 'SELECT_ALL'; payload: string[] }
  | { type: 'CLEAR_SELECTION' }

function fileReducer(state: FileState, action: FileAction): FileState {
  switch (action.type) {
    case 'SET_VIEW_MODE':
      return { ...state, viewMode: action.payload }
    case 'SET_SEARCH':
      return { ...state, searchQuery: action.payload }
    case 'SET_CATEGORY':
      return { ...state, activeCategory: action.payload }
    case 'SET_SORT':
      return { ...state, ...action.payload }
    case 'SET_FILES':
      return { ...state, files: action.payload }
    case 'SET_FOLDERS':
      return { ...state, folders: action.payload }
    case 'ADD_FILE':
      return { ...state, files: [action.payload, ...state.files] }
    case 'DELETE_FILE':
      return { ...state, files: state.files.filter(f => f.id !== action.payload) }
    case 'DELETE_FILES':
      return { ...state, files: state.files.filter(f => !action.payload.includes(f.id)), selectedIds: [] }
    case 'SET_ACTIVE_FOLDER':
      return { ...state, activeFolderId: action.payload }
    case 'SELECT_FILE':
      return { ...state, selectedIds: [...state.selectedIds, action.payload] }
    case 'DESELECT_FILE':
      return { ...state, selectedIds: state.selectedIds.filter(id => id !== action.payload) }
    case 'SELECT_ALL':
      return { ...state, selectedIds: action.payload }
    case 'MOVE_FILE':
      return { ...state, files: state.files.map(f => f.id === action.payload.id ? { ...f, folderId: action.payload.folderId } : f) }
    case 'CLEAR_SELECTION':
      return { ...state, selectedIds: [] }
    default:
      return state
  }
}

const mockFiles: FileItem[] = [
  { id: '1', name: '项目计划书.pdf', size: 2_400_000, type: 'application/pdf', category: 'document', uploadedAt: new Date(Date.now() - 1000 * 60 * 10) },
  { id: '2', name: '旅行照片.jpg', size: 3_100_000, type: 'image/jpeg', category: 'image', uploadedAt: new Date(Date.now() - 1000 * 60 * 60) },
  { id: '3', name: '前端资料.zip', size: 15_000_000, type: 'application/zip', category: 'archive', uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 24) },
  { id: '4', name: '读书笔记.md', size: 12_000, type: 'text/markdown', category: 'document', uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 2) },
  { id: '5', name: '设计稿.fig', size: 8_500_000, type: 'application/octet-stream', category: 'other', uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 5) },
  { id: '6', name: '会议记录.docx', size: 560_000, type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', category: 'document', uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 48) },
  { id: '7', name: '截图001.png', size: 1_200_000, type: 'image/png', category: 'image', uploadedAt: new Date(Date.now() - 1000 * 60 * 30) },
  { id: '8', name: '源码备份.tar.gz', size: 45_000_000, type: 'application/gzip', category: 'archive', uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 72) },
]

const initialState: FileState = {
  files: [],
  folders: [],
  viewMode: 'grid',
  searchQuery: '',
  activeCategory: 'all',
  activeFolderId: null,
  sortField: 'uploadedAt',
  sortOrder: 'desc',
  selectedIds: [],
}

const FileContext = createContext<{
  state: FileState
  dispatch: React.Dispatch<FileAction>
} | null>(null)

export function FileProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(fileReducer, { ...initialState, files: isSupabaseConfigured() ? [] : mockFiles })
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (!isSupabaseConfigured() || initialized) return
    setInitialized(true)

    Promise.all([
      fetchAllFiles(),
      fetchFolders(),
    ])
      .then(([files, folders]) => {
        dispatch({ type: 'SET_FILES', payload: files })
        dispatch({ type: 'SET_FOLDERS', payload: folders })
      })
      .catch(() => {})
  }, [initialized])

  return (
    <FileContext.Provider value={{ state, dispatch }}>
      {children}
    </FileContext.Provider>
  )
}

export function useFiles() {
  const ctx = useContext(FileContext)
  if (!ctx) throw new Error('useFiles must be used within FileProvider')

  const { state, dispatch } = ctx
  const filtered = state.files.filter(f => {
    const matchCategory = state.activeCategory === 'all' || f.category === state.activeCategory
    const matchFolder = state.activeFolderId === null || f.folderId === state.activeFolderId
    const q = state.searchQuery.toLowerCase()
    const matchSearch = f.name.toLowerCase().includes(q) || f.type.toLowerCase().includes(q)
    return matchCategory && matchFolder && matchSearch
  })

  const sorted = [...filtered].sort((a, b) => {
    const order = state.sortOrder === 'asc' ? 1 : -1
    switch (state.sortField) {
      case 'name':
        return a.name.localeCompare(b.name) * order
      case 'size':
        return (a.size - b.size) * order
      default:
        return (a.uploadedAt.getTime() - b.uploadedAt.getTime()) * order
    }
  })

  return {
    files: sorted,
    allFiles: state.files,
    folders: state.folders,
    viewMode: state.viewMode,
    searchQuery: state.searchQuery,
    activeCategory: state.activeCategory,
    activeFolderId: state.activeFolderId,
    sortField: state.sortField,
    sortOrder: state.sortOrder,
    selectedIds: state.selectedIds,
    setViewMode: (mode: 'grid' | 'list') => dispatch({ type: 'SET_VIEW_MODE', payload: mode }),
    setSearch: (query: string) => dispatch({ type: 'SET_SEARCH', payload: query }),
    setCategory: (cat: FileCategory | 'all') => dispatch({ type: 'SET_CATEGORY', payload: cat }),
    setActiveFolder: (id: string | null) => dispatch({ type: 'SET_ACTIVE_FOLDER', payload: id }),
    setSort: (field: SortField, order: SortOrder) => dispatch({ type: 'SET_SORT', payload: { field, order } }),
    addFile: async (file: File, onProgress?: (loaded: number, total: number) => void) => {
      if (isSupabaseConfigured()) {
        const category = getFileCategory(file)
        const { storagePath, publicUrl } = onProgress
          ? await uploadFileWithProgress(file, onProgress)
          : await uploadFile(file)
        const item = await insertFile({
          name: file.name,
          size: file.size,
          type: file.type,
          category,
          storagePath,
          fileUrl: publicUrl,
          folderId: state.activeFolderId,
        })
        dispatch({ type: 'ADD_FILE', payload: item })
        return item
      } else {
        const item: FileItem = {
          id: crypto.randomUUID(),
          name: file.name,
          size: file.size,
          type: file.type,
          category: getFileCategory(file),
          uploadedAt: new Date(),
          folderId: state.activeFolderId,
          previewUrl: URL.createObjectURL(file),
        }
        dispatch({ type: 'ADD_FILE', payload: item })
        return item
      }
    },
    addFolder: async (name: string) => {
      if (isSupabaseConfigured()) {
        try {
          const folder = await createFolder(name)
          dispatch({ type: 'SET_FOLDERS', payload: [...state.folders, folder] })
          return
        } catch (e) {
          console.warn('createFolder DB failed, falling back to local:', e)
        }
      }
      // Mock fallback (dev mode or DB failure)
      const folder: Folder = {
        id: crypto.randomUUID(),
        name,
        parentId: null,
        createdAt: new Date(),
      }
      dispatch({ type: 'SET_FOLDERS', payload: [...state.folders, folder] })
    },
    removeFolder: async (id: string, deleteFolderFiles?: boolean) => {
      if (isSupabaseConfigured()) {
        await deleteFolderDb(id)
        dispatch({ type: 'SET_FOLDERS', payload: state.folders.filter(f => f.id !== id) })
        if (deleteFolderFiles) {
          const folderFiles = state.files.filter(f => f.folderId === id)
          for (const file of folderFiles) {
            if (file.storagePath) {
              await deleteStorageFile(file.storagePath)
              await removeFile(file.id)
            }
            if (file.previewUrl) URL.revokeObjectURL(file.previewUrl)
          }
          const ids = folderFiles.map(f => f.id)
          if (ids.length > 0) dispatch({ type: 'DELETE_FILES', payload: ids })
        } else {
          fetchAllFiles().then(files => dispatch({ type: 'SET_FILES', payload: files })).catch(() => {})
        }
      } else {
        const folderFiles = state.files.filter(f => f.folderId === id)
        dispatch({ type: 'SET_FOLDERS', payload: state.folders.filter(f => f.id !== id) })
        if (deleteFolderFiles) {
          folderFiles.forEach(f => { if (f.previewUrl) URL.revokeObjectURL(f.previewUrl) })
          dispatch({ type: 'DELETE_FILES', payload: folderFiles.map(f => f.id) })
        } else {
          dispatch({ type: 'SET_FILES', payload: state.files.map(f => f.folderId === id ? { ...f, folderId: null } : f) })
        }
      }
    },
    deleteFile: async (id: string) => {
      const file = state.files.find(f => f.id === id)
      if (!file) return

      if (isSupabaseConfigured() && file.storagePath) {
        await deleteStorageFile(file.storagePath)
        await removeFile(id)
      } else {
        if (file.previewUrl) URL.revokeObjectURL(file.previewUrl)
      }
      dispatch({ type: 'DELETE_FILE', payload: id })
    },
    deleteFiles: async (ids: string[]) => {
      const deletedIds: string[] = []
      let lastError: Error | null = null

      if (isSupabaseConfigured()) {
        for (const id of ids) {
          try {
            const file = state.files.find(f => f.id === id)
            if (file?.storagePath) {
              await deleteStorageFile(file.storagePath)
              await removeFile(id)
            }
            deletedIds.push(id)
          } catch (e) {
            lastError = e instanceof Error ? e : new Error('删除失败')
          }
        }
      } else {
        ids.forEach(id => {
          const file = state.files.find(f => f.id === id)
          if (file?.previewUrl) URL.revokeObjectURL(file.previewUrl)
        })
        deletedIds.push(...ids)
      }

      if (deletedIds.length > 0) {
        dispatch({ type: 'DELETE_FILES', payload: deletedIds })
      }

      if (lastError) throw lastError
    },
    moveFile: async (id: string, folderId: string | null) => {
      if (isSupabaseConfigured()) {
        await updateFileFolder(id, folderId)
      }
      dispatch({ type: 'MOVE_FILE', payload: { id, folderId } })
    },
    moveFiles: async (ids: string[], folderId: string | null) => {
      const movedIds: string[] = []
      let lastError: Error | null = null

      if (isSupabaseConfigured()) {
        for (const id of ids) {
          try {
            await updateFileFolder(id, folderId)
            movedIds.push(id)
          } catch (e) {
            lastError = e instanceof Error ? e : new Error('移动失败')
          }
        }
      } else {
        movedIds.push(...ids)
      }

      movedIds.forEach(id => dispatch({ type: 'MOVE_FILE', payload: { id, folderId } }))

      if (lastError) throw lastError
    },
    toggleSelect: (id: string) => {
      if (state.selectedIds.includes(id)) {
        dispatch({ type: 'DESELECT_FILE', payload: id })
      } else {
        dispatch({ type: 'SELECT_FILE', payload: id })
      }
    },
    selectAll: () => dispatch({ type: 'SELECT_ALL', payload: sorted.map(f => f.id) }),
    clearSelection: () => dispatch({ type: 'CLEAR_SELECTION' }),
  }
}
