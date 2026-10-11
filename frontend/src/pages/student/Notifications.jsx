import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FaBell, FaCalendarCheck, FaCheckDouble, FaEye } from 'react-icons/fa6'
import Modal from '../../components/admin/Modal'
import DashboardSection from '../../components/dashboard/DashboardSection'
import DashboardWelcome from '../../components/dashboard/DashboardWelcome'
import ExamDateRequestSummary from '../../components/examDate/ExamDateRequestSummary'
import { useNotifications } from '../../context/useNotifications'
import { getMyExamDateRequest } from '../../services/examDateRequestApi'
import { formatDateTime } from '../../utils/formatUtils'

// The exam date request a notification is about, loaded when the dialog opens
function RequestDialog({ requestId, onClose }) {
  const [request, setRequest] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    getMyExamDateRequest(requestId)
      .then((loaded) => active && setRequest(loaded))
      .catch((loadError) => active && setError(loadError.message))
    return () => {
      active = false
    }
  }, [requestId])

  return (
    <Modal title="Exam Date Request" icon={FaCalendarCheck} onClose={onClose} className="!w-[min(40rem,calc(100vw-2rem))]">
      {request ? (
        <ExamDateRequestSummary request={request} />
      ) : (
        <p role={error ? 'alert' : 'status'} className="py-6 text-center text-gray-600">
          {error || 'Loading request...'}
        </p>
      )}
    </Modal>
  )
}

// Student-only page: every notification sent to the signed-in student. "View details"
// shows the request a notification is about; the bell links here with ?request=<id>.
function Notifications() {
  const { notifications, unreadCount, loading, error, markRead, markAllRead } = useNotifications()
  const [searchParams, setSearchParams] = useSearchParams()
  const [actionError, setActionError] = useState('')
  // The dialog follows the address, so the bell's "View" and the browser's Back both work
  const openRequestId = /^[1-9][0-9]*$/.test(searchParams.get('request') ?? '')
    ? Number(searchParams.get('request'))
    : null

  const run = (action) => {
    setActionError('')
    action().catch((failure) => setActionError(failure.message))
  }

  const viewDetails = (notification) => {
    if (!notification.read) run(() => markRead(notification.id))
    setSearchParams({ request: String(notification.examDateRequestId) })
  }

  return (
    <>
      <DashboardWelcome
        title="Notifications"
        message="Updates from Jeslan Driving School about your requests."
        icon={FaBell}
      />

      <DashboardSection
        title={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : 'Notifications'}
        icon={FaBell}
        aside={
          unreadCount > 0 && (
            <button
              type="button"
              onClick={() => run(markAllRead)}
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-ink transition hover:border-brand hover:text-brand"
            >
              <FaCheckDouble aria-hidden="true" />
              Mark all as read
            </button>
          )
        }
      >
        {(actionError || error) && (
          <p role="alert" className="mb-4 rounded-lg bg-brand-soft px-4 py-3 text-sm text-brand-dark">
            {actionError || error}
          </p>
        )}
        {notifications.length === 0 ? (
          <p role="status" className="py-8 text-center text-gray-600">
            {loading ? 'Loading notifications...' : !error && 'You have no notifications yet.'}
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {notifications.map((notification) => (
              <li
                key={notification.id}
                data-read={notification.read}
                data-type={notification.type}
                className={`flex flex-col gap-3 rounded-xl border px-4 py-4 sm:flex-row sm:items-start sm:px-5 ${
                  notification.read ? 'border-gray-200 bg-white' : 'border-brand/30 bg-brand-soft/50'
                }`}
              >
                <span
                  className={`mt-2 hidden h-2.5 w-2.5 shrink-0 rounded-full sm:block ${notification.read ? 'bg-gray-300' : 'bg-brand'}`}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-ink">
                    {notification.title}
                    {!notification.read && (
                      <span className="ml-2 rounded-full bg-brand px-2 py-0.5 align-middle text-xs font-semibold text-white">
                        New
                      </span>
                    )}
                  </p>
                  <p className="mt-1 break-words text-gray-700">{notification.message}</p>
                  <p className="mt-2 text-xs text-gray-500">{formatDateTime(notification.createdAt)}</p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {notification.examDateRequestId && (
                    <button
                      type="button"
                      onClick={() => viewDetails(notification)}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-ink transition hover:border-brand hover:text-brand"
                    >
                      <FaEye aria-hidden="true" />
                      View details
                    </button>
                  )}
                  {!notification.read && (
                    <button
                      type="button"
                      onClick={() => run(() => markRead(notification.id))}
                      className="cursor-pointer rounded-lg px-3 py-1.5 text-sm font-semibold text-brand transition hover:bg-brand-soft"
                    >
                      Mark as read
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </DashboardSection>

      {openRequestId && (
        <RequestDialog key={openRequestId} requestId={openRequestId} onClose={() => setSearchParams({})} />
      )}
    </>
  )
}

export default Notifications
