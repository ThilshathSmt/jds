import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FaBell, FaCheckDouble, FaXmark } from 'react-icons/fa6'
import { useAuth } from '../../context/useAuth'
import {
  NOTIFICATION_PAGE_PATHS,
  getNotificationPath,
  useNotifications,
} from '../../context/useNotifications'
import { formatDateTime } from '../../utils/formatUtils'

const DROPDOWN_LIMIT = 5

// The bell in the dashboard header: unread count, and a small panel with the latest
// notifications. "View" opens the page about that notification and marks it as read.
function NotificationBell({ className }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { notifications, unreadCount, loading, error, refresh, markRead, markAllRead } =
    useNotifications()
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  // Close on a click outside the panel or on Esc
  useEffect(() => {
    if (!open) return undefined
    const closeOnOutsideClick = (event) =>
      !containerRef.current.contains(event.target) && setOpen(false)
    const closeOnEscape = (event) => event.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  const toggle = () => {
    if (!open) refresh()
    setOpen(!open)
  }

  const view = (notification) => {
    setOpen(false)
    // Opening it is reading it; a failure here must not stop the navigation
    if (!notification.read) markRead(notification.id).catch(() => {})
    navigate(getNotificationPath(notification, user.role))
  }

  const recent = notifications.slice(0, DROPDOWN_LIMIT)
  const pagePath = NOTIFICATION_PAGE_PATHS[user.role]
  const countLabel = unreadCount > 99 ? '99+' : unreadCount

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-expanded={open}
        aria-controls="notification-panel"
        className={className}
      >
        <FaBell aria-hidden="true" />
        {unreadCount > 0 && (
          <span
            data-unread-count={unreadCount}
            className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1 text-[0.65rem] leading-none font-bold text-ink ring-2 ring-brand-dark"
            aria-hidden="true"
          >
            {countLabel}
          </span>
        )}
      </button>

      {open && (
        <section
          id="notification-panel"
          aria-label="Notifications"
          className="fixed top-[4.5rem] right-2 left-2 z-50 flex max-h-[min(30rem,calc(100dvh-6rem))] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white text-ink shadow-2xl sm:absolute sm:top-full sm:right-0 sm:left-auto sm:mt-2 sm:w-96"
        >
          <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
            <h2 className="font-bold">Notifications</h2>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => markAllRead().catch(() => {})}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-brand transition hover:bg-brand-soft"
                >
                  <FaCheckDouble aria-hidden="true" />
                  Mark all as read
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close notifications"
                className="cursor-pointer rounded-full p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-ink"
              >
                <FaXmark aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="overflow-y-auto">
            {recent.length === 0 ? (
              <p role={error ? 'alert' : 'status'} className="px-4 py-8 text-center text-sm text-gray-600">
                {loading ? 'Loading notifications...' : error || 'You have no notifications.'}
              </p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {recent.map((notification) => (
                  <li
                    key={notification.id}
                    data-read={notification.read}
                    className={`flex items-start gap-3 px-4 py-3 ${notification.read ? '' : 'bg-brand-soft/50'}`}
                  >
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${notification.read ? 'bg-transparent' : 'bg-brand'}`}
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-snug break-words">
                        {!notification.read && <span className="sr-only">Unread: </span>}
                        {notification.message}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {formatDateTime(notification.createdAt)}
                      </p>
                    </div>
                    {getNotificationPath(notification, user.role) && (
                      <button
                        type="button"
                        onClick={() => view(notification)}
                        className="shrink-0 cursor-pointer rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-ink transition hover:border-brand hover:text-brand"
                      >
                        View
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {pagePath && (
            <Link
              to={pagePath}
              onClick={() => setOpen(false)}
              className="border-t border-gray-100 px-4 py-3 text-center text-sm font-semibold text-brand transition hover:bg-brand-soft"
            >
              View all notifications
            </Link>
          )}
        </section>
      )}
    </div>
  )
}

export default NotificationBell
