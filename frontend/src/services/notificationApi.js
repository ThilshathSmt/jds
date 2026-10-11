// The signed-in user's own notifications, whatever their role. A "notification" is
//   { id, type, title, message, examDateRequestId, read, readAt, createdAt }

import { apiRequest } from './apiClient'

const PATH = '/api/notifications'

// Resolves with { notifications, unreadCount }: the newest `limit` notifications and the
// number of all unread ones
export const listNotifications = (limit = 20) => apiRequest(`${PATH}?limit=${limit}`)

// Both resolve with { unreadCount }
export const markNotificationRead = (id) => apiRequest(`${PATH}/${id}/read`, { method: 'POST' })

export const markAllNotificationsRead = () => apiRequest(`${PATH}/read-all`, { method: 'POST' })
