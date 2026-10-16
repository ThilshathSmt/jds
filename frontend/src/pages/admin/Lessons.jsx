import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FaCarSide, FaEye, FaUsers } from 'react-icons/fa6'
import DashboardSection from '../../components/dashboard/DashboardSection'
import DashboardTable from '../../components/dashboard/DashboardTable'
import DashboardWelcome from '../../components/dashboard/DashboardWelcome'
import ProgressBar from '../../components/dashboard/ProgressBar'
import StatusBadge from '../../components/dashboard/StatusBadge'
import { listPracticalCycles } from '../../services/practicalApi'
import { LESSONS_PATH, cycleStatusBadge, cycleStatusLabels, formatDayShort, progressPercent } from '../../utils/practicalUtils'

const filters = [
  { label: 'In training', status: 'ACTIVE' },
  { label: 'Passed', status: 'PASSED' },
  { label: 'Attempts used', status: 'EXHAUSTED' },
  { label: 'All', status: '' },
]


const columns = [
  {
    key: 'student',
    label: 'Student',
    render: (row) => (
      <span>
        {row.student.name}
        <span className="block text-xs font-normal text-gray-500">{row.student.drivingSchoolId}</span>
      </span>
    ),
  },
  { key: 'cycle', label: 'Cycle', render: (row) => row.cycleNumber },
  { key: 'provisional', label: 'Provisional Test Date', render: (row) => formatDayShort(row.provisionalTestDate) },
  { key: 'final', label: 'Final Test Date', render: (row) => (row.finalTestDate ? formatDayShort(row.finalTestDate) : 'Not confirmed') },
  { key: 'instructors', label: 'Instructors', render: (row) => `${row.instructorCount} of 4` },
  {
    key: 'progress',
    label: 'Lessons',
    render: (row) => (
      <span className="block min-w-40">
        <ProgressBar value={progressPercent({ ...row.progress, total: 10 })} label={`${row.student.name} lessons`} />
        <span className="text-xs text-gray-500">
          {row.progress.attended} attended · {row.progress.absent} missed · {row.progress.scheduled}/10 scheduled
        </span>
      </span>
    ),
  },
  { key: 'feedback', label: 'Feedback', render: (row) => row.feedbackCount },
  { key: 'status', label: 'Status', render: (row) => <StatusBadge status={cycleStatusBadge[row.status]} label={cycleStatusLabels[row.status]} /> },
  {
    key: 'actions',
    label: 'Actions',
    render: (row) => (
      <Link to={`${LESSONS_PATH}/${row.id}`} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs font-semibold text-ink transition hover:border-brand hover:text-brand">
        <FaEye aria-hidden="true" />
        Manage
      </Link>
    ),
  },
]

// Admin-only page: students who passed the driving school exam and their practical training
function Lessons() {
  const [status, setStatus] = useState('ACTIVE')
  const [cycles, setCycles] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    listPracticalCycles(status)
      .then((loaded) => {
        if (!active) return
        setCycles(loaded)
        setError('')
      })
      .catch((loadError) => active && setError(loadError.message))
    return () => {
      active = false
    }
  }, [status])

  return (
    <>
      <DashboardWelcome
        title="Lessons"
        message="Practical training for students who passed the driving school exam."
        icon={FaCarSide}
      />
      <DashboardSection title="Students" icon={FaUsers}>
        <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Filter by status">
          {filters.map((filter) => (
            <button
              key={filter.label}
              type="button"
              aria-pressed={status === filter.status}
              onClick={() => {
                setCycles(null)
                setStatus(filter.status)
              }}
              className={`cursor-pointer rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                status === filter.status ? 'bg-brand text-white' : 'bg-gray-100 text-gray-700 hover:bg-brand-soft hover:text-brand'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
        {cycles === null ? (
          <p role={error ? 'alert' : 'status'} className="py-8 text-center text-gray-600">
            {error || 'Loading...'}
          </p>
        ) : cycles.length === 0 ? (
          <p className="py-8 text-center text-gray-600">
            No students here yet. A student becomes eligible for lessons when their driving school
            exam is recorded as Passed.
          </p>
        ) : (
          <DashboardTable caption="Practical training" columns={columns} rows={cycles} />
        )}
      </DashboardSection>
    </>
  )
}

export default Lessons
