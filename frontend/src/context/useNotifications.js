import { createContext, useContext } from 'react'

export const NotificationsContext = createContext(null)

// { notifications, unreadCount, loading, error, refresh, markRead, markAllRead } from the
// nearest NotificationsProvider
export const useNotifications = () => {
  const notifications = useContext(NotificationsContext)
  if (!notifications) {
    throw new Error('useNotifications must be used inside <NotificationsProvider>')
  }
  return notifications
}

// Where a notification leads for each role: the page that shows the request it is about.
// Returns null when the role has no such page.
export const getNotificationPath = (notification, role) => {
  const { examDateRequestId, examReattemptRequestId, registrationApplicationId, practicalCycleId } = notification
  if (role === 'admin') {
    if (practicalCycleId) return `/admin-dashboard/lessons/${practicalCycleId}`
    if (registrationApplicationId) {
      return `/admin-dashboard/registration-forms/${registrationApplicationId}`
    }
    if (examReattemptRequestId) {
      return `/admin-dashboard/notifications/reattempt-payments/${examReattemptRequestId}`
    }
    return examDateRequestId
      ? `/admin-dashboard/notifications/${examDateRequestId}`
      : '/admin-dashboard/notifications'
  }
  if (role === 'student') {
    if (practicalCycleId) return `/student-dashboard/notifications?practical=${practicalCycleId}`
    if (registrationApplicationId) {
      return `/student-dashboard/notifications?reapplication=${registrationApplicationId}`
    }
    if (examReattemptRequestId) return `/student-dashboard/notifications?payment=${examReattemptRequestId}`
    return examDateRequestId
      ? `/student-dashboard/notifications?request=${examDateRequestId}`
      : '/student-dashboard/notifications'
  }
  return null
}

// The Notifications page of a role, or null when it has none
export const NOTIFICATION_PAGE_PATHS = {
  admin: '/admin-dashboard/notifications',
  student: '/student-dashboard/notifications',
}
