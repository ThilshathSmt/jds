// Notifications for any role: what the bell and the Notifications pages show. Other
// services create notifications through notify() / notifyRole(), inside their own
// transaction, so a notification exists exactly when the change it reports was saved.
// A user only ever reads or changes their own notifications.

import * as notificationModel from '../models/notificationModel.js'
import * as userModel from '../models/userModel.js'
import AppError from '../utils/AppError.js'

export const NOTIFICATION_TYPES = {
  examDateRequestSubmitted: 'EXAM_DATE_REQUEST_SUBMITTED',
  examDateRequestApproved: 'EXAM_DATE_REQUEST_APPROVED',
  examDateRequestRejected: 'EXAM_DATE_REQUEST_REJECTED',
}

const toNotification = (row) => ({
  id: row.id,
  type: row.type,
  title: row.title,
  message: row.message,
  examDateRequestId: row.exam_date_request_id,
  read: row.read_at !== null,
  readAt: row.read_at,
  createdAt: row.created_at,
})

// `notification` is { type, title, message, examDateRequestId? }
export const notify = (userId, notification, db) =>
  notificationModel.create({ userId, ...notification }, db)

// One notification for every active account of the role
export const notifyRole = async (role, notification, db) => {
  for (const userId of await userModel.findActiveIdsByRole(role, db)) {
    await notify(userId, notification, db)
  }
}

// Nobody has to act on the request any more
export const markRequestNotificationsRead = (examDateRequestId, type, readAt, db) =>
  notificationModel.markReadByRequest(examDateRequestId, type, readAt, db)

export const list = async (userId, { limit }) => ({
  notifications: (await notificationModel.findByUser(userId, { limit })).map(toNotification),
  unreadCount: await notificationModel.countUnread(userId),
})

// The same answer for "does not exist" and "belongs to someone else"
export const markRead = async (id, userId, now = new Date()) => {
  if (!(await notificationModel.markRead(id, userId, now))) {
    throw new AppError(404, 'Notification not found.')
  }
  return { unreadCount: await notificationModel.countUnread(userId) }
}

export const markAllRead = async (userId, now = new Date()) => {
  await notificationModel.markAllRead(userId, now)
  return { unreadCount: 0 }
}
