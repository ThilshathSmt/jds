// Database access for exam_attempt_cycles and licence_exam_attempts: the cycles of three
// attempts at the physical driving licence examination and the recorded results.
// No business logic here. Every function takes an optional `db` (pool or transaction connection).
// DATE columns are read as 'YYYY-MM-DD' strings so no time zone can shift them.

import pool from '../config/database.js'

const CYCLE_COLUMNS =
  'id, user_id, cycle_number, source_request_id, application_id, medical_report_document_id, status, created_at'

const ATTEMPT_COLUMNS = `a.id, a.user_id, a.cycle_id, c.cycle_number, a.attempt_number,
  a.exam_date_request_id, DATE_FORMAT(a.exam_date, '%Y-%m-%d') AS exam_date, a.result,
  a.recorded_at`

// Every student has a first cycle. It is created the first time it is needed; the UNIQUE
// key on (user_id, cycle_number) makes a second, simultaneous insert do nothing.
// It belongs to the application the student registered with, when there is one.
export const ensureFirstCycle = async (userId, db = pool) => {
  await db.execute(
    `INSERT IGNORE INTO exam_attempt_cycles (user_id, cycle_number, application_id)
     SELECT u.id, 1,
            (SELECT a.id FROM registration_applications a
              WHERE a.driving_school_id = u.driving_school_id LIMIT 1)
       FROM users u WHERE u.id = ?`,
    [userId],
  )
}

// The student's latest cycle. `forUpdate` locks it for the surrounding transaction, so two
// results or two new cycles for the same student are worked out one after the other.
export const findCurrentCycle = async (userId, db = pool, { forUpdate = false } = {}) => {
  const [rows] = await db.execute(
    `SELECT ${CYCLE_COLUMNS} FROM exam_attempt_cycles
      WHERE user_id = ? ORDER BY cycle_number DESC LIMIT 1${forUpdate ? ' FOR UPDATE' : ''}`,
    [userId],
  )
  return rows[0] ?? null
}

export const findCycleById = async (id, db = pool) => {
  const [rows] = await db.execute(`SELECT ${CYCLE_COLUMNS} FROM exam_attempt_cycles WHERE id = ?`, [id])
  return rows[0] ?? null
}

// Every cycle of the student, oldest first, with how many attempts it has used and failed
export const findCyclesByUser = async (userId, db = pool) => {
  const [rows] = await db.execute(
    `SELECT c.id, c.cycle_number, c.application_id, c.medical_report_document_id, c.status, c.created_at,
            COUNT(a.id) AS attempts_used, COALESCE(SUM(a.result = 'FAILED'), 0) AS attempts_failed
       FROM exam_attempt_cycles c LEFT JOIN licence_exam_attempts a ON a.cycle_id = c.id
      WHERE c.user_id = ?
      GROUP BY c.id ORDER BY c.cycle_number`,
    [userId],
  )
  return rows.map((row) => ({
    ...row,
    attempts_used: Number(row.attempts_used),
    attempts_failed: Number(row.attempts_failed),
  }))
}

// Returns the new cycle's id. `applicationId` is the approved reapplication it starts
// from and `medicalReportDocumentId` the new medical report submitted with it. Fails with
// ER_DUP_ENTRY when the student already has a cycle with this number, or the application
// has already started a cycle.
export const createCycle = async (
  { userId, cycleNumber, applicationId, medicalReportDocumentId = null },
  db = pool,
) => {
  const [result] = await db.execute(
    `INSERT INTO exam_attempt_cycles (user_id, cycle_number, application_id, medical_report_document_id)
     VALUES (?, ?, ?, ?)`,
    [userId, cycleNumber, applicationId, medicalReportDocumentId],
  )
  return result.insertId
}

// EXHAUSTED when the third attempt fails, PASSED when the student passes
export const markCycleStatus = async (id, status, db = pool) => {
  await db.execute('UPDATE exam_attempt_cycles SET status = ? WHERE id = ?', [status, id])
}

// Every attempt of the student, oldest first, with the number of the cycle it belongs to.
// `forUpdate` makes it a locking read: inside a transaction it then returns the rows as
// they are now, including what another transaction committed while this one was waiting
// for a lock (a plain read would still show the transaction's earlier snapshot).
export const findAttemptsByUser = async (userId, db = pool, { forUpdate = false } = {}) => {
  const [rows] = await db.execute(
    `SELECT ${ATTEMPT_COLUMNS}
       FROM licence_exam_attempts a JOIN exam_attempt_cycles c ON c.id = a.cycle_id
      WHERE a.user_id = ? ORDER BY c.cycle_number, a.attempt_number${forUpdate ? ' FOR UPDATE' : ''}`,
    [userId],
  )
  return rows
}

// The attempts recorded for these exam date requests (at most one each)
export const findAttemptsByRequestIds = async (requestIds, db = pool) => {
  if (requestIds.length === 0) return []
  const [rows] = await db.execute(
    `SELECT ${ATTEMPT_COLUMNS}
       FROM licence_exam_attempts a JOIN exam_attempt_cycles c ON c.id = a.cycle_id
      WHERE a.exam_date_request_id IN (${requestIds.map(() => '?').join(', ')})`,
    requestIds,
  )
  return rows
}

// Returns the new attempt's id. Fails with ER_DUP_ENTRY when the request already has a
// result or the cycle already has an attempt with this number.
export const createAttempt = async (
  { userId, cycleId, attemptNumber, examDateRequestId, examDate, result, recordedBy, recordedAt },
  db = pool,
) => {
  const [inserted] = await db.execute(
    `INSERT INTO licence_exam_attempts
       (user_id, cycle_id, attempt_number, exam_date_request_id, exam_date, result, recorded_by, recorded_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, cycleId, attemptNumber, examDateRequestId, examDate, result, recordedBy, recordedAt],
  )
  return inserted.insertId
}
