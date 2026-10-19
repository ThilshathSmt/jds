// The same rules the backend checks for Gallery uploads; the backend decides in the end
// (backend/config/gallery.js)

export const GALLERY_IMAGE_MAX_BYTES = 5 * 1024 * 1024
export const GALLERY_MAX_FILES_PER_UPLOAD = 10
export const GALLERY_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp'
const EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp']

// '' when the file may be uploaded, otherwise why not
export const getGalleryFileError = (file) => {
  const name = file.name.toLowerCase()
  if (!EXTENSIONS.some((extension) => name.endsWith(extension))) return 'Only JPG, PNG or WebP images.'
  if (file.size > GALLERY_IMAGE_MAX_BYTES) return 'Larger than 5 MB.'
  return ''
}
