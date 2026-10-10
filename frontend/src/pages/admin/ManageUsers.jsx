import { useCallback, useEffect, useState } from 'react'
import {
  FaChevronLeft,
  FaChevronRight,
  FaMagnifyingGlass,
  FaUserPlus,
  FaUsers,
  FaUsersGear,
} from 'react-icons/fa6'
import CreateInstructorDialog from '../../components/admin/CreateInstructorDialog'
import RoleBadge from '../../components/admin/RoleBadge'
import UserActions from '../../components/admin/UserActions'
import UserDetailsDialog from '../../components/admin/UserDetailsDialog'
import DashboardSection from '../../components/dashboard/DashboardSection'
import DashboardTable from '../../components/dashboard/DashboardTable'
import DashboardWelcome from '../../components/dashboard/DashboardWelcome'
import StatusBadge from '../../components/dashboard/StatusBadge'
import Toast from '../../components/dashboard/Toast'
import { listUsers } from '../../services/userApi'
import { formatDate, formatStatus } from '../../utils/formatUtils'

const PAGE_SIZE = 10
const SEARCH_DELAY_MS = 300

const roleFilters = [
  { label: 'All', value: '' },
  { label: 'Students', value: 'student' },
  { label: 'Instructors', value: 'instructor' },
]

const statusFilters = [
  { label: 'All statuses', value: '' },
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
]

const emptyResult = { users: [], pagination: { page: 1, totalPages: 1, total: 0 } }

// Admin-only page listing student and instructor accounts. Filtering, search and paging
// happen on the backend; admin accounts are never listed.
function ManageUsers() {
  const [role, setRole] = useState('')
  const [status, setStatus] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [result, setResult] = useState(emptyResult)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  // Bumped after a change so the list is fetched again
  const [refreshKey, setRefreshKey] = useState(0)
  const [creating, setCreating] = useState(false)
  const [viewUserId, setViewUserId] = useState(null)
  const [toast, setToast] = useState(null)
  const closeToast = useCallback(() => setToast(null), [])

  useEffect(() => {
    let active = true
    listUsers({ role, status, search, page, pageSize: PAGE_SIZE })
      .then((loaded) => {
        if (!active) return
        // The last row of the last page was removed: step back to the new last page
        if (loaded.users.length === 0 && page > loaded.pagination.totalPages) {
          setPage(loaded.pagination.totalPages)
          return
        }
        setResult(loaded)
        setError('')
      })
      .catch((loadError) => active && setError(loadError.message))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [role, status, search, page, refreshKey])

  // Search once the admin pauses typing, from the first page
  useEffect(() => {
    const term = searchInput.trim()
    if (term === search) return undefined
    const timer = setTimeout(() => {
      setLoading(true)
      setSearch(term)
      setPage(1)
    }, SEARCH_DELAY_MS)
    return () => clearTimeout(timer)
  }, [searchInput, search])

  const changeFilter = (setter, value, current) => {
    if (value === current) return
    setLoading(true)
    setter(value)
    setPage(1)
  }

  const goToPage = (nextPage) => {
    setLoading(true)
    setPage(nextPage)
  }

  const refresh = (message) => {
    setToast({ message, variant: 'success' })
    setRefreshKey((key) => key + 1)
  }

  const handleCreated = (user) => {
    setCreating(false)
    refresh(`Instructor account created for ${user.name}. Driving School ID: ${user.drivingSchoolId}`)
  }

  const columns = [
    { key: 'drivingSchoolId', label: 'Driving School ID' },
    { key: 'name', label: 'Full Name' },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Role', render: (row) => <RoleBadge role={row.role} /> },
    {
      key: 'status',
      label: 'Account Status',
      render: (row) => <StatusBadge status={formatStatus(row.status)} />,
    },
    { key: 'createdAt', label: 'Created Date', render: (row) => formatDate(row.createdAt) },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <UserActions user={row} onView={() => setViewUserId(row.id)} onChanged={refresh} />
      ),
    },
  ]

  const { users, pagination } = result
  const filtered = Boolean(role || status || search)
  const firstRow = (pagination.page - 1) * PAGE_SIZE + 1

  return (
    <>
      <DashboardWelcome
        title="Manage Users"
        message="View, create and manage student and instructor accounts."
        icon={FaUsersGear}
      />

      <DashboardSection
        title="Users"
        icon={FaUsers}
        aside={
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="btn btn-primary !rounded-lg !px-5 !py-2.5"
          >
            <FaUserPlus aria-hidden="true" />
            Create Instructor
          </button>
        }
      >
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by role">
            {roleFilters.map((filter) => (
              <button
                key={filter.label}
                type="button"
                aria-pressed={role === filter.value}
                onClick={() => changeFilter(setRole, filter.value, role)}
                className={`cursor-pointer rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                  role === filter.value
                    ? 'bg-brand text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-brand-soft hover:text-brand'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="sr-only" htmlFor="user-status-filter">
              Filter by account status
            </label>
            <select
              id="user-status-filter"
              value={status}
              onChange={(event) => changeFilter(setStatus, event.target.value, status)}
              className="form-input !py-2 sm:w-44"
            >
              {statusFilters.map((filter) => (
                <option key={filter.label} value={filter.value}>
                  {filter.label}
                </option>
              ))}
            </select>

            <label className="relative block sm:w-80">
              <span className="sr-only">Search by Driving School ID, name or email</span>
              <FaMagnifyingGlass
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-gray-400"
              />
              <input
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search ID, name or email"
                maxLength={100}
                className="form-input !py-2 pl-10"
              />
            </label>
          </div>
        </div>

        {error && (
          <p role="alert" className="mb-4 rounded-lg bg-brand-soft px-4 py-3 text-sm text-brand-dark">
            {error}
          </p>
        )}

        {loading ? (
          <p role="status" className="flex items-center justify-center gap-3 py-12 text-gray-600">
            <span
              aria-hidden="true"
              className="h-5 w-5 animate-spin rounded-full border-2 border-brand border-t-transparent"
            />
            Loading users...
          </p>
        ) : users.length === 0 ? (
          !error && (
            <div className="py-12 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft text-2xl text-brand">
                <FaUsers aria-hidden="true" />
              </span>
              <p className="mt-4 font-semibold text-ink">
                {filtered ? 'No users match your filters.' : 'No students or instructors yet.'}
              </p>
              <p className="mt-1 text-sm text-gray-600">
                {filtered
                  ? 'Try a different search or filter.'
                  : 'Create an instructor account, or approve a registration application.'}
              </p>
            </div>
          )
        ) : (
          <>
            <DashboardTable caption="Student and instructor accounts" columns={columns} rows={users} />

            <nav
              aria-label="Users pagination"
              className="mt-4 flex flex-col items-center justify-between gap-3 text-sm text-gray-600 sm:flex-row"
            >
              <p>
                Showing {firstRow}–{firstRow + users.length - 1} of {pagination.total}
              </p>
              {pagination.totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => goToPage(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    aria-label="Previous page"
                    className="cursor-pointer rounded-lg border border-gray-300 bg-white p-2 transition hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <FaChevronLeft aria-hidden="true" />
                  </button>
                  <span className="px-2 font-semibold text-ink">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => goToPage(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                    aria-label="Next page"
                    className="cursor-pointer rounded-lg border border-gray-300 bg-white p-2 transition hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <FaChevronRight aria-hidden="true" />
                  </button>
                </div>
              )}
            </nav>
          </>
        )}
      </DashboardSection>

      {creating && (
        <CreateInstructorDialog onCreated={handleCreated} onClose={() => setCreating(false)} />
      )}
      {viewUserId && (
        <UserDetailsDialog userId={viewUserId} onClose={() => setViewUserId(null)} />
      )}
      <Toast toast={toast} onClose={closeToast} />
    </>
  )
}

export default ManageUsers
