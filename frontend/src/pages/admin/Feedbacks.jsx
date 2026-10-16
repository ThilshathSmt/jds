import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FaCarSide, FaCommentDots, FaEye, FaFilter } from 'react-icons/fa6'
import Modal from '../../components/admin/Modal'
import DashboardSection from '../../components/dashboard/DashboardSection'
import DashboardWelcome from '../../components/dashboard/DashboardWelcome'
import FeedbackCard from '../../components/practical/FeedbackCard'
import LessonScheduleTable from '../../components/practical/LessonScheduleTable'
import PracticalSummary from '../../components/practical/PracticalSummary'
import { getPracticalCycle, listAssignableInstructors, listFeedbacks } from '../../services/practicalApi'
import { LESSONS_PATH } from '../../utils/practicalUtils'

const SEARCH_DELAY_MS = 300

// The student's attendance, progress and dates next to a feedback
function ProgressDialog({ cycleId, onClose }) {
  const [cycle, setCycle] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    getPracticalCycle(cycleId)
      .then((loaded) => active && setCycle(loaded))
      .catch((loadError) => active && setError(loadError.message))
    return () => {
      active = false
    }
  }, [cycleId])
  return (
    <Modal title="Lessons & Progress" icon={FaCarSide} onClose={onClose} className="!w-[min(60rem,calc(100vw-2rem))]">
      {!cycle ? (
        <p role={error ? 'alert' : 'status'} className="py-6 text-center text-gray-600">{error || 'Loading...'}</p>
      ) : (
        <>
          <p className="mb-3 font-bold text-ink">
            {cycle.student.name} ({cycle.student.drivingSchoolId})
          </p>
          <PracticalSummary cycle={cycle} showMessage={false} />
          <div className="mt-4">
            <LessonScheduleTable lessons={cycle.lessons} />
          </div>
          <div className="mt-5 flex justify-end">
            <Link to={`${LESSONS_PATH}/${cycle.id}`} className="btn btn-primary !rounded-lg !px-5 !py-2">
              Decide Practical Test Date
            </Link>
          </div>
        </>
      )}
    </Modal>
  )
}

// Admin-only page: every submitted instructor feedback, with filters
function Feedbacks() {
  const [instructors, setInstructors] = useState([])
  const [searchInput, setSearchInput] = useState('')
  const [filters, setFilters] = useState({ search: '', instructorId: '', from: '', to: '' })
  const [feedbacks, setFeedbacks] = useState(null)
  const [error, setError] = useState('')
  const [viewCycleId, setViewCycleId] = useState(null)

  useEffect(() => {
    listAssignableInstructors().then(setInstructors).catch(() => {})
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => setFilters((current) => ({ ...current, search: searchInput.trim() })), SEARCH_DELAY_MS)
    return () => clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    let active = true
    listFeedbacks(filters)
      .then((loaded) => {
        if (!active) return
        setFeedbacks(loaded)
        setError('')
      })
      .catch((loadError) => active && setError(loadError.message))
    return () => {
      active = false
    }
  }, [filters])

  const setFilter = (name) => (event) => setFilters((current) => ({ ...current, [name]: event.target.value }))

  return (
    <>
      <DashboardWelcome title="Feedbacks" message="Instructor feedback on students' practical training." icon={FaCommentDots} />
      <DashboardSection title="Submitted Feedback" icon={FaCommentDots}>
        <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" role="search" aria-label="Filter feedback">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-ink">Student</span>
            <input type="search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Name or Driving School ID" maxLength={100} className="form-input !py-2" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-ink">Instructor</span>
            <select value={filters.instructorId} onChange={setFilter('instructorId')} className="form-input !py-2">
              <option value="">All instructors</option>
              {instructors.map((instructor) => (
                <option key={instructor.id} value={instructor.id}>{instructor.name}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-ink">Submitted from</span>
            <input type="date" value={filters.from} onChange={setFilter('from')} className="form-input !py-2" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-ink">Submitted to</span>
            <input type="date" value={filters.to} onChange={setFilter('to')} className="form-input !py-2" />
          </label>
        </div>
        {error && <p role="alert" className="mb-4 rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger-dark">{error}</p>}
        {feedbacks === null ? (
          <p role="status" className="py-8 text-center text-gray-600">Loading feedback...</p>
        ) : feedbacks.length === 0 ? (
          <p className="flex items-center justify-center gap-2 py-8 text-center text-gray-600">
            <FaFilter aria-hidden="true" />
            No submitted feedback matches.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {feedbacks.map((feedback) => (
              <FeedbackCard key={feedback.id} feedback={feedback}>
                <div className="mt-3 flex justify-end">
                  <button type="button" onClick={() => setViewCycleId(feedback.cycleId)} className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-ink hover:border-brand hover:text-brand">
                    <FaEye aria-hidden="true" />
                    Lessons, progress &amp; test date
                  </button>
                </div>
              </FeedbackCard>
            ))}
          </div>
        )}
        <p className="mt-4 text-sm text-gray-500">Feedback is advisory. The school decides the final practical test date.</p>
      </DashboardSection>
      {viewCycleId && <ProgressDialog cycleId={viewCycleId} onClose={() => setViewCycleId(null)} />}
    </>
  )
}

export default Feedbacks
