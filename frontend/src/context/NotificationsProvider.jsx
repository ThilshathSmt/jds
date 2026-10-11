import { useCallback, useEffect, useMemo, useState } from 'react'
import { NotificationsContext } from './useNotifications'
import * as notificationApi from '../services/notificationApi'

// The backend has no push channel: the list is fetched again on this interval, when the
// tab becomes visible again, and whenever a page asks with refresh()
const REFRESH_MS = 30000
const LIST_LIMIT = 50

// Holds the signed-in user's notifications for a dashboard panel, so the bell in the
// header and the Notifications page always show the same list and unread count.
function NotificationsProvider({ children }) {
  const [state, setState] = useState({ notifications: [], unreadCount: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    try {
      setState(await notificationApi.listNotifications(LIST_LIMIT))
      setError('')
    } catch (loadError) {
      // A failed refresh keeps what is already shown
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    const timer = setInterval(() => document.visibilityState === 'visible' && refresh(), REFRESH_MS)
    const onVisible = () => document.visibilityState === 'visible' && refresh()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [refresh])

  const markRead = useCallback(async (id) => {
    const { unreadCount } = await notificationApi.markNotificationRead(id)
    setState((current) => ({
      unreadCount,
      notifications: current.notifications.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification,
      ),
    }))
  }, [])

  const markAllRead = useCallback(async () => {
    const { unreadCount } = await notificationApi.markAllNotificationsRead()
    setState((current) => ({
      unreadCount,
      notifications: current.notifications.map((notification) => ({ ...notification, read: true })),
    }))
  }, [])

  const value = useMemo(
    () => ({ ...state, loading, error, refresh, markRead, markAllRead }),
    [state, loading, error, refresh, markRead, markAllRead],
  )

  return <NotificationsContext value={value}>{children}</NotificationsContext>
}

export default NotificationsProvider
