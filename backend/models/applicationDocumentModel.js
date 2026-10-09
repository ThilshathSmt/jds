// Database access for application_documents (metadata of uploaded files).
// Every function takes an optional `db` (pool or transaction connection).

import pool from '../config/database.js'

const DOCUMENT_COLUMNS =
  'id, application_id, document_type, original_name, stored_name, mime_type, size_bytes, created_at'

export const create = async (
  { applicationId, documentType, originalName, storedName, mimeType, sizeBytes },
  db = pool,
) => {
  const [result] = await db.execute(
    `INSERT INTO application_documents
       (application_id, document_type, original_name, stored_name, mime_type, size_bytes)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [applicationId, documentType, originalName, storedName, mimeType, sizeBytes],
  )
  return result.insertId
}

export const findByApplicationId = async (applicationId, db = pool) => {
  const [rows] = await db.execute(
    `SELECT ${DOCUMENT_COLUMNS} FROM application_documents WHERE application_id = ? ORDER BY id`,
    [applicationId],
  )
  return rows
}

// Looks the document up by both ids, so a document can only be reached through its application
export const findOne = async (applicationId, documentId, db = pool) => {
  const [rows] = await db.execute(
    `SELECT ${DOCUMENT_COLUMNS} FROM application_documents WHERE application_id = ? AND id = ? LIMIT 1`,
    [applicationId, documentId],
  )
  return rows[0] ?? null
}
