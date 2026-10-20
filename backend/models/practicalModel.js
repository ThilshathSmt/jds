// Database access for practical training and the practical driving test: practical_cycles,
// practical_cycle_instructors, practical_lessons, practical_test_attempts and
// practical_reattempt_payments. No business logic here.
// Every function takes an optional `db` (pool or transaction connection).
// DATE columns are read as 'YYYY-MM-DD' strings and TIME columns as 'HH:MM', so no time
// zone can shift them.

import pool from '../config/database.js'
import { LESSONS_PER_CYCLE } from '../config/practical.js'

const lockSuffix = (forUpdate) => (forUpdate ? ' FOR UPDATE' : '')

// ---- Cycles

const CYCLE_COLUMNS = `c.id, c.user_id, c.cycle_number, c.source_attempt_id, c.application_id,
  DATE_FORMAT(c.exam_date, '%Y-%m-%d') AS exam_date,
  DATE_FORMAT(c.provisional_test_date, '%Y-%m-%d') AS provisional_test_date,
  c.status, c.created_at, c.updated_at,
  u.name AS student_name, u.driving_school_id, u.locked_at AS student_locked_at`

const CYCLE_FROM = 'practical_cycles c JOIN users u ON u.id = c.user_id'

// Returns the new cycle's id. Fails with ER_DUP_ENTRY when the student already has a
// cycle with this number, or the exam / application already started one.
export const createCycle = async (
  { userId, cycleNumber, sourceAttemptId = null, applicationId = null, examDate = null, provisionalTestDate = null },
  db = pool,
) => {
  const [result] = await db.execute(
    `INSERT INTO practical_cycles
       (user_id, cycle_number, source_attempt_id, application_id, exam_date, provisional_test_date)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, cycleNumber, sourceAttemptId, applicationId, examDate, provisionalTestDate],
  )
  return result.insertId
}

// The 10 lesson rows of a cycle. INSERT IGNORE with the UNIQUE (cycle_id, lesson_number)
// key: running it again never adds a lesson.
export const ensureLessons = async (cycleId, db = pool) => {
  const numbers = Array.from({ length: LESSONS_PER_CYCLE }, (_, index) => index + 1)
  await db.execute(
    `INSERT IGNORE INTO practical_lessons (cycle_id, lesson_number) VALUES ${numbers.map(() => '(?, ?)').join(', ')}`,
    numbers.flatMap((number) => [cycleId, number]),
  )
}

// `forUpdate` locks the cycle row: whoever holds it is the only one changing the cycle's
// instructors, lessons, test attempts or status
export const findCycleById = async (id, db = pool, { forUpdate = false } = {}) => {
  const [rows] = await db.execute(`SELECT ${CYCLE_COLUMNS} FROM ${CYCLE_FROM} WHERE c.id = ?${lockSuffix(forUpdate)}`, [id])
  return rows[0] ?? null
}

// The student's latest cycle
export const findLatestCycleByUser = async (userId, db = pool, { forUpdate = false } = {}) => {
  const [rows] = await db.execute(
    `SELECT ${CYCLE_COLUMNS} FROM ${CYCLE_FROM} WHERE c.user_id = ?
      ORDER BY c.cycle_number DESC LIMIT 1${lockSuffix(forUpdate)}`,
    [userId],
  )
  return rows[0] ?? null
}

export const findCyclesByUser = async (userId, db = pool) => {
  const [rows] = await db.execute(
    `SELECT ${CYCLE_COLUMNS} FROM ${CYCLE_FROM} WHERE c.user_id = ? ORDER BY c.cycle_number`,
    [userId],
  )
  return rows
}

// Every cycle with what the admin's list shows: lesson counts, instructors, the final
// test date (attempt 1) and the latest attempt. `status` filters by cycle status.
export const findCyclesForAdmin = async ({ status } = {}, db = pool) => {
  const [rows] = await db.execute(
    `SELECT ${CYCLE_COLUMNS},
            (SELECT COUNT(*) FROM practical_cycle_instructors i WHERE i.cycle_id = c.id) AS instructor_count,
            (SELECT COUNT(*) FROM practical_lessons l WHERE l.cycle_id = c.id AND l.attendance = 'ATTENDED') AS attended,
            (SELECT COUNT(*) FROM practical_lessons l WHERE l.cycle_id = c.id AND l.attendance = 'ABSENT') AS absent,
            (SELECT COUNT(*) FROM practical_lessons l WHERE l.cycle_id = c.id AND l.lesson_date IS NOT NULL) AS scheduled,
            (SELECT DATE_FORMAT(t.test_date, '%Y-%m-%d') FROM practical_test_attempts t
              WHERE t.cycle_id = c.id AND t.attempt_number = 1) AS final_test_date,
            (SELECT COUNT(*) FROM practical_test_attempts t WHERE t.cycle_id = c.id) AS attempts_scheduled,
            (SELECT COUNT(*) FROM instructor_feedbacks f WHERE f.cycle_id = c.id AND f.status = 'SUBMITTED') AS feedback_count
       FROM ${CYCLE_FROM}
      ${status ? 'WHERE c.status = ?' : ''}
      ORDER BY FIELD(c.status, 'ACTIVE', 'PASSED', 'EXHAUSTED'), c.created_at DESC, c.id DESC`,
    status ? [status] : [],
  )
  return rows.map((row) => ({
    ...row,
    instructor_count: Number(row.instructor_count),
    attended: Number(row.attended),
    absent: Number(row.absent),
    scheduled: Number(row.scheduled),
    attempts_scheduled: Number(row.attempts_scheduled),
    feedback_count: Number(row.feedback_count),
  }))
}

export const markCycleStatus = async (id, status, db = pool) => {
  await db.execute('UPDATE practical_cycles SET status = ? WHERE id = ?', [status, id])
}

// ---- Instructors of a cycle

const INSTRUCTOR_COLUMNS = `u.id, u.name, u.driving_school_id, u.email, u.status, u.responsibility`

export const findCycleInstructors = async (cycleId, db = pool) => {
  const [rows] = await db.execute(
    `SELECT ${INSTRUCTOR_COLUMNS}, i.assigned_at
       FROM practical_cycle_instructors i JOIN users u ON u.id = i.instructor_id
      WHERE i.cycle_id = ? ORDER BY i.assigned_at, u.name`,
    [cycleId],
  )
  return rows
}

export const isCycleInstructor = async (cycleId, instructorId, db = pool) => {
  const [rows] = await db.execute(
    'SELECT 1 FROM practical_cycle_instructors WHERE cycle_id = ? AND instructor_id = ?',
    [cycleId, instructorId],
  )
  return rows.length > 0
}

export const addCycleInstructor = async (cycleId, instructorId, assignedBy, db = pool) => {
  await db.execute(
    'INSERT IGNORE INTO practical_cycle_instructors (cycle_id, instructor_id, assigned_by) VALUES (?, ?, ?)',
    [cycleId, instructorId, assignedBy],
  )
}

export const removeCycleInstructor = async (cycleId, instructorId, db = pool) => {
  await db.execute('DELETE FROM practical_cycle_instructors WHERE cycle_id = ? AND instructor_id = ?', [
    cycleId,
    instructorId,
  ])
}

// Instructor accounts that can be assigned (active ones), with their responsibility
export const findActiveInstructors = async (db = pool) => {
  const [rows] = await db.execute(
    `SELECT ${INSTRUCTOR_COLUMNS} FROM users u WHERE u.role = 'instructor' AND u.status = 'active' ORDER BY u.name`,
  )
  return rows
}

export const findInstructorsByIds = async (ids, db = pool) => {
  if (ids.length === 0) return []
  const [rows] = await db.execute(
    `SELECT ${INSTRUCTOR_COLUMNS}, u.role FROM users u WHERE u.id IN (${ids.map(() => '?').join(', ')})`,
    ids,
  )
  return rows
}

// ---- Lessons

const LESSON_COLUMNS = `l.id, l.cycle_id, l.lesson_number, l.instructor_id,
  DATE_FORMAT(l.lesson_date, '%Y-%m-%d') AS lesson_date, TIME_FORMAT(l.start_time, '%H:%i') AS start_time,
  l.location, l.attendance, l.attendance_marked_by, l.attendance_marked_at, l.updated_at,
  iu.name AS instructor_name, iu.driving_school_id AS instructor_driving_school_id,
  iu.responsibility AS instructor_responsibility, mu.name AS marked_by_name`

const LESSON_FROM = `practical_lessons l
  LEFT JOIN users iu ON iu.id = l.instructor_id
  LEFT JOIN users mu ON mu.id = l.attendance_marked_by`

export const findLessonsByCycle = async (cycleId, db = pool) => {
  const [rows] = await db.execute(
    `SELECT ${LESSON_COLUMNS} FROM ${LESSON_FROM} WHERE l.cycle_id = ? ORDER BY l.lesson_number`,
    [cycleId],
  )
  return rows
}

export const findLessonByNumber = async (cycleId, lessonNumber, db = pool, { forUpdate = false } = {}) => {
  const [rows] = await db.execute(
    `SELECT ${LESSON_COLUMNS} FROM ${LESSON_FROM}
      WHERE l.cycle_id = ? AND l.lesson_number = ?${lockSuffix(forUpdate)}`,
    [cycleId, lessonNumber],
  )
  return rows[0] ?? null
}

// One lesson with its cycle and student. `forUpdate` locks the lesson.
export const findLessonById = async (id, db = pool, { forUpdate = false } = {}) => {
  const [rows] = await db.execute(
    `SELECT ${LESSON_COLUMNS}, c.status AS cycle_status, c.user_id AS student_id,
            su.name AS student_name, su.driving_school_id AS student_driving_school_id
       FROM ${LESSON_FROM} JOIN practical_cycles c ON c.id = l.cycle_id JOIN users su ON su.id = c.user_id
      WHERE l.id = ?${lockSuffix(forUpdate)}`,
    [id],
  )
  return rows[0] ?? null
}

// Every lesson assigned to the instructor, with its student and cycle, soonest first
export const findLessonsByInstructor = async (instructorId, db = pool) => {
  const [rows] = await db.execute(
    `SELECT ${LESSON_COLUMNS}, c.status AS cycle_status, c.cycle_number, c.user_id AS student_id,
            su.name AS student_name, su.driving_school_id AS student_driving_school_id,
            (SELECT COUNT(*) FROM practical_test_attempts t WHERE t.cycle_id = c.id) AS attempts_scheduled
       FROM ${LESSON_FROM} JOIN practical_cycles c ON c.id = l.cycle_id JOIN users su ON su.id = c.user_id
      WHERE l.instructor_id = ?
      ORDER BY l.lesson_date IS NULL, l.lesson_date, l.start_time, su.name, l.lesson_number`,
    [instructorId],
  )
  return rows.map((row) => ({ ...row, attempts_scheduled: Number(row.attempts_scheduled) }))
}

export const countLessonsOfInstructor = async (cycleId, instructorId, db = pool) => {
  const [rows] = await db.execute(
    'SELECT COUNT(*) AS n FROM practical_lessons WHERE cycle_id = ? AND instructor_id = ?',
    [cycleId, instructorId],
  )
  return Number(rows[0].n)
}

export const updateLessonSchedule = async (id, { instructorId, lessonDate, startTime, location, updatedBy }, db = pool) => {
  await db.execute(
    `UPDATE practical_lessons
        SET instructor_id = ?, lesson_date = ?, start_time = ?, location = ?, updated_by = ?
      WHERE id = ? AND attendance = 'PENDING'`,
    [instructorId, lessonDate, startTime, location, updatedBy, id],
  )
}

// The schema does not store lesson duration or availability blocks, so the supported
// conflict check is an exact date/start-time collision among still-pending lessons.
export const findLessonScheduleConflicts = async (
  { cycleId, lessonId, studentId, instructorId, lessonDate, startTime },
  db = pool,
) => {
  const [[row]] = await db.execute(`SELECT
    EXISTS(SELECT 1 FROM practical_lessons l JOIN practical_cycles c ON c.id = l.cycle_id
      WHERE c.user_id = ? AND c.status = 'ACTIVE' AND l.attendance = 'PENDING'
        AND l.lesson_date = ? AND l.start_time = ? AND l.id <> ?) AS student_conflict,
    EXISTS(SELECT 1 FROM practical_lessons l JOIN practical_cycles c ON c.id = l.cycle_id
      WHERE l.instructor_id = ? AND c.status = 'ACTIVE' AND l.attendance = 'PENDING'
        AND l.lesson_date = ? AND l.start_time = ? AND l.id <> ?) AS instructor_conflict`,
  [studentId, lessonDate, startTime, lessonId, instructorId, lessonDate, startTime, lessonId])
  return { student: Boolean(row.student_conflict), instructor: Boolean(row.instructor_conflict) }
}

export const markAttendance = async (id, { attendance, markedBy, markedAt }, db = pool) => {
  await db.execute(
    'UPDATE practical_lessons SET attendance = ?, attendance_marked_by = ?, attendance_marked_at = ? WHERE id = ?',
    [attendance, markedBy, markedAt, id],
  )
}

// ---- Practical test attempts

const ATTEMPT_COLUMNS = `t.id, t.cycle_id, t.user_id, t.attempt_number,
  DATE_FORMAT(t.test_date, '%Y-%m-%d') AS test_date, t.result, t.remarks, t.reattempt_fee,
  t.scheduled_at, t.recorded_at`

// The cycle's attempts, in order. `forUpdate` makes it a locking read (see licenceExamModel).
export const findAttemptsByCycle = async (cycleId, db = pool, { forUpdate = false } = {}) => {
  const [rows] = await db.execute(
    `SELECT ${ATTEMPT_COLUMNS} FROM practical_test_attempts t WHERE t.cycle_id = ?
      ORDER BY t.attempt_number${lockSuffix(forUpdate)}`,
    [cycleId],
  )
  return rows
}

// Fails with ER_DUP_ENTRY when the cycle already has an attempt with this number
export const createAttempt = async ({ cycleId, userId, attemptNumber, testDate, scheduledBy, scheduledAt }, db = pool) => {
  const [result] = await db.execute(
    `INSERT INTO practical_test_attempts (cycle_id, user_id, attempt_number, test_date, scheduled_by, scheduled_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [cycleId, userId, attemptNumber, testDate, scheduledBy, scheduledAt],
  )
  return result.insertId
}

// Only while the attempt has no result
export const updateAttemptDate = async (id, { testDate, scheduledBy, scheduledAt }, db = pool) => {
  const [result] = await db.execute(
    'UPDATE practical_test_attempts SET test_date = ?, scheduled_by = ?, scheduled_at = ? WHERE id = ? AND result IS NULL',
    [testDate, scheduledBy, scheduledAt, id],
  )
  return result.affectedRows === 1
}

// Records the result once: returns false when the attempt already has one
export const recordAttemptResult = async (id, { result, remarks, reattemptFee, recordedBy, recordedAt }, db = pool) => {
  const [updated] = await db.execute(
    `UPDATE practical_test_attempts
        SET result = ?, remarks = ?, reattempt_fee = ?, recorded_by = ?, recorded_at = ?
      WHERE id = ? AND result IS NULL`,
    [result, remarks, reattemptFee, recordedBy, recordedAt, id],
  )
  return updated.affectedRows === 1
}

// ---- Practical reattempt payments

const PAYMENT_COLUMNS = `p.id, p.user_id, p.cycle_id, p.failed_attempt_id, t.attempt_number,
  p.fee_amount, p.payment_method, p.status, p.rejection_reason, p.original_name, p.stored_name,
  p.mime_type, p.size_bytes, p.reviewed_at, p.created_at`

const PAYMENT_FROM = 'practical_reattempt_payments p JOIN practical_test_attempts t ON t.id = p.failed_attempt_id'

// Returns the new payment's id. Fails with ER_DUP_ENTRY when the student already has a
// pending payment.
export const createPayment = async (
  { userId, cycleId, failedAttemptId, feeAmount, paymentMethod, originalName, storedName, mimeType, sizeBytes },
  db = pool,
) => {
  const [result] = await db.execute(
    `INSERT INTO practical_reattempt_payments
       (user_id, cycle_id, failed_attempt_id, fee_amount, payment_method, original_name, stored_name, mime_type, size_bytes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, cycleId, failedAttemptId, feeAmount, paymentMethod, originalName, storedName, mimeType, sizeBytes],
  )
  return result.insertId
}

// Newest first
export const findPaymentsByCycle = async (cycleId, db = pool) => {
  const [rows] = await db.execute(
    `SELECT ${PAYMENT_COLUMNS} FROM ${PAYMENT_FROM} WHERE p.cycle_id = ? ORDER BY p.created_at DESC, p.id DESC`,
    [cycleId],
  )
  return rows
}

export const findPaymentById = async (id, db = pool, { forUpdate = false } = {}) => {
  const [rows] = await db.execute(`SELECT ${PAYMENT_COLUMNS} FROM ${PAYMENT_FROM} WHERE p.id = ?${lockSuffix(forUpdate)}`, [id])
  return rows[0] ?? null
}

export const findPendingPaymentByUser = async (userId, db = pool) => {
  const [rows] = await db.execute('SELECT id FROM practical_reattempt_payments WHERE user_id = ? AND pending = 1', [userId])
  return rows[0] ?? null
}

// Both only change a PENDING payment; they return whether it was changed
export const markPaymentApproved = async (id, { reviewedBy, reviewedAt }, db = pool) => {
  const [result] = await db.execute(
    `UPDATE practical_reattempt_payments
        SET status = 'APPROVED', pending = NULL, approved = 1, reviewed_by = ?, reviewed_at = ?
      WHERE id = ? AND status = 'PENDING'`,
    [reviewedBy, reviewedAt, id],
  )
  return result.affectedRows === 1
}

export const markPaymentRejected = async (id, { reason, reviewedBy, reviewedAt }, db = pool) => {
  const [result] = await db.execute(
    `UPDATE practical_reattempt_payments
        SET status = 'REJECTED', pending = NULL, rejection_reason = ?, reviewed_by = ?, reviewed_at = ?
      WHERE id = ? AND status = 'PENDING'`,
    [reason, reviewedBy, reviewedAt, id],
  )
  return result.affectedRows === 1
}
