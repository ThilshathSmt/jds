import { useCallback, useEffect, useRef, useState } from 'react'
import { FaCalendarCheck, FaCarSide, FaCircleCheck, FaCircleXmark } from 'react-icons/fa6'
import ConfirmDialog from '../../components/admin/ConfirmDialog'
import DashboardSection from '../../components/dashboard/DashboardSection'
import DashboardTable from '../../components/dashboard/DashboardTable'
import DashboardWelcome from '../../components/dashboard/DashboardWelcome'
import StatusBadge from '../../components/dashboard/StatusBadge'
import Toast from '../../components/dashboard/Toast'
import { getResponsibilityLabel } from '../../data/instructorData'
import { listEligibleInstructorDrivingSchoolIds, listMyLessons, markLessonAttendance } from '../../services/practicalApi'
import { attendanceBadge, attendanceLabels, formatLessonWhen } from '../../utils/practicalUtils'
import { filterEligibleDrivingSchoolIds } from '../../utils/eligibleStudentSearch'
import useRefetchOnFocus from '../../utils/useRefetchOnFocus'

const smallButton =
  'inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50'

// Why the backend does not allow marking this lesson now (attendanceBlockedReason)
const blockedLabel = (lesson) =>
  ({
    CLOSED: 'Attendance closed',
    NOT_SCHEDULED: 'Not scheduled yet',
    NOT_YET: `Available from ${formatLessonWhen(lesson)}`,
  })[lesson.attendanceBlockedReason] ?? 'Not available'

// Attended / Absent for one lesson, always shown so the action is visible. They are enabled
// only when the backend says the lesson may be marked now (`canMarkAttendance`: it is this
// instructor's lesson, its date and start time have come, and the student's practical test
// date is not yet confirmed); otherwise the reason is shown under them.
function AttendanceButtons({ lesson, busy, onChoose }) {
  const enabled = lesson.canMarkAttendance && !busy
  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-1.5">
        <button
          type="button"
          disabled={!enabled || lesson.attendance === 'ATTENDED'}
          onClick={() => onChoose(lesson, 'ATTENDED')}
          title={lesson.canMarkAttendance ? undefined : blockedLabel(lesson)}
          className={`${smallButton} bg-emerald-600 text-white hover:bg-emerald-700`}
        >
          <FaCircleCheck aria-hidden="true" />
          Attended
        </button>
        <button
          type="button"
          disabled={!enabled || lesson.attendance === 'ABSENT'}
          onClick={() => onChoose(lesson, 'ABSENT')}
          title={lesson.canMarkAttendance ? undefined : blockedLabel(lesson)}
          className={`${smallButton} bg-danger text-white hover:bg-danger-dark`}
        >
          <FaCircleXmark aria-hidden="true" />
          Absent
        </button>
      </div>
      {!lesson.canMarkAttendance && (
        <span className="text-xs text-gray-500" data-attendance-blocked={lesson.attendanceBlockedReason}>
          {blockedLabel(lesson)}
        </span>
      )}
    </div>
  )
}

// Instructor-only page: the lessons assigned to the signed-in instructor, and attendance.
// After every save the list is loaded again from the backend, which is the only record.
function Lessons() {
  const [lessons, setLessons] = useState(null)
  const [totalAssigned, setTotalAssigned] = useState(0)
  const [loading, setLoading] = useState(true)
  const [draftFilters, setDraftFilters] = useState({ studentId: '', studentName: '', date: '', attendanceStatus: '' })
  const [activeFilters, setActiveFilters] = useState({})
  const [eligibleIds, setEligibleIds] = useState([])
  const [eligibleLoading, setEligibleLoading] = useState(true)
  const [eligibleError, setEligibleError] = useState('')
  const [idSearch, setIdSearch] = useState('')
  const [idDropdownOpen, setIdDropdownOpen] = useState(false)
  const [activeIdOption, setActiveIdOption] = useState(-1)
  const [error, setError] = useState('')
  const requestNumber = useRef(0)
  const eligibleRequestNumber = useRef(0)
  const idInput = useRef(null)
  // { lesson, attendance } while a mark waits for confirmation
  const [pending, setPending] = useState(null)
  const [busy, setBusy] = useState(false)
  const [confirmError, setConfirmError] = useState('')
  const [toast, setToast] = useState(null)
  const closeToast = useCallback(() => setToast(null), [])

  const load = useCallback(async (filters = activeFilters) => {
    const request = ++requestNumber.current
    setLoading(true)
    try {
      const result = await listMyLessons(filters)
      if (request !== requestNumber.current) return
      setLessons(result.lessons ?? [])
      setTotalAssigned(result.totalAssigned ?? 0)
      setError('')
    } catch (loadError) {
      if (request === requestNumber.current) setError(loadError.message)
    } finally {
      if (request === requestNumber.current) setLoading(false)
    }
  }, [activeFilters])
  const loadEligibleIds = useCallback(async () => {
    const request = ++eligibleRequestNumber.current
    setEligibleLoading(true)
    setEligibleError('')
    try {
      const ids = await listEligibleInstructorDrivingSchoolIds()
      if (request === eligibleRequestNumber.current) setEligibleIds(ids)
    } catch (loadError) {
      if (request === eligibleRequestNumber.current) setEligibleError(loadError.message)
    } finally {
      if (request === eligibleRequestNumber.current) setEligibleLoading(false)
    }
  }, [])
  useEffect(() => {
    load()
  }, [load])
  useEffect(() => {
    loadEligibleIds()
  }, [loadEligibleIds])
  useRefetchOnFocus(load)

  const matchingEligibleIds = filterEligibleDrivingSchoolIds(eligibleIds, idSearch)
  const chooseDrivingSchoolId = (id) => {
    setDraftFilters((current) => ({ ...current, studentId: id }))
    setIdSearch(id)
    setIdDropdownOpen(false)
    setActiveIdOption(-1)
  }

  const confirm = async () => {
    const { lesson, attendance } = pending
    setBusy(true)
    setConfirmError('')
    try {
      await markLessonAttendance(lesson.id, attendance)
      setPending(null)
      setToast({ variant: 'success', message: `Lesson ${lesson.lessonNumber} for ${lesson.student.name} saved as ${attendanceLabels[attendance]}.` })
      await load()
    } catch (markError) {
      // Nothing is shown as saved unless the backend saved it
      setConfirmError(markError.message)
    } finally {
      setBusy(false)
    }
  }

  // The first lesson that will become markable, in date and time order
  const nextLesson = (lessons ?? [])
    .filter((lesson) => lesson.attendanceBlockedReason === 'NOT_YET')
    .sort((x, y) => `${x.date} ${x.time ?? ''}`.localeCompare(`${y.date} ${y.time ?? ''}`))[0]

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
    { key: 'lessonNumber', label: 'Lesson', render: (row) => `${row.lessonNumber} of 10` },
    { key: 'when', label: 'Date & Time', render: formatLessonWhen },
    { key: 'location', label: 'Location', render: (row) => row.location || '–' },
    { key: 'vehicle', label: 'Vehicle', render: (row) => getResponsibilityLabel(row.instructor?.responsibility) ?? '–' },
    {
      key: 'attendance',
      label: 'Attendance',
      render: (row) => <StatusBadge status={attendanceBadge[row.attendance]} label={attendanceLabels[row.attendance]} />,
    },
    {
      key: 'actions',
      label: 'Mark',
      render: (row) => (
        <AttendanceButtons
          lesson={row}
          busy={busy}
          onChoose={(lesson, attendance) => {
            setConfirmError('')
            setPending({ lesson, attendance })
          }}
        />
      ),
    },
  ]

  return (
    <>
      <DashboardWelcome title="Lessons" message="Your assigned practical lessons and attendance." icon={FaCarSide} />
      <DashboardSection title="My Lessons" icon={FaCalendarCheck}>
        <p className="mb-4 text-sm text-gray-600">
          Mark attendance once a lesson has taken place (from its date and start time). You can
          correct a mark until the student&apos;s practical test date is confirmed.
        </p>
        <form className="mb-5 rounded-xl border border-gray-200 bg-gray-50 p-4" onSubmit={(event) => {
          event.preventDefault()
          const nextFilters = Object.fromEntries(Object.entries(draftFilters).map(([key, value]) => [key, value.trim()]))
          setActiveFilters(nextFilters)
        }}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="relative text-sm font-medium text-ink" onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) setIdDropdownOpen(false)
            }}>
              <label htmlFor="lesson-student-id">Driving School ID</label>
              <div className="relative mt-1">
                <input
                  id="lesson-student-id"
                  ref={idInput}
                  role="combobox"
                  aria-autocomplete="list"
                  aria-expanded={idDropdownOpen}
                  aria-controls="eligible-student-id-options"
                  aria-activedescendant={activeIdOption >= 0 ? `eligible-student-id-${activeIdOption}` : undefined}
                  autoComplete="off"
                  value={idSearch}
                  onFocus={() => setIdDropdownOpen(true)}
                  onClick={() => setIdDropdownOpen(true)}
                  onChange={(event) => {
                    setIdSearch(event.target.value)
                    setDraftFilters((current) => ({ ...current, studentId: '' }))
                    setActiveIdOption(-1)
                    setIdDropdownOpen(true)
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'ArrowDown') {
                      event.preventDefault()
                      setIdDropdownOpen(true)
                      setActiveIdOption((current) => Math.min(current + 1, matchingEligibleIds.length - 1))
                    } else if (event.key === 'ArrowUp') {
                      event.preventDefault()
                      setActiveIdOption((current) => Math.max(current - 1, 0))
                    } else if (event.key === 'Enter' && idDropdownOpen && activeIdOption >= 0 && activeIdOption < matchingEligibleIds.length) {
                      event.preventDefault()
                      chooseDrivingSchoolId(matchingEligibleIds[activeIdOption])
                    } else if (event.key === 'Escape') {
                      setIdDropdownOpen(false)
                    }
                  }}
                  placeholder="Search Driving School ID..."
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pr-9 font-normal focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                />
                {draftFilters.studentId && <button type="button" aria-label="Clear selected Driving School ID" title="Clear selection" onClick={() => {
                  setDraftFilters((current) => ({ ...current, studentId: '' }))
                  setIdSearch('')
                  setIdDropdownOpen(true)
                  setActiveIdOption(-1)
                  idInput.current?.focus()
                }} className="absolute inset-y-0 right-0 px-3 text-gray-500 hover:text-ink">×</button>}
              </div>
              {idDropdownOpen && <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg" role="listbox" id="eligible-student-id-options" aria-label="Eligible Driving School IDs">
                {eligibleLoading ? <p role="status" className="px-3 py-2 font-normal text-gray-500">Loading eligible students...</p> : eligibleError ? <div className="px-3 py-2 font-normal text-danger-dark" role="alert">{eligibleError}<button type="button" className="ml-2 underline" onMouseDown={(event) => event.preventDefault()} onClick={loadEligibleIds}>Retry</button></div> : matchingEligibleIds.length === 0 ? <p className="px-3 py-2 font-normal text-gray-500">No eligible students found.</p> : matchingEligibleIds.map((id, index) => <button type="button" role="option" aria-selected={activeIdOption === index} id={`eligible-student-id-${index}`} key={id} onMouseEnter={() => setActiveIdOption(index)} onMouseDown={(event) => event.preventDefault()} onClick={() => chooseDrivingSchoolId(id)} className={`block w-full px-3 py-2 text-left font-normal hover:bg-brand-soft ${activeIdOption === index ? 'bg-brand-soft text-brand' : 'text-ink'}`}>{id}</button>)}
              </div>}
            </div>
            <label className="text-sm font-medium text-ink">Student Name
              <input value={draftFilters.studentName} onChange={(event) => setDraftFilters({ ...draftFilters, studentName: event.target.value })} placeholder="Enter Student Name" className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-normal" />
            </label>
            <label className="text-sm font-medium text-ink">Lesson Date
              <input type="date" value={draftFilters.date} onChange={(event) => setDraftFilters({ ...draftFilters, date: event.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-normal" />
            </label>
            <label className="text-sm font-medium text-ink">Attendance Status
              <select value={draftFilters.attendanceStatus} onChange={(event) => setDraftFilters({ ...draftFilters, attendanceStatus: event.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-normal">
                <option value="">All Statuses</option><option value="PENDING">Pending / Not Marked</option><option value="ATTENDED">Attended</option><option value="ABSENT">Absent</option>
              </select>
            </label>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="submit" disabled={loading} className={`${smallButton} bg-brand text-white`}>Apply Filters</button>
            <button type="button" disabled={loading} onClick={() => {
              const cleared = { studentId: '', studentName: '', date: '', attendanceStatus: '' }
              setDraftFilters(cleared)
              setActiveFilters({})
              setIdSearch('')
              setIdDropdownOpen(false)
              setActiveIdOption(-1)
            }} className={`${smallButton} border border-gray-300 bg-white text-ink`}>Clear Filters</button>
            <span className="ml-auto text-sm text-gray-600">Showing {lessons?.length ?? 0} of {totalAssigned} lessons</span>
          </div>
        </form>
        {error && <div role="alert" className="mb-4 rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger-dark">{error} <button type="button" className="ml-2 underline" onClick={() => load()}>Retry</button></div>}
        {loading ? (
          <p role="status" className="py-8 text-center text-gray-600">Loading lessons...</p>
        ) : error ? null : totalAssigned === 0 ? (
          <p className="py-8 text-center text-gray-600">You currently have no assigned lessons.</p>
        ) : lessons?.length === 0 ? (
          <p className="py-8 text-center text-gray-600">No lessons match your filters. Try changing or clearing your filters.</p>
        ) : (
          <>
            {!lessons.some((lesson) => lesson.canMarkAttendance) && nextLesson && (
              <p className="mb-4 rounded-lg bg-brand-soft px-4 py-3 text-sm text-ink" data-next-markable>
                None of your lessons has taken place yet, so attendance cannot be marked today. The
                next one is lesson {nextLesson.lessonNumber} for {nextLesson.student.name}:
                attendance opens {formatLessonWhen(nextLesson)}.
              </p>
            )}
            <DashboardTable caption="My practical lessons" columns={columns} rows={lessons} />
          </>
        )}
      </DashboardSection>
      {pending && (
        <ConfirmDialog
          title={`Mark as ${attendanceLabels[pending.attendance]}?`}
          message={`Lesson ${pending.lesson.lessonNumber} of 10 for ${pending.lesson.student.name} (${pending.lesson.student.drivingSchoolId}) on ${formatLessonWhen(pending.lesson)} will be saved as ${attendanceLabels[pending.attendance]}.`}
          confirmLabel="Save Attendance"
          tone={pending.attendance === 'ABSENT' ? 'danger' : 'primary'}
          busy={busy}
          error={confirmError}
          onConfirm={confirm}
          onCancel={() => setPending(null)}
        />
      )}
      <Toast toast={toast} onClose={closeToast} />
    </>
  )
}

export default Lessons
