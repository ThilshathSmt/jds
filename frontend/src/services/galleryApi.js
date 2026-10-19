// The Gallery: the public page reads the images; admins upload and delete them. The backend
// decides who may do what. An "image" is { id, title, url, createdAt } (admins also get
// originalName and sizeBytes); `url` is an API path, see galleryImageSrc.

import { API_URL, apiRequest } from './apiClient'

// The address to show an image from
export const galleryImageSrc = (image) => `${API_URL}${image.url}`

// Public, newest first
export const listGalleryImages = async () => (await apiRequest('/api/gallery')).images

// ---- Admin only from here on

export const listAdminGalleryImages = async () => (await apiRequest('/api/admin/gallery')).images

// `files` is a list of File. Resolves with { images, message }; all are saved or none is.
export const uploadGalleryImages = async (files) => {
  const body = new FormData()
  for (const file of files) body.append('images', file)
  return apiRequest('/api/admin/gallery', { method: 'POST', body, withMessage: true })
}

export const deleteGalleryImage = (id) => apiRequest(`/api/admin/gallery/${id}`, { method: 'DELETE' })
