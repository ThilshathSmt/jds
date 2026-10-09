import { open, unlink } from 'node:fs/promises'
import path from 'node:path'
import env from '../config/env.js'

// Receipt uploads: allowed extensions and the content type each one is served with
export const RECEIPT_MAX_BYTES = 2 * 1024 * 1024
export const RECEIPT_TYPES = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
}

// First bytes every genuine file of that type starts with
const SIGNATURES = {
  'application/pdf': [0x25, 0x50, 0x44, 0x46], // %PDF
  'image/png': [0x89, 0x50, 0x4e, 0x47],
  'image/jpeg': [0xff, 0xd8, 0xff],
}

export const getApplicationFilePath = (storedName) =>
  path.join(env.applicationUploadsDir, path.basename(storedName))

// True when the file's content really is the type its extension claims
export const hasValidSignature = async (filePath, mimeType) => {
  const signature = SIGNATURES[mimeType]
  const file = await open(filePath, 'r')
  try {
    const { buffer, bytesRead } = await file.read(Buffer.alloc(signature.length), 0, signature.length, 0)
    return bytesRead === signature.length && signature.every((byte, index) => buffer[index] === byte)
  } finally {
    await file.close()
  }
}

// Deletes a file, ignoring the case where it is already gone
export const removeFile = async (filePath) => {
  try {
    await unlink(filePath)
  } catch (error) {
    if (error.code !== 'ENOENT') console.error(`Could not delete ${filePath}: ${error.message}`)
  }
}
