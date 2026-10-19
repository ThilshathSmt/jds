// Rules of the public Gallery: what an admin may upload. The server applies these.

export const GALLERY_IMAGE_MAX_BYTES = 5 * 1024 * 1024
// Images sent in one upload
export const GALLERY_MAX_FILES_PER_UPLOAD = 10
// Allowed extensions and the content type each one is served with
export const GALLERY_IMAGE_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
}
export const GALLERY_TITLE_MAX_LENGTH = 150
