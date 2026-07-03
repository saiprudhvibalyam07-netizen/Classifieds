import { supabase } from '../../../lib/supabase'
import type { AttachmentType } from '../constants'

const BUCKETS: Record<AttachmentType, string> = {
  image: 'chat-images',
  video: 'chat-videos',
  document: 'chat-files',
  file: 'chat-files',
  voice: 'chat-audio',
}

const ALLOWED_TYPES: Record<AttachmentType, string[]> = {
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  video: ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'],
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ],
  file: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/zip',
    'application/x-rar-compressed',
    'text/csv',
  ],
  voice: ['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/x-m4a'],
}

const ALLOWED_EXTENSIONS: Record<AttachmentType, string[]> = {
  image: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
  video: ['mp4', 'mov', 'avi', 'mkv'],
  document: ['pdf', 'doc', 'docx', 'txt', 'xls', 'xlsx', 'ppt', 'pptx'],
  file: ['pdf', 'doc', 'docx', 'txt', 'xls', 'xlsx', 'ppt', 'pptx', 'zip', 'rar', 'csv'],
  voice: ['webm', 'm4a', 'mp3', 'ogg', 'wav'],
}

const MAX_SIZES: Record<AttachmentType, number> = {
  image: 10 * 1024 * 1024,
  video: 100 * 1024 * 1024,
  document: 25 * 1024 * 1024,
  file: 25 * 1024 * 1024,
  voice: 25 * 1024 * 1024,
}

function classifyFile(file: File): AttachmentType {
  if (file.type.startsWith('image/')) return 'image'
  if (file.type.startsWith('video/')) return 'video'
  if (file.type.startsWith('audio/')) return 'voice'
  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  const docExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt']
  if (docExtensions.includes(ext)) return 'document'
  return 'file'
}

function generateStoragePath(conversationId: string, fileName: string): string {
  const ext = fileName.split('.').pop()
  const timestamp = Date.now()
  const random = Math.random().toString(36).slice(2, 8)
  return `${conversationId}/${timestamp}_${random}.${ext}`
}

export interface UploadResult {
  type: AttachmentType
  url: string
  name: string
  size: number
  storage_path: string
  mime_type: string
  width?: number
  height?: number
}

export const attachmentService = {
  classifyFile,

  validate(file: File): AttachmentType {
    const type = classifyFile(file)
    const mimeOk = ALLOWED_TYPES[type].includes(file.type)
    if (!mimeOk && file.type) {
      const ext = file.name.split('.').pop()?.toLowerCase() || ''
      const extOk = ALLOWED_EXTENSIONS[type].includes(ext)
      if (!extOk) throw new Error(`File type ${file.type || ext} is not supported`)
    }
    if (file.size > MAX_SIZES[type]) {
      const mb = MAX_SIZES[type] / (1024 * 1024)
      throw new Error(`File too large. Maximum size is ${mb}MB`)
    }
    return type
  },

  async uploadFile(
    bucket: string,
    path: string,
    file: File
  ): Promise<{ signedUrl: string; path: string }> {
    const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    })
    if (uploadError) throw new Error(uploadError.message)

    const { data: signedData, error: signedError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 60 * 60 * 24 * 7)

    if (signedError) throw new Error(signedError.message)

    return { signedUrl: signedData.signedUrl, path }
  },

  async upload(
    conversationId: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<UploadResult> {
    const type = this.validate(file)
    const bucket = BUCKETS[type]
    const storagePath = generateStoragePath(conversationId, file.name)

    if (onProgress) onProgress(0)

    const { signedUrl, path } = await this.uploadFile(bucket, storagePath, file)

    if (onProgress) onProgress(100)

    const result: UploadResult = {
      type,
      url: signedUrl,
      name: file.name,
      size: file.size,
      storage_path: path,
      mime_type: file.type,
    }

    if (type === 'image') {
      const dimensions = await getImageDimensions(file)
      if (dimensions) {
        result.width = dimensions.width
        result.height = dimensions.height
      }
    }

    return result
  },

  async uploadMultiple(
    conversationId: string,
    files: File[],
    onProgress?: (id: string, progress: number) => void
  ): Promise<(UploadResult | null)[]> {
    const promises = files.map(async (file) => {
      try {
        return await this.upload(conversationId, file, (p) => {
          onProgress?.(file.name, p)
        })
      } catch {
        return null
      }
    })
    return Promise.all(promises)
  },

  getBucket(type: AttachmentType): string {
    return BUCKETS[type]
  },

  getSignedUrl(storagePath: string, type: AttachmentType): Promise<string> {
    return supabase.storage
      .from(BUCKETS[type])
      .createSignedUrl(storagePath, 60 * 60 * 24 * 7)
      .then(({ data }) => data?.signedUrl || '')
  },
}

function getImageDimensions(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      resolve(null)
      return
    }
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(null)
    }
    img.src = url
  })
}
