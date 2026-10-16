// Database access for the notifications table. No business logic here.
// Every function takes an optional `db` (pool or transaction connection).

import pool from '../config/database.js'

const NOTIFICATION_COLUMNS =
  'id, user_id, type, title, message, exam_date_request_id, exam_reattempt_request_id, registration_application_id, practical_cycle_id, read_at, created_at'

// One notification for one recipient. Returns its id.
export const create = async (
  {
    userId,
    type,
    title,
    message,
    examDateRequestId = null,
    examReattemptRequestId = null,
    registrationApplicationId = null,
    practicalCycleId = null,
  },
  db = pool,
) => {
  const [result] = await db.execute(
    `INSERT INTO notifications
       (user_id, type, title, message, exam_date_request_id, exam_reattempt_request_id,
        registration_application_id, practical_cycle_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      type,
      title,
      message,
      examDateRequestId,
      examReattemptRequestId,
      registrationApplicationId,
      practicalCycleId,
    ],
  )
  return result.insertId
}

// The recipient's notifications, newest first
export const findByUser = async (userId, { limit }, db = pool) => {
  // query() rather than execute(): prepared statements reject LIMIT placeholders on some
  // MySQL versions. The values are still escaped by the driver, never concatenated.
  const [rows] = await db.query(
    `SELECT ${NOTIFICATION_COLUMNS} FROM notifications
      WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT ?`,
    [userId, limit],
  )
  return rows
}

export const countUnread = async (userId, db = pool) => {
  const [[{ total }]] = await db.execute(
    'SELECT COUNT(*) AS total FROM notifications WHERE user_id = ? AND read_at IS NULL',
    [userId],
  )
  return total
}

// Looks the notification up by its id AND its recipient, so nobody can reach another
// user's. Returns whether such a notification exists.
export const markRead = async (id, userId, readAt, db = pool) => {
  const [result] = await db.execute(
    'UPDATE notifications SET read_at = COALESCE(read_at, ?) WHERE id = ? AND user_id = ?',
    [readAt, id, userId],
  )
  return result.affectedRows === 1
}

export const markAllRead = async (userId, readAt, db = pool) => {
  await db.execute('UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL', [
    readAt,
    userId,
  ])
}

// Marks every recipient's unread notification of one type about a request as read
// (used once the request no longer needs anyone's attention)
export const markReadByRequest = async (examDateRequestId, type, readAt, db = pool) => {
  await db.execute(
    `UPDATE notifications SET read_at = ?
      WHERE exam_date_request_id = ? AND type = ? AND read_at IS NULL`,
    [readAt, examDateRequestId, type],
  )
}

// The same for the notifications about a reattempt request
export const markReadByReattemptRequest = async (examReattemptRequestId, type, readAt, db = pool) => {
  await db.execute(
    `UPDATE notifications SET read_at = ?
      WHERE exam_reattempt_request_id = ? AND type = ? AND read_at IS NULL`,
    [readAt, examReattemptRequestId, type],
  )
}

// The same for the notifications about a registration application
export const markReadByApplication = async (registrationApplicationId, type, readAt, db = pool) => {
  await db.execute(
    `UPDATE notifications SET read_at = ?
      WHERE registration_application_id = ? AND type = ? AND read_at IS NULL`,
    [readAt, registrationApplicationId, type],
  )
}
