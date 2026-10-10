import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FaArrowUpRightFromSquare, FaIdCard } from 'react-icons/fa6'
import Modal from './Modal'
import RoleBadge from './RoleBadge'
import StatusBadge from '../dashboard/StatusBadge'
import { getUser } from '../../services/userApi'
import { formatDateTime, formatStatus } from '../../utils/formatUtils'

const getRows = (user) => {
  const rows = [
    { label: 'Driving School ID', value: user.drivingSchoolId },
    { label: 'Full Name', value: user.name },
    { label: 'Email', value: user.email },
    { label: 'Role', value: <RoleBadge role={user.role} /> },
    { label: 'Account Status', value: <StatusBadge status={formatStatus(user.status)} /> },
    { label: 'Created', value: formatDateTime(user.createdAt) },
    { label: 'Last Updated', value: formatDateTime(user.updatedAt) },
  ]
  if (user.role !== 'student') return rows

  const { application } = user
  rows.push({
    label: 'Application',
    value: application ? (
      <Link
        to={`/admin-dashboard/registration-forms/${application.id}`}
        className="inline-flex items-center gap-1.5 text-brand hover:underline"
      >
        #{application.id} · {application.packageName}
        <FaArrowUpRightFromSquare aria-hidden="true" className="text-xs" />
      </Link>
    ) : (
      'No linked application'
    ),
  })
  if (application) rows.push({ label: 'Mobile Number', value: application.mobileNumber })
  return rows
}

// Read-only details of one account, loaded fresh from the backend
function UserDetailsDialog({ userId, onClose }) {
  const [user, setUser] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    getUser(userId)
      .then((loaded) => active && setUser(loaded))
      .catch((loadError) => active && setError(loadError.message))
    return () => {
      active = false
    }
  }, [userId])

  return (
    <Modal title="User Details" icon={FaIdCard} onClose={onClose}>
      {!user ? (
        <p role={error ? 'alert' : 'status'} className="py-6 text-center text-gray-600">
          {error || 'Loading details...'}
        </p>
      ) : (
        <dl className="divide-y divide-gray-100">
          {getRows(user).map(({ label, value }) => (
            <div key={label} className="grid gap-1 py-3 sm:grid-cols-[10rem_1fr] sm:gap-4">
              <dt className="text-sm font-medium text-gray-500">{label}</dt>
              <dd className="font-medium break-words text-ink">{value}</dd>
            </div>
          ))}
        </dl>
      )}
      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="btn !rounded-lg bg-gray-200 !px-5 !py-2 text-ink hover:bg-gray-300"
        >
          Close
        </button>
      </div>
    </Modal>
  )
}

export default UserDetailsDialog
