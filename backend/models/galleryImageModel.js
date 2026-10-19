// Database access for gallery_images. No business logic here.
// Every function takes an optional `db` (pool or transaction connection).

import pool from '../config/database.js'

const COLUMNS = 'id, title, original_name, stored_name, mime_type, size_bytes, uploaded_by, created_at'

// Newest first
export const findAll = async (db = pool) => {
  const [rows] = await db.execute(`SELECT ${COLUMNS} FROM gallery_images ORDER BY created_at DESC, id DESC`)
  return rows
}

// `forUpdate` locks the row for the surrounding transaction
export const findById = async (id, db = pool, { forUpdate = false } = {}) => {
  const [rows] = await db.execute(
    `SELECT ${COLUMNS} FROM gallery_images WHERE id = ?${forUpdate ? ' FOR UPDATE' : ''}`,
    [id],
  )
  return rows[0] ?? null
}

// Returns the new row's id
export const create = async ({ title, originalName, storedName, mimeType, sizeBytes, uploadedBy }, db = pool) => {
  const [result] = await db.execute(
    `INSERT INTO gallery_images (title, original_name, stored_name, mime_type, size_bytes, uploaded_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [title, originalName, storedName, mimeType, sizeBytes, uploadedBy],
  )
  return result.insertId
}

export const remove = async (id, db = pool) => {
  await db.execute('DELETE FROM gallery_images WHERE id = ?', [id])
}
