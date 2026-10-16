import { useCallback, useEffect, useState } from 'react'
import { FaCalendarCheck, FaCarSide, FaCircleCheck, FaCircleXmark } from 'react-icons/fa6'
import ConfirmDialog from '../../components/admin/ConfirmDialog'
import DashboardSection from '../../components/dashboard/DashboardSection'
import DashboardTable from '../../components/dashboard/DashboardTable'
import DashboardWelcome from '../../components/dashboard/DashboardWelcome'
import StatusBadge from '../../components/dashboard/StatusBadge'
import Toast from '../../components/dashboard/Toast'
import { getResponsibilityLabel } from '../../data/instructorData'
import { listMyLessons, markLessonAttendance } from '../../services/practicalApi'
import { attendanceBadge, attendanceLabels, formatLessonWhen } from '../../utils/practicalUtils'
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
  const [error, setError] = useState('')
  // { lesson, attendance } while a mark waits for confirmation
  const [pending, setPending] = useState(null)
  const [busy, setBusy] = useState(false)
  const [confirmError, setConfirmError] = useState('')
  const [toast, setToast] = useState(null)
  const closeToast = useCallback(() => setToast(null), [])

  const load = useCallback(
    () =>
      listMyLessons()
        .then((loaded) => {
          setLessons(loaded)
          setError('')
        })
        .catch((loadError) => setError(loadError.message)),
    [],
  )
  useEffect(() => {
    load()
  }, [load])
  useRefetchOnFocus(load)

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
        {lessons === null ? (
          <p role={error ? 'alert' : 'status'} className="py-8 text-center text-gray-600">
            {error || 'Loading lessons...'}
          </p>
        ) : lessons.length === 0 ? (
          <p className="py-8 text-center text-gray-600">No lessons have been assigned to you yet.</p>
        ) : (
          <>
            <p className="mb-4 text-sm text-gray-600">
              Mark attendance once a lesson has taken place (from its date and start time). You can
              correct a mark until the student&apos;s practical test date is confirmed.
            </p>
            {error && <p role="alert" className="mb-4 rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger-dark">{error}</p>}
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
