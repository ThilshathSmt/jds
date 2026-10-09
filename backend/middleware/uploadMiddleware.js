import { randomUUID } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import multer from 'multer'
import env from '../config/env.js'
import AppError from '../utils/AppError.js'
import { RECEIPT_MAX_BYTES, RECEIPT_TYPES } from '../utils/fileUtils.js'

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    mkdirSync(env.applicationUploadsDir, { recursive: true })
    callback(null, env.applicationUploadsDir)
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
    return callback(new AppError(400, message, { receipt: message }))
  }
  return callback(null, true)
}

// Parses the multipart application form: text fields into req.body, the file into req.file
export const uploadReceipt = multer({
  storage,
  fileFilter,
  limits: { fileSize: RECEIPT_MAX_BYTES, files: 1, fields: 20 },
}).single('receipt')
