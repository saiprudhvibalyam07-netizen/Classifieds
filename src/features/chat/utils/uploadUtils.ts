const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/zip',
  'application/x-rar-compressed',
  'text/plain',
  'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]
const MAX_IMAGE_SIZE = 10 * 1024 * 1024
const MAX_FILE_SIZE = 25 * 1024 * 1024
const MAX_TOTAL_UPLOADS = 10

export interface ValidationResult {
  valid: boolean
  error: string | null
}

const ALLOWED_IMAGE_MIMES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'image/heic', 'image/heif', 'image/avif', 'image/bmp', 'image/tiff',
  'image/svg+xml',
])

export function validateFile(file: File, isImage: boolean): ValidationResult {
  if (isImage) {
    const ext = file.name.split('.').pop()?.toLowerCase()
    const allowedExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif', 'avif', 'bmp', 'tiff', 'tif', 'svg']
    if (ext && !allowedExts.includes(ext)) {
      return { valid: false, error: `Unsupported image format: .${ext}` }
    }
    if (!ALLOWED_IMAGE_MIMES.has(file.type) && file.type) {
      return { valid: false, error: `File type ${file.type} is not supported` }
    }
    if (file.size > MAX_IMAGE_SIZE) {
      const mb = MAX_IMAGE_SIZE / (1024 * 1024)
      return { valid: false, error: `Image too large. Maximum size is ${mb}MB` }
    }
    return { valid: true, error: null }
  }

  if (!ALLOWED_FILE_TYPES.includes(file.type) && file.type) {
    return { valid: false, error: `File type ${file.type} is not supported` }
  }

  const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_FILE_SIZE
  if (file.size > maxSize) {
    const mb = maxSize / (1024 * 1024)
    return { valid: false, error: `File too large. Maximum size is ${mb}MB` }
  }

  return { valid: true, error: null }
}

export function validateTotalUploads(currentCount: number): ValidationResult {
  if (currentCount >= MAX_TOTAL_UPLOADS) {
    return { valid: false, error: `Maximum ${MAX_TOTAL_UPLOADS} files per message` }
  }
  return { valid: true, error: null }
}

export function generateStoragePath(conversationId: string, fileName: string): string {
  const ext = fileName.split('.').pop()
  const timestamp = Date.now()
  const random = Math.random().toString(36).slice(2, 8)
  return `${conversationId}/${timestamp}_${random}.${ext}`
}
