// HTTP handling for the Gallery. Rules live in services/galleryService.js.
// Public: GET /api/gallery and GET /api/gallery/:id/image.
// Admin only: /api/admin/gallery (list, upload, delete).

import env from '../config/env.js'
import * as galleryService from '../services/galleryService.js'
import { sendSuccess } from '../utils/responseUtils.js'
import { parseId } from '../utils/validationUtils.js'

export const listPublic = async (req, res) => {
  const images = await galleryService.listPublic()
  sendSuccess(res, { message: 'Gallery images', data: { images } })
}

// The image file. Looked up by id only: the stored name comes from the database.
export const getImage = async (req, res) => {
  const { storedName, mimeType } = await galleryService.getImageFile(parseId(req.params.id))
  res.sendFile(
    storedName,
    {
      root: env.galleryUploadsDir,
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': 'inline',
        'X-Content-Type-Options': 'nosniff',
        // Shown on the public site, which may be on another address than the API
        'Cross-Origin-Resource-Policy': 'cross-origin',
        // An id always names the same file (ids are never reused)
        'Cache-Control': 'public, max-age=86400',
      },
    },
    (error) => {
      if (error && !res.headersSent) {
        res.status(404).json({ success: false, message: 'Gallery image not found.' })
      }
    },
  )
}

// ---- Admin

export const listForAdmin = async (req, res) => {
  const images = await galleryService.listForAdmin()
  sendSuccess(res, { message: 'Gallery images', data: { images } })
}

// POST /api/admin/gallery (multipart, field "images", one or more files)
export const upload = async (req, res) => {
  const images = await galleryService.addImages(req.files, req.user.id)
  sendSuccess(res, {
    statusCode: 201,
    message: `${images.length} image${images.length === 1 ? '' : 's'} added to the gallery.`,
    data: { images },
  })
}

export const remove = async (req, res) => {
  await galleryService.deleteImage(parseId(req.params.id))
  sendSuccess(res, { message: 'The image has been deleted from the gallery.' })
}
