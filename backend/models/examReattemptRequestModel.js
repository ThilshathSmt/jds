// Database access for exam_reattempt_requests and exam_reattempt_request_documents: what a
// student submits after a failed examination (the reattempt fee and, after a third
// failure, a new medical report). No business logic here.
// Every function takes an optional `db` (pool or transaction connection).

import pool from '../config/database.js'

const REQUEST_COLUMNS = `r.id, r.user_id, r.student_name, r.driving_school_id, r.cycle_id,
  c.cycle_number, r.failed_attempt_id, a.attempt_number,
  DATE_FORMAT(a.exam_date, '%Y-%m-%d') AS exam_date, a.result AS attempt_result,
  r.medical_report_required, r.reapplication_id, r.fee_amount, r.payment_method, r.status, r.medical_report_status,
  r.payment_status, r.rejection_reason, r.reviewed_at, r.created_at, r.updated_at`

// The failed attempt is joined loosely: a row from before attempts were linked may have none
const FROM = `exam_reattempt_requests r
  JOIN exam_attempt_cycles c ON c.id = r.cycle_id
  LEFT JOIN licence_exam_attempts a ON a.id = r.failed_attempt_id`

const DOCUMENT_COLUMNS =
  'id, request_id, document_type, original_name, stored_name, mime_type, size_bytes, created_at'

// Returns the new request's id. Fails with ER_DUP_ENTRY when the student already has a
// pending request (see the UNIQUE key on `pending`).
export const create = async (
  {
    userId,
    studentName,
    drivingSchoolId,
    cycleId,
    failedAttemptId,
    medicalReportRequired,
    reapplicationId = null,
    feeAmount,
    paymentMethod,
  },
  db = pool,
) => {
  const [result] = await db.execute(
    `INSERT INTO exam_reattempt_requests
       (user_id, student_name, driving_school_id, cycle_id, failed_attempt_id,
        medical_report_required, reapplication_id, fee_amount, payment_method)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      studentName,
      drivingSchoolId,
      cycleId,
      failedAttemptId,
      medicalReportRequired ? 1 : 0,
      reapplicationId,
      feeAmount,
      paymentMethod,
    ],
  )
  return result.insertId
}

// The payment is decided with this reapplication from now on
export const linkReapplication = async (id, reapplicationId, db = pool) => {
  await db.execute('UPDATE exam_reattempt_requests SET reapplication_id = ? WHERE id = ?', [
    reapplicationId,
    id,
  ])
}

export const addDocument = async (
  { requestId, documentType, originalName, storedName, mimeType, sizeBytes },
  db = pool,
) => {
  await db.execute(
    `INSERT INTO exam_reattempt_request_documents
       (request_id, document_type, original_name, stored_name, mime_type, size_bytes)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [requestId, documentType, originalName, storedName, mimeType, sizeBytes],
  )
}

// `forUpdate` locks the request for the surrounding transaction
export const findById = async (id, db = pool, { forUpdate = false } = {}) => {
  const [rows] = await db.execute(
    `SELECT ${REQUEST_COLUMNS} FROM ${FROM} WHERE r.id = ?${forUpdate ? ' FOR UPDATE' : ''}`,
    [id],
  )
  return rows[0] ?? null
}

// Looks the request up by its id AND its owner, so one student can never reach another's
export const findOwned = async (id, userId, db = pool) => {
  const [rows] = await db.execute(
    `SELECT ${REQUEST_COLUMNS} FROM ${FROM} WHERE r.id = ? AND r.user_id = ?`,
    [id, userId],
  )
  return rows[0] ?? null
}

// Newest first
export const findByUser = async (userId, db = pool) => {
  const [rows] = await db.execute(
    `SELECT ${REQUEST_COLUMNS} FROM ${FROM} WHERE r.user_id = ? ORDER BY r.created_at DESC, r.id DESC`,
    [userId],
  )
  return rows
}

export const findAll = async ({ status } = {}, db = pool) => {
  const [rows] = await db.execute(
    `SELECT ${REQUEST_COLUMNS} FROM ${FROM}
      ${status ? 'WHERE r.status = ?' : ''}
      ORDER BY r.created_at DESC, r.id DESC`,
    status ? [status] : [],
  )
  return rows
}

// Both changes only apply to a request that is still PENDING, so a request can never be
// decided twice. They return whether the request was changed.

// Fails with ER_DUP_ENTRY when the failed attempt already has an approved payment
export const markApproved = async (id, { reviewedBy, reviewedAt }, db = pool) => {
  const [result] = await db.execute(
    `UPDATE exam_reattempt_requests
        SET status = 'APPROVED', medical_report_status = 'APPROVED', payment_status = 'APPROVED',
            pending = NULL, approved = 1, reviewed_by = ?, reviewed_at = ?
      WHERE id = ? AND status = 'PENDING'`,
    [reviewedBy, reviewedAt, id],
  )
  return result.affectedRows === 1
}

export const markRejected = async (
  id,
  { medicalReportStatus, paymentStatus, reason, reviewedBy, reviewedAt },
  db = pool,
) => {
  const [result] = await db.execute(
    `UPDATE exam_reattempt_requests
        SET status = 'REJECTED', medical_report_status = ?, payment_status = ?, pending = NULL,
            rejection_reason = ?, reviewed_by = ?, reviewed_at = ?
      WHERE id = ? AND status = 'PENDING'`,
    [medicalReportStatus, paymentStatus, reason, reviewedBy, reviewedAt, id],
  )
  return result.affectedRows === 1
}

export const findDocuments = async (requestId, db = pool) => {
  const [rows] = await db.execute(
    `SELECT ${DOCUMENT_COLUMNS} FROM exam_reattempt_request_documents WHERE request_id = ? ORDER BY id`,
    [requestId],
  )
  return rows
}

// Looks the document up by both ids, so a document can only be reached through its request
export const findDocument = async (requestId, documentId, db = pool) => {
  const [rows] = await db.execute(
    `SELECT ${DOCUMENT_COLUMNS} FROM exam_reattempt_request_documents
      WHERE request_id = ? AND id = ? LIMIT 1`,
    [requestId, documentId],
  )
  return rows[0] ?? null
}
