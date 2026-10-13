import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FaBell, FaCalendarCheck, FaEye } from 'react-icons/fa6'
import DashboardSection from '../../components/dashboard/DashboardSection'
import DashboardTable from '../../components/dashboard/DashboardTable'
import DashboardWelcome from '../../components/dashboard/DashboardWelcome'
import StatusBadge from '../../components/dashboard/StatusBadge'
import { useNotifications } from '../../context/useNotifications'
import { listExamDateRequests } from '../../services/examDateRequestApi'
import { formatExamDateShort, requestStatusLabels } from '../../utils/examDateUtils'
import { formatDateTime } from '../../utils/formatUtils'

const filters = [
  { label: 'All', status: '' },
  { label: 'Pending', status: 'PENDING' },
  { label: 'Approved', status: 'APPROVED' },
  { label: 'Rejected', status: 'REJECTED' },
]

// Admin-only page: the requests students have sent for a physical driving licence exam
// date. Further kinds of notification can be added here as their own sections.
function Notifications() {
  // Requests with an unread notification are marked "New"
  const { notifications } = useNotifications()
  const [status, setStatus] = useState('')
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const unreadRequestIds = new Set(
    notifications.filter((notification) => !notification.read).map((n) => n.examDateRequestId),
  )
  // A new notification means a new request: fetch the list again when one arrives
  const newestNotificationId = notifications[0]?.id ?? 0

  useEffect(() => {
    let active = true
    listExamDateRequests(status)
      .then((rows) => {
        if (!active) return
        setRequests(rows)
        setError('')
      })
      .catch((loadError) => active && setError(loadError.message))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [status, newestNotificationId])

  const selectFilter = (nextStatus) => {
    if (nextStatus === status) return
    setLoading(true)
    setStatus(nextStatus)
  }

  const detailsPath = (row) => `/admin-dashboard/notifications/${row.id}`

  const columns = [
    {
      key: 'id',
      label: 'Request ID',
      render: (row) => (
        <Link to={detailsPath(row)} className="hover:text-brand hover:underline">
          #{row.id}
          {unreadRequestIds.has(row.id) && (
            <span className="ml-2 rounded-full bg-brand px-2 py-0.5 text-xs font-semibold text-white">
              New
            </span>
          )}
        </Link>
      ),
    },
    { key: 'studentName', label: 'Student Name' },
    { key: 'drivingSchoolId', label: 'Driving School ID' },
    {
      key: 'medicalReportSubmitted',
      label: 'Medical Report',
      render: (row) => (row.medicalReportSubmitted ? 'Submitted' : 'Not submitted'),
    },
    {
      key: 'preferredDates',
      label: 'Preferred Dates',
      render: (row) => (
        <ol className="flex flex-col gap-0.5">
          {row.preferredDates.map((date) => (
            <li
              key={date}
              className={date === row.approvedDate ? 'font-semibold text-emerald-700' : undefined}
            >
              {formatExamDateShort(date)}
              {date === row.approvedDate && ' (confirmed)'}
            </li>
          ))}
        </ol>
      ),
    },
    {
      key: 'status',
      label: 'Request Status',
      render: (row) => <StatusBadge status={row.status} label={requestStatusLabels[row.status]} />,
    },
    { key: 'createdAt', label: 'Submitted Date', render: (row) => formatDateTime(row.createdAt) },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <Link
          to={detailsPath(row)}
          aria-label={`View request #${row.id} from ${row.studentName}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs font-semibold text-ink transition hover:border-brand hover:text-brand"
        >
          <FaEye aria-hidden="true" />
          {row.status === 'PENDING' ? 'Review' : 'View'}
        </Link>
      ),
    },
  ]

  return (
    <>
      <DashboardWelcome
        title="Notifications"
        message="Review the requests students have sent to the school."
        icon={FaBell}
      />

      <DashboardSection
        title="Driving Licence Exam Date Requests"
        icon={FaCalendarCheck}
        aside={
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
            {filters.map((filter) => (
              <button
                key={filter.label}
                type="button"
                aria-pressed={status === filter.status}
                onClick={() => selectFilter(filter.status)}
                className={`cursor-pointer rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                  status === filter.status
                    ? 'bg-brand text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-brand-soft hover:text-brand'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        }
      >
        {error && (
          <p role="alert" className="mb-4 rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger-dark">
            {error}
          </p>
        )}
        {loading ? (
          <p role="status" className="py-8 text-center text-gray-600">
            Loading requests...
          </p>
        ) : requests.length === 0 ? (
          !error && <p className="py-8 text-center text-gray-600">No exam date requests found.</p>
        ) : (
          <DashboardTable caption="Driving licence exam date requests" columns={columns} rows={requests} />
        )}
      </DashboardSection>
    </>
  )
}

export default Notifications
