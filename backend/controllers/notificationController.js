// HTTP handling for notifications. Rules live in services/notificationService.js.
// The notifications always belong to req.user: the recipient never comes from the request.

import * as notificationService from '../services/notificationService.js'
import { sendSuccess } from '../utils/responseUtils.js'
import { parseId, validateNotificationListQuery } from '../utils/validationUtils.js'

export const list = async (req, res) => {
  const data = await notificationService.list(req.user.id, validateNotificationListQuery(req.query))
  sendSuccess(res, { message: 'Notifications', data })
}

export const markRead = async (req, res) => {
  const data = await notificationService.markRead(parseId(req.params.id), req.user.id)
  sendSuccess(res, { message: 'Notification marked as read', data })
}

export const markAllRead = async (req, res) => {
  const data = await notificationService.markAllRead(req.user.id)
  sendSuccess(res, { message: 'All notifications marked as read', data })
}
