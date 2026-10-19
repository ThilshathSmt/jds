// Business rules for the public Gallery: anyone may see the images, only admins add or
// delete them (enforced by the routes). Images never touch student or account data.
//
//   - An upload is saved completely or not at all: every file must be a genuine JPG, PNG or
//     WebP image; otherwise every file of that upload is deleted and nothing is recorded.
//   - Files live under random server-chosen names and are found through their row only, so
//     a request can never name a path on the disk.
//   - A row is deleted before its file, so the public page never links to a missing file.

import path from 'node:path'
import { withTransaction } from '../config/database.js'
import env from '../config/env.js'
import { GALLERY_IMAGE_TYPES, GALLERY_TITLE_MAX_LENGTH } from '../config/gallery.js'
import * as galleryImageModel from '../models/galleryImageModel.js'
import AppError from '../utils/AppError.js'
import { isGenuineImage, removeFile } from '../utils/fileUtils.js'

const NOT_FOUND = 'Gallery image not found.'

// The API path an image is served at. Ids are never reused, so a browser may keep it.
const imageUrl = (id) => `/api/gallery/${id}/image`

const toImage = (row) => ({
  id: row.id,
  title: row.title,
  url: imageUrl(row.id),
  createdAt: row.created_at,
})

// Admins also see what was uploaded
const toAdminImage = (row) => ({ ...toImage(row), originalName: row.original_name, sizeBytes: row.size_bytes })

const filePath = (storedName) => path.join(env.galleryUploadsDir, path.basename(storedName))

// "summer_class-2026.jpg" -> "summer class 2026"
export const titleFromFileName = (originalName) => {
  const title = path
    .parse(path.basename(String(originalName)))
    .name.replace(/[_-]+/g, ' ')
    .replace(/[\u0000-\u001f<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, GALLERY_TITLE_MAX_LENGTH)
  return title || 'Gallery image'
}

export const listPublic = async () => (await galleryImageModel.findAll()).map(toImage)

export const listForAdmin = async () => (await galleryImageModel.findAll()).map(toAdminImage)

// `files` are the uploads multer saved (see uploadMiddleware.js); `adminId` is req.user.id.
// Returns the saved images, in the order they were sent.
export const addImages = async (files, adminId) => {
  if (!files || files.length === 0) {
    const message = 'Please choose at least one image to upload.'
    throw new AppError(400, message, { images: message })
  }
  try {
    const checked = []
    for (const file of files) {
      const mimeType = GALLERY_IMAGE_TYPES[path.extname(file.filename).toLowerCase()]
      if (!mimeType || !(await isGenuineImage(file.path, mimeType))) {
        const message = `${path.basename(file.originalname)} is not a valid JPG, PNG or WebP image. Nothing was uploaded.`
        throw new AppError(400, message, { images: message })
      }
      checked.push({ file, mimeType })
    }
    const ids = await withTransaction(async (db) => {
      const created = []
      for (const { file, mimeType } of checked) {
        created.push(
          await galleryImageModel.create(
            {
              title: titleFromFileName(file.originalname),
              originalName: path.basename(file.originalname).slice(0, 255),
              storedName: file.filename,
              mimeType,
              sizeBytes: file.size,
              uploadedBy: adminId,
            },
            db,
          ),
        )
      }
      return created
    })
    const rows = await Promise.all(ids.map((id) => galleryImageModel.findById(id)))
    return rows.map(toAdminImage)
  } catch (error) {
    // Nothing of a failed upload stays on the disk
    await Promise.all(files.map((file) => removeFile(file.path)))
    throw error
  }
}

// The row goes first (in a transaction), then the file. A file that cannot be deleted is
// logged by removeFile and no longer linked from anywhere.
export const deleteImage = async (id) => {
  const storedName = await withTransaction(async (db) => {
    const row = await galleryImageModel.findById(id, db, { forUpdate: true })
    if (!row) throw new AppError(404, NOT_FOUND)
    await galleryImageModel.remove(id, db)
    return row.stored_name
  })
  await removeFile(filePath(storedName))
}

// Public: { storedName, mimeType } of an image, to send its file
export const getImageFile = async (id) => {
  const row = await galleryImageModel.findById(id)
  if (!row) throw new AppError(404, NOT_FOUND)
  return { storedName: path.basename(row.stored_name), mimeType: row.mime_type }
}
