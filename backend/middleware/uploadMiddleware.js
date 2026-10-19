import { randomUUID } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import multer from 'multer'
import env from '../config/env.js'
import AppError from '../utils/AppError.js'
import { PROFILE_PICTURE_MAX_BYTES, PROFILE_PICTURE_TYPES } from '../config/account.js'
import { RECEIPT_MAX_BYTES, RECEIPT_TYPES } from '../utils/fileUtils.js'

// Files are saved in `directory`, which is outside any folder served to the public
const createStorage = (directory) =>
  multer.diskStorage({
    destination: (req, file, callback) => {
      mkdirSync(directory, { recursive: true })
      callback(null, directory)
    },
    // Never use the client's file name on disk: store under a random name
    filename: (req, file, callback) => {
      callback(null, `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`)
    },
  })

const fileFilter = (req, file, callback) => {
  const extension = path.extname(file.originalname).toLowerCase()
  if (!RECEIPT_TYPES[extension]) {
    const message = 'Please upload a PDF, JPG, JPEG or PNG file.'
    return callback(new AppError(400, message, { [file.fieldname]: message }))
  }
  return callback(null, true)
}

// Parses the multipart application form: text fields into req.body, the file into req.file
export const uploadReceipt = multer({
  storage: createStorage(env.applicationUploadsDir),
  fileFilter,
  limits: { fileSize: RECEIPT_MAX_BYTES, files: 1, fields: 20 },
}).single('receipt')

// Parses the reattempt payment form: text fields into req.body and the files into
// req.files.receipt[0] and, when sent, req.files.medicalReport[0]. Same file rules as the
// receipt above.
export const uploadReattemptDocuments = multer({
  storage: createStorage(env.reattemptUploadsDir),
  fileFilter,
  limits: { fileSize: RECEIPT_MAX_BYTES, files: 2, fields: 20 },
}).fields([
  { name: 'medicalReport', maxCount: 1 },
  { name: 'receipt', maxCount: 1 },
])

// Parses the reapplication form: text fields into req.body and the files into
// req.files.receipt[0] (the registration payment). (A medicalReport file is still accepted
// from older forms, but is not saved: the student now confirms the report instead.) They are application
// documents, kept with the other application uploads. Same file rules as above.
export const uploadReapplicationDocuments = multer({
  storage: createStorage(env.applicationUploadsDir),
  fileFilter,
  limits: { fileSize: RECEIPT_MAX_BYTES, files: 2, fields: 20 },
}).fields([
  { name: 'medicalReport', maxCount: 1 },
  { name: 'receipt', maxCount: 1 },
])

// Parses the practical reattempt payment form: text fields into req.body and the receipt
// into req.file. Kept apart from the other uploads. Same file rules as above.
export const uploadPracticalReceipt = multer({
  storage: createStorage(env.practicalUploadsDir),
  fileFilter,
  limits: { fileSize: RECEIPT_MAX_BYTES, files: 1, fields: 10 },
}).single('receipt')

// Parses the Settings page's profile picture upload into req.file. Images only (the
// content is checked again in profileService.js), kept apart from every other upload.
export const uploadProfilePicture = multer({
  storage: createStorage(env.profileUploadsDir),
  fileFilter: (req, file, callback) => {
    if (!PROFILE_PICTURE_TYPES[path.extname(file.originalname).toLowerCase()]) {
      const message = 'Please upload a JPG, PNG or WebP image.'
      return callback(new AppError(400, message, { picture: message }))
    }
    return callback(null, true)
  },
  limits: { fileSize: PROFILE_PICTURE_MAX_BYTES, files: 1, fields: 0 },
}).single('picture')
