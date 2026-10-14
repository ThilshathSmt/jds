// Database access for exam_date_requests and exam_date_request_dates. No business logic here.
// Every function takes an optional `db` (pool or transaction connection).
// DATE columns are read as 'YYYY-MM-DD' strings so no time zone can shift them.

import pool from '../config/database.js'

const REQUEST_COLUMNS = `id, user_id, student_name, driving_school_id, medical_report_submitted,
  status, DATE_FORMAT(approved_date, '%Y-%m-%d') AS approved_date, rejection_reason_code,
  rejection_reason, reviewed_at, created_at, updated_at`

// Adds `preferred_dates` (in the order the student chose them) to each request row
const withDates = async (rows, db) => {
  if (rows.length === 0) return rows
  const [dateRows] = await db.execute(
    `SELECT request_id, DATE_FORMAT(preferred_date, '%Y-%m-%d') AS preferred_date
       FROM exam_date_request_dates
      WHERE request_id IN (${rows.map(() => '?').join(', ')})
      ORDER BY request_id, position`,
    rows.map((row) => row.id),
  )
  const datesByRequest = new Map(rows.map((row) => [row.id, []]))
  for (const row of dateRows) datesByRequest.get(row.request_id).push(row.preferred_date)
  return rows.map((row) => ({ ...row, preferred_dates: datesByRequest.get(row.id) }))
}

// Returns the new request's id. Fails with ER_DUP_ENTRY when the student already has a
// pending request (see the UNIQUE key on `pending`).
export const create = async (
  { userId, studentName, drivingSchoolId, medicalReportSubmitted, preferredDates },
  db = pool,
) => {
  const [result] = await db.execute(
    `INSERT INTO exam_date_requests
       (user_id, student_name, driving_school_id, medical_report_submitted)
     VALUES (?, ?, ?, ?)`,
    [userId, studentName, drivingSchoolId, medicalReportSubmitted ? 1 : 0],
  )
  for (const [index, preferredDate] of preferredDates.entries()) {
    await db.execute(
      'INSERT INTO exam_date_request_dates (request_id, position, preferred_date) VALUES (?, ?, ?)',
      [result.insertId, index + 1, preferredDate],
    )
  }
  return result.insertId
}

// `forUpdate` locks the request for the surrounding transaction
export const findById = async (id, db = pool, { forUpdate = false } = {}) => {
  const [rows] = await db.execute(
    `SELECT ${REQUEST_COLUMNS} FROM exam_date_requests WHERE id = ?${forUpdate ? ' FOR UPDATE' : ''}`,
    [id],
  )
  return (await withDates(rows, db))[0] ?? null
}

// Looks the request up by its id AND its owner, so one student can never reach another's
export const findOwned = async (id, userId, db = pool) => {
  const [rows] = await db.execute(
    `SELECT ${REQUEST_COLUMNS} FROM exam_date_requests WHERE id = ? AND user_id = ?`,
    [id, userId],
  )
  return (await withDates(rows, db))[0] ?? null
}

// Newest first
export const findByUser = async (userId, db = pool) => {
  const [rows] = await db.execute(
    `SELECT ${REQUEST_COLUMNS} FROM exam_date_requests
      WHERE user_id = ? ORDER BY created_at DESC, id DESC`,
    [userId],
  )
  return withDates(rows, db)
}

export const findPendingByUser = async (userId, db = pool) => {
  const [rows] = await db.execute(
    `SELECT ${REQUEST_COLUMNS} FROM exam_date_requests WHERE user_id = ? AND pending = 1 LIMIT 1`,
    [userId],
  )
  return (await withDates(rows, db))[0] ?? null
}

// The student's approved request whose examination has no recorded result yet, if any
// (the oldest one first)
export const findAwaitingResultByUser = async (userId, db = pool) => {
  const [rows] = await db.execute(
    `SELECT ${REQUEST_COLUMNS} FROM exam_date_requests
      WHERE user_id = ? AND status = 'APPROVED'
        AND NOT EXISTS (SELECT 1 FROM licence_exam_attempts a WHERE a.exam_date_request_id = exam_date_requests.id)
      ORDER BY approved_date, id LIMIT 1`,
    [userId],
  )
  return (await withDates(rows, db))[0] ?? null
}

export const findAll = async ({ status } = {}, db = pool) => {
  const [rows] = await db.execute(
    `SELECT ${REQUEST_COLUMNS} FROM exam_date_requests
      ${status ? 'WHERE status = ?' : ''}
      ORDER BY created_at DESC, id DESC`,
    status ? [status] : [],
  )
  return withDates(rows, db)
}

// Both changes only apply to a request that is still PENDING, so a request can never be
// decided twice. They return whether the request was changed.

export const markApproved = async (id, { approvedDate, reviewedBy, reviewedAt }, db = pool) => {
  const [result] = await db.execute(
    `UPDATE exam_date_requests
        SET status = 'APPROVED', pending = NULL, approved_date = ?, reviewed_by = ?, reviewed_at = ?
      WHERE id = ? AND status = 'PENDING'`,
    [approvedDate, reviewedBy, reviewedAt, id],
  )
  return result.affectedRows === 1
}

export const markRejected = async (
  id,
  { reasonCode, reason, reviewedBy, reviewedAt },
  db = pool,
) => {
  const [result] = await db.execute(
    `UPDATE exam_date_requests
        SET status = 'REJECTED', pending = NULL, rejection_reason_code = ?, rejection_reason = ?,
            reviewed_by = ?, reviewed_at = ?
      WHERE id = ? AND status = 'PENDING'`,
    [reasonCode, reason, reviewedBy, reviewedAt, id],
  )
  return result.affectedRows === 1
}
