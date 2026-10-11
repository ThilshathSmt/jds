// Database access for exam_attempts and exam_attempt_answers. No business logic here.
// Every function takes an optional `db` (pool or transaction connection).

import pool from '../config/database.js'

const ATTEMPT_COLUMNS = `id, user_id, exam_id, paper_id, status, submission_type, question_order,
  answer_key, total_questions, duration_seconds, started_at, deadline_at, submitted_at,
  completed_at, correct_count, incorrect_count, unanswered_count`

// Returns the new attempt's id. Fails with ER_DUP_ENTRY when the student already has an
// unfinished attempt at this paper (see the UNIQUE key on `active`).
export const create = async (
  { userId, examId, paperId, questionOrder, totalQuestions, durationSeconds, startedAt, deadlineAt },
  db = pool,
) => {
  const [result] = await db.execute(
    `INSERT INTO exam_attempts
       (user_id, exam_id, paper_id, question_order, total_questions, duration_seconds,
        started_at, deadline_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      examId,
      paperId,
      JSON.stringify(questionOrder),
      totalQuestions,
      durationSeconds,
      startedAt,
      deadlineAt,
    ],
  )
  return result.insertId
}

// Looks the attempt up by its id AND its owner, so one student can never reach another's.
// `forUpdate` locks the row for the surrounding transaction.
export const findOwned = async (id, userId, db = pool, { forUpdate = false } = {}) => {
  const [rows] = await db.execute(
    `SELECT ${ATTEMPT_COLUMNS} FROM exam_attempts
      WHERE id = ? AND user_id = ? LIMIT 1${forUpdate ? ' FOR UPDATE' : ''}`,
    [id, userId],
  )
  return rows[0] ?? null
}

// The student's unfinished attempt at a paper (in progress or under review), if any
export const findActive = async (userId, examId, paperId, db = pool) => {
  const [rows] = await db.execute(
    `SELECT ${ATTEMPT_COLUMNS} FROM exam_attempts
      WHERE user_id = ? AND exam_id = ? AND paper_id = ? AND active = 1 LIMIT 1`,
    [userId, examId, paperId],
  )
  return rows[0] ?? null
}

export const findLatestCompleted = async (userId, examId, paperId, db = pool) => {
  const [rows] = await db.execute(
    `SELECT ${ATTEMPT_COLUMNS} FROM exam_attempts
      WHERE user_id = ? AND exam_id = ? AND paper_id = ? AND status = 'completed'
      ORDER BY completed_at DESC, id DESC LIMIT 1`,
    [userId, examId, paperId],
  )
  return rows[0] ?? null
}

// { questionId: optionId } for every question the student has answered
export const findAnswers = async (attemptId, db = pool) => {
  const [rows] = await db.execute(
    'SELECT question_id, option_id FROM exam_attempt_answers WHERE attempt_id = ?',
    [attemptId],
  )
  return Object.fromEntries(rows.map((row) => [row.question_id, row.option_id]))
}

// Stores the student's choice for a question, replacing an earlier choice
export const saveAnswer = async ({ attemptId, questionId, optionId, answeredAt }, db = pool) => {
  await db.execute(
    `INSERT INTO exam_attempt_answers (attempt_id, question_id, option_id, answered_at)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE option_id = VALUES(option_id), answered_at = VALUES(answered_at)`,
    [attemptId, questionId, optionId, answeredAt],
  )
}

export const markSubmitted = async (
  id,
  { submissionType, submittedAt, answerKey, correctCount, incorrectCount, unansweredCount },
  db = pool,
) => {
  await db.execute(
    `UPDATE exam_attempts
        SET status = 'submitted', submission_type = ?, submitted_at = ?, answer_key = ?,
            correct_count = ?, incorrect_count = ?, unanswered_count = ?
      WHERE id = ?`,
    [
      submissionType,
      submittedAt,
      JSON.stringify(answerKey),
      correctCount,
      incorrectCount,
      unansweredCount,
      id,
    ],
  )
}

// "Back to Quiz": the attempt carries on with its original start time and deadline
export const reopen = async (id, db = pool) => {
  await db.execute(
    `UPDATE exam_attempts
        SET status = 'in_progress', submission_type = NULL, submitted_at = NULL,
            answer_key = NULL, correct_count = NULL, incorrect_count = NULL,
            unanswered_count = NULL
      WHERE id = ?`,
    [id],
  )
}

// Final: `active` becomes NULL, which lets the student start a new attempt at the paper
export const markCompleted = async (id, completedAt, db = pool) => {
  await db.execute(
    "UPDATE exam_attempts SET status = 'completed', active = NULL, completed_at = ? WHERE id = ?",
    [completedAt, id],
  )
}
