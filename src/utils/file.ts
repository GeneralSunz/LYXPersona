import type { FileCategory } from '../types/file'

export function getFileCategory(file: File): FileCategory {
  const type = file.type
  const name = file.name.toLowerCase()

  if (type.startsWith('image/')) return 'image'
  if (type.startsWith('text/') || type.includes('document') || type.includes('pdf') || type.includes('sheet') || type.includes('presentation'))
    return 'document'
  if (type.includes('zip') || type.includes('rar') || type.includes('tar') || type.includes('7z') || type.includes('gzip') || type.includes('compress'))
    return 'archive'
  if (name.endsWith('.doc') || name.endsWith('.docx') || name.endsWith('.xls') || name.endsWith('.xlsx') || name.endsWith('.ppt') || name.endsWith('.pptx') || name.endsWith('.pdf') || name.endsWith('.md') || name.endsWith('.txt'))
    return 'document'
  if (name.endsWith('.zip') || name.endsWith('.rar') || name.endsWith('.7z') || name.endsWith('.tar') || name.endsWith('.gz'))
    return 'archive'

  return 'other'
}
