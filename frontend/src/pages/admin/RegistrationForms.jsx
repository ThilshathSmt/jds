import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FaClipboardList, FaEye } from 'react-icons/fa6'
import ApplicationActions from '../../components/admin/ApplicationActions'
import DashboardSection from '../../components/dashboard/DashboardSection'
import DashboardTable from '../../components/dashboard/DashboardTable'
import DashboardWelcome from '../../components/dashboard/DashboardWelcome'
import StatusBadge from '../../components/dashboard/StatusBadge'
import { listApplications } from '../../services/applicationApi'

const filters = [
  { label: 'All', status: '' },
  { label: 'New', status: 'NEW' },
  { label: 'Approved', status: 'APPROVED' },
  { label: 'Suspended', status: 'SUSPENDED' },
  { label: 'Rejected', status: 'REJECTED' },
]

// First-time applications and reapplications (from a student whose account is locked
// after three failed examination attempts) are reviewed differently
const typeFilters = [
  { label: 'All applications', type: '' },
  { label: 'First-time', type: 'NEW_STUDENT' },
  { label: 'Reapplications', type: 'REAPPLICATION' },
]
const typeLabels = { NEW_STUDENT: 'First-time', REAPPLICATION: 'Reapplication' }

function RegistrationForms() {
  const [status, setStatus] = useState('')
  const [type, setType] = useState('')
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  // Bumped after an action so the list is fetched again
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let active = true
    listApplications(status, type)
      .then((rows) => {
        if (!active) return
        setApplications(rows)
        setError('')
      })
      .catch((loadError) => active && setError(loadError.message))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [status, type, refreshKey])

  const selectFilter = (nextStatus) => {
    if (nextStatus === status) return
    setLoading(true)
    setStatus(nextStatus)
  }
  const selectType = (nextType) => {
    if (nextType === type) return
    setLoading(true)
    setType(nextType)
  }

  const columns = [
    { key: 'id', label: 'ID', render: (row) => `#${row.id}` },
    { key: 'fullName', label: 'Name' },
    {
      key: 'type',
      label: 'Type',
      render: (row) => (
        <span
          data-application-type={row.type}
          className={`inline-block rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap ring-1 ring-inset ${
            row.type === 'REAPPLICATION'
              ? 'bg-brand-soft text-brand-dark ring-brand/20'
              : 'bg-gray-100 text-gray-700 ring-gray-500/20'
          }`}
        >
          {typeLabels[row.type] ?? row.type}
        </span>
      ),
    },
    { key: 'mobileNumber', label: 'Mobile' },
    {
      key: 'packageName',
      label: 'Package',
      // Long package names are shortened here; the full name is on the details page
      render: (row) => (
        <span className="block max-w-[10rem] truncate" title={row.packageName}>
          {row.packageName}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      // An approved application also shows the Driving School ID it was given
      render: (row) => (
        <>
          <StatusBadge status={row.status} />
          {row.drivingSchoolId && (
            <span className="mt-1 block text-xs font-semibold text-ink">{row.drivingSchoolId}</span>
          )}
        </>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-1">
          <Link
            to={`/admin-dashboard/registration-forms/${row.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs font-semibold text-ink transition hover:border-brand hover:text-brand"
          >
            <FaEye aria-hidden="true" />
            {row.type === 'REAPPLICATION' && row.status === 'NEW' ? 'Review' : 'View'}
          </Link>
          <ApplicationActions
            application={row}
            size="sm"
            onChanged={() => setRefreshKey((key) => key + 1)}
          />
        </div>
      ),
    },
  ]

  return (
    <>
      <DashboardWelcome
        title="Registration Forms"
        message="Review applications submitted through the Apply Now form."
        icon={FaClipboardList}
      />

      <DashboardSection
        title="Applications"
        icon={FaClipboardList}
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
        <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filter by type">
          {typeFilters.map((filter) => (
            <button
              key={filter.label}
              type="button"
              aria-pressed={type === filter.type}
              onClick={() => selectType(filter.type)}
              className={`cursor-pointer rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
                type === filter.type
                  ? 'border-brand bg-brand-soft text-brand-dark'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-brand/40'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
        {error && (
          <p role="alert" className="mb-4 rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger-dark">
            {error}
          </p>
        )}
        {loading ? (
          <p role="status" className="py-8 text-center text-gray-600">
            Loading applications...
          </p>
        ) : applications.length === 0 ? (
          !error && <p className="py-8 text-center text-gray-600">No applications found.</p>
        ) : (
          <DashboardTable
            caption="Registration applications"
            columns={columns}
            rows={applications}
          />
        )}
      </DashboardSection>
    </>
  )
}

export default RegistrationForms
