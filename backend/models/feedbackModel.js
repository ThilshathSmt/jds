// Database access for instructor_feedbacks and instructor_feedback_lessons. No business
// logic here. Every function takes an optional `db` (pool or transaction connection).

import pool from '../config/database.js'

const FEEDBACK_COLUMNS = `f.id, f.cycle_id, c.cycle_number, f.student_id, f.instructor_id, f.status,
  f.driving_skills, f.strengths, f.improvements, f.safety_awareness, f.comments, f.recommendation,
  f.submitted_at, f.created_at, f.updated_at,
  su.name AS student_name, su.driving_school_id AS student_driving_school_id,
  iu.name AS instructor_name, iu.driving_school_id AS instructor_driving_school_id`

const FEEDBACK_FROM = `instructor_feedbacks f
  JOIN practical_cycles c ON c.id = f.cycle_id
  JOIN users su ON su.id = f.student_id
  JOIN users iu ON iu.id = f.instructor_id`

const FIELDS = ['driving_skills', 'strengths', 'improvements', 'safety_awareness', 'comments', 'recommendation']
const toParams = (input) => [
  input.drivingSkills,
  input.strengths,
  input.improvements,
  input.safetyAwareness,
  input.comments,
  input.recommendation,
]

// Returns the new feedback's id. `submittedAt` is set when it is submitted straight away.
export const create = async ({ cycleId, studentId, instructorId, status, submittedAt, ...input }, db = pool) => {
  const [result] = await db.execute(
    `INSERT INTO instructor_feedbacks
       (cycle_id, student_id, instructor_id, status, submitted_at, ${FIELDS.join(', ')})
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [cycleId, studentId, instructorId, status, submittedAt, ...toParams(input)],
  )
  return result.insertId
}

// Only a DRAFT can change; returns whether it did
export const update = async (id, { status, submittedAt, ...input }, db = pool) => {
  const [result] = await db.execute(
    `UPDATE instructor_feedbacks
        SET status = ?, submitted_at = ?, ${FIELDS.map((field) => `${field} = ?`).join(', ')}
      WHERE id = ? AND status = 'DRAFT'`,
    [status, submittedAt, ...toParams(input), id],
  )
  return result.affectedRows === 1
}

export const replaceLessons = async (feedbackId, lessonIds, db = pool) => {
  await db.execute('DELETE FROM instructor_feedback_lessons WHERE feedback_id = ?', [feedbackId])
  for (const lessonId of lessonIds) {
    await db.execute('INSERT INTO instructor_feedback_lessons (feedback_id, lesson_id) VALUES (?, ?)', [
      feedbackId,
      lessonId,
    ])
  }
}

export const findById = async (id, db = pool, { forUpdate = false } = {}) => {
  const [rows] = await db.execute(`SELECT ${FEEDBACK_COLUMNS} FROM ${FEEDBACK_FROM} WHERE f.id = ?${forUpdate ? ' FOR UPDATE' : ''}`, [id])
  return rows[0] ?? null
}

// { feedbackId: [{ id, lesson_number }] } for the given feedback ids
export const findLessonsOf = async (feedbackIds, db = pool) => {
  if (feedbackIds.length === 0) return {}
  const [rows] = await db.execute(
    `SELECT fl.feedback_id, l.id, l.lesson_number, DATE_FORMAT(l.lesson_date, '%Y-%m-%d') AS lesson_date
       FROM instructor_feedback_lessons fl JOIN practical_lessons l ON l.id = fl.lesson_id
      WHERE fl.feedback_id IN (${feedbackIds.map(() => '?').join(', ')}) ORDER BY l.lesson_number`,
    feedbackIds,
  )
  const byFeedback = {}
  for (const row of rows) (byFeedback[row.feedback_id] ??= []).push(row)
  return byFeedback
}

export const findByInstructor = async (instructorId, db = pool) => {
  const [rows] = await db.execute(
    `SELECT ${FEEDBACK_COLUMNS} FROM ${FEEDBACK_FROM} WHERE f.instructor_id = ?
      ORDER BY f.updated_at DESC, f.id DESC`,
    [instructorId],
  )
  return rows
}

// Submitted feedback only. `filters`: { cycleId, instructorId, search (student name or
// Driving School ID), from, to (Date) }
export const findSubmitted = async ({ cycleId, instructorId, search, from, to } = {}, db = pool) => {
  const conditions = ["f.status = 'SUBMITTED'"]
  const params = []
  if (cycleId) {
    conditions.push('f.cycle_id = ?')
    params.push(cycleId)
  }
  if (instructorId) {
    conditions.push('f.instructor_id = ?')
    params.push(instructorId)
  }
  if (search) {
    conditions.push('(su.name LIKE ? OR su.driving_school_id LIKE ?)')
    params.push(`%${search}%`, `%${search}%`)
  }
  // `from` / `to` are moments (Date): the start of the first day and the start of the day
  // after the last one, in Sri Lanka time (worked out by the service)
  if (from) {
    conditions.push('f.submitted_at >= ?')
    params.push(from)
  }
  if (to) {
    conditions.push('f.submitted_at < ?')
    params.push(to)
  }
  const [rows] = await db.execute(
    `SELECT ${FEEDBACK_COLUMNS} FROM ${FEEDBACK_FROM} WHERE ${conditions.join(' AND ')}
      ORDER BY f.submitted_at DESC, f.id DESC`,
    params,
  )
  return rows
}

export const countSubmittedByCycle = async (cycleId, db = pool) => {
  const [rows] = await db.execute(
    "SELECT COUNT(*) AS n FROM instructor_feedbacks WHERE cycle_id = ? AND status = 'SUBMITTED'",
    [cycleId],
  )
  return Number(rows[0].n)
}
