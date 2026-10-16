import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  FaArrowLeft,
  FaBan,
  FaCalendarCheck,
  FaCarSide,
  FaChalkboardUser,
  FaCircleCheck,
  FaClipboardCheck,
  FaCommentDots,
  FaEye,
  FaFloppyDisk,
  FaMoneyBillWave,
  FaRoad,
} from 'react-icons/fa6'
import ConfirmDialog from '../../components/admin/ConfirmDialog'
import Modal from '../../components/admin/Modal'
import DashboardSection from '../../components/dashboard/DashboardSection'
import DashboardWelcome from '../../components/dashboard/DashboardWelcome'
import StatusBadge from '../../components/dashboard/StatusBadge'
import Toast from '../../components/dashboard/Toast'
import FeedbackCard from '../../components/practical/FeedbackCard'
import PracticalSummary from '../../components/practical/PracticalSummary'
import TimeSlotPicker from '../../components/practical/TimeSlotPicker'
import { getResponsibilityLabel } from '../../data/instructorData'
import { paymentMethods } from '../../data/registrationData'
import {
  approvePracticalPayment,
  getPracticalCycle,
  getPracticalReceiptUrl,
  listAssignableInstructors,
  listFeedbacks,
  recordPracticalResult,
  rejectPracticalPayment,
  schedulePracticalTest,
  setCycleInstructors,
  updateLesson,
} from '../../services/practicalApi'
import { formatDateTime } from '../../utils/formatUtils'
import { formatFee, verificationLabels } from '../../utils/licenceExamUtils'
import {
  LESSONS_PATH,
  attendanceBadge,
  attendanceLabels,
  cycleStatusBadge,
  cycleStatusLabels,
  formatDay,
  formatDayShort,
  getTimeSlots,
} from '../../utils/practicalUtils'
import useRefetchOnFocus from '../../utils/useRefetchOnFocus'

const smallButton =
  'inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60'
const getMethodLabel = (id) => paymentMethods.find((method) => method.id === id)?.label ?? id

// Up to four active instructors for the student
function InstructorsSection({ cycle, editable, onChanged, onToast }) {
  const [available, setAvailable] = useState([])
  const [selected, setSelected] = useState(cycle.instructors.map((instructor) => instructor.id))
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!editable) return undefined
    let active = true
    listAssignableInstructors().then((loaded) => active && setAvailable(loaded)).catch(() => {})
    return () => {
      active = false
    }
  }, [editable])

  const toggle = (id) =>
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
  const changed = [...selected].sort().join() !== cycle.instructors.map((i) => i.id).sort().join()

  const save = async () => {
    setBusy(true)
    try {
      onChanged(await setCycleInstructors(cycle.id, selected))
      onToast({ variant: 'success', message: 'Instructors saved.' })
    } catch (saveError) {
      onToast({ variant: 'error', message: saveError.message })
    } finally {
      setBusy(false)
    }
  }

  // Instructors already assigned stay listed even if they are no longer active
  const options = [...cycle.instructors, ...available.filter((item) => !cycle.instructors.some((i) => i.id === item.id))]

  return (
    <DashboardSection title={`Instructors (${cycle.instructors.length} of ${cycle.maxInstructors})`} icon={FaChalkboardUser}>
      {!editable ? (
        cycle.instructors.length === 0 ? (
          <p className="text-gray-600">No instructors assigned.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {cycle.instructors.map((instructor) => (
              <li key={instructor.id} className="rounded-lg bg-gray-50 px-3 py-2 text-sm">
                <span className="font-semibold text-ink">{instructor.name}</span> · {getResponsibilityLabel(instructor.responsibility) ?? 'Not assigned'}
              </li>
            ))}
          </ul>
        )
      ) : (
        <>
          <p className="mb-3 text-sm text-gray-600">Choose up to {cycle.maxInstructors} instructors. Lessons are assigned to them below.</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {options.map((instructor) => {
              const checked = selected.includes(instructor.id)
              const full = !checked && selected.length >= cycle.maxInstructors
              return (
                <label key={instructor.id} className={`flex items-center gap-3 rounded-xl border-2 px-3 py-2 ${checked ? 'border-brand bg-brand-soft' : 'border-gray-200'} ${full ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
                  <input type="checkbox" checked={checked} disabled={full} onChange={() => toggle(instructor.id)} className="h-4 w-4 accent-brand" />
                  <span>
                    <span className="block font-semibold text-ink">{instructor.name}</span>
                    <span className="text-xs text-gray-600">
                      {instructor.drivingSchoolId} · {getResponsibilityLabel(instructor.responsibility) ?? 'Not assigned'}
                    </span>
                  </span>
                </label>
              )
            })}
          </div>
          {selected.length >= cycle.maxInstructors && (
            <p className="mt-2 text-sm text-amber-700">The maximum of {cycle.maxInstructors} instructors is selected.</p>
          )}
          <div className="mt-4 flex justify-end">
            <button type="button" onClick={save} disabled={busy || !changed} className="btn btn-primary !rounded-lg !px-5 !py-2 disabled:cursor-not-allowed disabled:opacity-60">
              <FaFloppyDisk aria-hidden="true" />
              {busy ? 'Saving...' : 'Save Instructors'}
            </button>
          </div>
        </>
      )}
    </DashboardSection>
  )
}

// One lesson: shown, or scheduled in place while it can still change. The date picker only
// offers dates from `cycle.lessonRules.earliestDate` (the later of the day after the exam
// pass date and today); the time picker only the 15-minute slots. The backend checks both.
// A saved value that breaks today's rules is kept and flagged, never changed silently.
function LessonRow({ cycle, lesson, editable, onChanged, onToast }) {
  const rules = cycle.lessonRules
  const [values, setValues] = useState({
    instructorId: lesson.instructor?.id ?? '',
    date: lesson.date ?? '',
    time: lesson.time ?? '',
    location: lesson.location ?? '',
  })
  const [busy, setBusy] = useState(false)
  const canEdit = editable && lesson.attendance === 'PENDING'
  const dirty =
    String(values.instructorId) !== String(lesson.instructor?.id ?? '') ||
    values.date !== (lesson.date ?? '') ||
    values.time !== (lesson.time ?? '') ||
    values.location !== (lesson.location ?? '')

  const slots = getTimeSlots(rules)
  const dateProblem =
    values.date && (values.date < rules.earliestDate || values.date > rules.latestDate)
      ? `Choose a date from ${formatDayShort(rules.earliestDate)}.`
      : ''
  const timeProblem = values.time && !slots.includes(values.time) ? 'Choose a time from the list.' : ''

  const change = (name) => (event) => setValues((current) => ({ ...current, [name]: event.target.value }))
  const save = async () => {
    const problem =
      !values.instructorId || !values.date || !values.time
        ? 'choose an instructor, a date and a time.'
        : dateProblem || timeProblem
    if (problem) {
      onToast({ variant: 'error', message: `Lesson ${lesson.lessonNumber}: ${problem}` })
      return
    }
    setBusy(true)
    try {
      onChanged(await updateLesson(cycle.id, lesson.lessonNumber, { ...values, instructorId: Number(values.instructorId) }))
      onToast({ variant: 'success', message: `Lesson ${lesson.lessonNumber} saved.` })
    } catch (saveError) {
      onToast({ variant: 'error', message: `Lesson ${lesson.lessonNumber}: ${saveError.message}` })
    } finally {
      setBusy(false)
    }
  }

  const id = `lesson-${lesson.lessonNumber}`
  return (
    <tr className="align-top" data-lesson-number={lesson.lessonNumber}>
      <td className="px-3 py-3 font-semibold whitespace-nowrap text-ink">Lesson {lesson.lessonNumber}</td>
      <td className="px-3 py-3">
        <label htmlFor={`${id}-date`} className="sr-only">Date</label>
        <input
          id={`${id}-date`}
          type="date"
          value={values.date}
          min={canEdit ? rules.earliestDate : undefined}
          max={canEdit ? rules.latestDate : undefined}
          disabled={!canEdit}
          onChange={change('date')}
          aria-invalid={canEdit && dateProblem ? true : undefined}
          className={`form-input !py-1.5 w-40 ${canEdit && dateProblem ? 'form-input-error' : ''}`}
        />
        {canEdit && dateProblem && <span role="alert" className="mt-1 block max-w-40 text-xs text-danger">{dateProblem}</span>}
      </td>
      <td className="px-3 py-3">
        <label htmlFor={`${id}-time`} className="sr-only">Time</label>
        <TimeSlotPicker
          id={`${id}-time`}
          value={values.time}
          rules={rules}
          disabled={!canEdit}
          invalid={canEdit && Boolean(timeProblem)}
          onChange={(time) => setValues((current) => ({ ...current, time }))}
        />
        {canEdit && timeProblem && <span role="alert" className="mt-1 block max-w-36 text-xs text-danger">{timeProblem}</span>}
      </td>
      <td className="px-3 py-3">
        <label htmlFor={`${id}-location`} className="sr-only">Location</label>
        <input id={`${id}-location`} type="text" maxLength={150} value={values.location} disabled={!canEdit} onChange={change('location')} placeholder="Location" className="form-input !py-1.5 w-40" />
      </td>
      <td className="px-3 py-3">
        <label htmlFor={`${id}-instructor`} className="sr-only">Instructor</label>
        <select id={`${id}-instructor`} value={values.instructorId} disabled={!canEdit} onChange={change('instructorId')} className="form-input !py-1.5 w-44">
          <option value="">Select...</option>
          {cycle.instructors.map((instructor) => (
            <option key={instructor.id} value={instructor.id}>
              {instructor.name} ({getResponsibilityLabel(instructor.responsibility) ?? 'no vehicle'})
            </option>
          ))}
        </select>
      </td>
      <td className="px-3 py-3">
        <StatusBadge status={attendanceBadge[lesson.attendance]} label={attendanceLabels[lesson.attendance]} />
        {lesson.attendanceMarkedBy && (
          <span className="mt-1 block text-xs text-gray-500">
            {lesson.attendanceMarkedBy}, {formatDateTime(lesson.attendanceMarkedAt)}
          </span>
        )}
      </td>
      <td className="px-3 py-3 text-right">
        {canEdit && (
          <button type="button" onClick={save} disabled={busy || !dirty} className={`${smallButton} bg-brand text-white hover:bg-brand-dark`}>
            <FaFloppyDisk aria-hidden="true" />
            {busy ? 'Saving...' : 'Save'}
          </button>
        )}
      </td>
    </tr>
  )
}

// The practical test date decision, results and reattempt payments
function PracticalTestSection({ cycle, onChanged, onToast }) {
  const { test } = cycle
  const [choice, setChoice] = useState(cycle.provisionalTestDate && test.scheduleKind === 'FIRST' ? 'keep' : 'change')
  const [testDate, setTestDate] = useState('')
  const [result, setResult] = useState('')
  const [remarks, setRemarks] = useState('')
  const [confirming, setConfirming] = useState(null)
  const [rejecting, setRejecting] = useState(null)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const canKeep = Boolean(cycle.provisionalTestDate) && (test.scheduleKind === 'FIRST' || (test.scheduleKind === 'RESCHEDULE' && test.openAttempt?.attemptNumber === 1))
  const keeping = canKeep && choice === 'keep'
  const chosenDate = keeping ? cycle.provisionalTestDate : testDate

  const run = async (action, success) => {
    setBusy(true)
    setError('')
    try {
      onChanged(await action())
      onToast({ variant: 'success', message: success })
      setConfirming(null)
      setRejecting(null)
      setReason('')
      setResult('')
      setRemarks('')
    } catch (actionError) {
      setError(actionError.message)
    } finally {
      setBusy(false)
    }
  }

  const scheduleTitle = {
    FIRST: 'Decide the Practical Test Date',
    RESCHEDULE: `Change the Date of Attempt ${test.openAttempt?.attemptNumber}`,
    NEXT: `Schedule Attempt ${cycle.attempts.length + 1}`,
  }[test.scheduleKind]

  return (
    <DashboardSection title="Practical Test" icon={FaRoad}>
      <PracticalSummary cycle={cycle} showMessage={false} />

      {test.state === 'IN_TRAINING' && (
        <div className="mt-5 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900" data-test-requirements>
          The practical test date can be decided once attendance is marked for all{' '}
          {test.requirements.lessonsTotal} lessons ({test.requirements.lessonsMarked} marked) and at
          least one instructor feedback is submitted ({test.requirements.feedbackSubmitted} so far).
        </div>
      )}

      {test.canSchedule && (
        <div className="mt-6 border-t border-gray-100 pt-5" data-schedule-kind={test.scheduleKind}>
          <h3 className="mb-3 flex items-center gap-2 font-bold text-ink">
            <FaCalendarCheck aria-hidden="true" className="text-brand" />
            {scheduleTitle}
          </h3>
          {test.scheduleKind === 'NEXT' && (
            <p className="mb-3 text-sm text-gray-600">The reattempt fee for the last failed attempt has been verified.</p>
          )}
          {canKeep && (
            <div className="mb-3 flex flex-col gap-2">
              <label className="flex cursor-pointer items-center gap-2">
                <input type="radio" name="dateChoice" checked={choice === 'keep'} onChange={() => setChoice('keep')} className="accent-brand" />
                Keep the original provisional date: <span className="font-semibold">{formatDay(cycle.provisionalTestDate)}</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input type="radio" name="dateChoice" checked={choice === 'change'} onChange={() => setChoice('change')} className="accent-brand" />
                Choose a different date
              </label>
            </div>
          )}
          {!keeping && (
            <div className="mb-3">
              <label htmlFor="practical-test-date" className="mb-1.5 block font-semibold text-ink">Practical test date</label>
              <input id="practical-test-date" type="date" value={testDate} onChange={(event) => setTestDate(event.target.value)} className="form-input w-56" />
            </div>
          )}
          <button
            type="button"
            disabled={!chosenDate}
            onClick={() => {
              setError('')
              setConfirming('schedule')
            }}
            className="btn btn-primary !rounded-lg !px-5 !py-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FaCalendarCheck aria-hidden="true" />
            Confirm Date
          </button>
        </div>
      )}

      {test.openAttempt && (
        <div className="mt-6 border-t border-gray-100 pt-5">
          <h3 className="mb-3 flex items-center gap-2 font-bold text-ink">
            <FaClipboardCheck aria-hidden="true" className="text-brand" />
            Result of Attempt {test.openAttempt.attemptNumber} ({formatDay(test.openAttempt.testDate)})
          </h3>
          {!test.canRecordResult ? (
            <p className="text-sm text-gray-600">The result can be recorded on or after the test date.</p>
          ) : (
            <>
              <div className="mb-3 flex flex-wrap gap-3">
                {['PASSED', 'FAILED'].map((value) => (
                  <label key={value} className={`flex cursor-pointer items-center gap-2 rounded-xl border-2 px-4 py-2 font-semibold ${result === value ? 'border-brand bg-brand-soft' : 'border-gray-200'}`}>
                    <input type="radio" name="practicalResult" value={value} checked={result === value} onChange={() => setResult(value)} className="accent-brand" />
                    {value === 'PASSED' ? 'Passed' : 'Failed'}
                  </label>
                ))}
              </div>
              <label htmlFor="practical-remarks" className="mb-1.5 block font-semibold text-ink">Remarks (optional)</label>
              <textarea id="practical-remarks" rows={2} maxLength={500} value={remarks} onChange={(event) => setRemarks(event.target.value)} className="form-input" />
              <div className="mt-3">
                <button type="button" disabled={!result} onClick={() => setConfirming('result')} className="btn btn-primary !rounded-lg !px-5 !py-2 disabled:cursor-not-allowed disabled:opacity-60">
                  Record Result
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {cycle.payments.length > 0 && (
        <div className="mt-6 border-t border-gray-100 pt-5">
          <h3 className="mb-3 flex items-center gap-2 font-bold text-ink">
            <FaMoneyBillWave aria-hidden="true" className="text-brand" />
            Practical Reattempt Payments
          </h3>
          <ul className="flex flex-col gap-2">
            {cycle.payments.map((payment) => (
              <li key={payment.id} className="flex flex-wrap items-center gap-3 rounded-lg bg-gray-50 px-3 py-2 text-sm" data-payment-status={payment.status}>
                <span className="font-semibold text-ink">#{payment.id} · Attempt {payment.attemptNumber}</span>
                <span>{formatFee(payment.feeAmount)}</span>
                <span className="text-gray-600">{getMethodLabel(payment.paymentMethod)}</span>
                <span className="text-gray-600">{formatDateTime(payment.createdAt)}</span>
                <StatusBadge status={payment.status} label={verificationLabels[payment.status]} />
                <a href={getPracticalReceiptUrl('admin', payment.id)} target="_blank" rel="noreferrer" className={`${smallButton} border border-gray-300 bg-white text-ink hover:border-brand hover:text-brand`}>
                  <FaEye aria-hidden="true" />
                  Receipt
                </a>
                {payment.status === 'PENDING' && (
                  <>
                    <button type="button" onClick={() => run(() => approvePracticalPayment(payment.id), 'Payment approved.')} disabled={busy} className={`${smallButton} bg-emerald-600 text-white hover:bg-emerald-700`}>
                      <FaCircleCheck aria-hidden="true" />
                      Approve
                    </button>
                    <button type="button" onClick={() => setRejecting(payment)} disabled={busy} className={`${smallButton} bg-danger text-white hover:bg-danger-dark`}>
                      <FaBan aria-hidden="true" />
                      Reject
                    </button>
                  </>
                )}
                {payment.rejectionReason && <span className="w-full text-danger-dark">Reason: {payment.rejectionReason}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && !confirming && !rejecting && (
        <p role="alert" className="mt-4 rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger-dark">
          {error}
        </p>
      )}

      {confirming === 'schedule' && (
        <ConfirmDialog
          title="Confirm practical test date?"
          message={`${cycle.student.name}'s practical test${test.scheduleKind === 'NEXT' ? ` (attempt ${cycle.attempts.length + 1})` : ''} will be on ${formatDay(chosenDate)}${keeping ? ', the original provisional date' : ''}. The student will be notified.`}
          confirmLabel="Confirm"
          busy={busy}
          error={error}
          onConfirm={() => run(() => schedulePracticalTest(cycle.id, keeping ? { keepProvisional: true } : { testDate }), 'Practical test date confirmed. The student has been notified.')}
          onCancel={() => setConfirming(null)}
        />
      )}
      {confirming === 'result' && (
        <ConfirmDialog
          title="Record practical test result?"
          message={`Attempt ${test.openAttempt.attemptNumber}: ${result === 'PASSED' ? 'Passed' : 'Failed'}. This uses the attempt and cannot be changed.${result === 'FAILED' && test.openAttempt.attemptNumber >= test.attemptsPerCycle ? " This is the last attempt: the student's account will be locked." : ''}`}
          confirmLabel="Record Result"
          tone={result === 'FAILED' ? 'danger' : 'primary'}
          busy={busy}
          error={error}
          onConfirm={() => run(() => recordPracticalResult(cycle.id, test.openAttempt.attemptNumber, { result, remarks }), 'Result recorded. The student has been notified.')}
          onCancel={() => setConfirming(null)}
        />
      )}
      {rejecting && (
        <Modal title="Reject Payment" icon={FaBan} busy={busy} onClose={() => setRejecting(null)}>
          <label htmlFor="practical-reject-reason" className="mb-1.5 block font-semibold text-ink">
            Why is payment #{rejecting.id} being rejected? <span className="text-danger">*</span>
          </label>
          <textarea id="practical-reject-reason" rows={3} maxLength={300} value={reason} onChange={(event) => setReason(event.target.value)} className="form-input" />
          {error && <p role="alert" className="mt-2 text-sm text-danger-dark">{error}</p>}
          <div className="mt-5 flex justify-end gap-3">
            <button type="button" onClick={() => setRejecting(null)} disabled={busy} className="btn !rounded-lg bg-gray-200 !px-5 !py-2 text-ink hover:bg-gray-300">Cancel</button>
            <button type="button" disabled={busy || !reason.trim()} onClick={() => run(() => rejectPracticalPayment(rejecting.id, reason), 'Payment rejected.')} className="btn btn-danger !rounded-lg !px-5 !py-2 disabled:opacity-60">
              {busy ? 'Please wait...' : 'Reject'}
            </button>
          </div>
        </Modal>
      )}
    </DashboardSection>
  )
}

// Admin-only page: one student's practical training cycle
function LessonDetails() {
  const { cycleId } = useParams()
  const [cycle, setCycle] = useState(null)
  const [feedbacks, setFeedbacks] = useState([])
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)
  const closeToast = useCallback(() => setToast(null), [])

  const refetch = useCallback(() => {
    Promise.all([getPracticalCycle(cycleId), listFeedbacks({ cycleId })])
      .then(([loaded, loadedFeedbacks]) => {
        setCycle(loaded)
        setFeedbacks(loadedFeedbacks)
      })
      .catch(() => {})
  }, [cycleId])
  useRefetchOnFocus(refetch)

  useEffect(() => {
    let active = true
    Promise.all([getPracticalCycle(cycleId), listFeedbacks({ cycleId })])
      .then(([loaded, loadedFeedbacks]) => {
        if (!active) return
        setCycle(loaded)
        setFeedbacks(loadedFeedbacks)
      })
      .catch((loadError) => active && setError(loadError.message))
    return () => {
      active = false
    }
  }, [cycleId])

  const backLink = (
    <Link to={LESSONS_PATH} className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-gray-700 transition hover:text-brand">
      <FaArrowLeft aria-hidden="true" />
      Back to Lessons
    </Link>
  )

  if (!cycle) {
    return (
      <>
        {backLink}
        <p role={error ? 'alert' : 'status'} className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-600 shadow-sm">
          {error || 'Loading...'}
        </p>
      </>
    )
  }

  // The schedule is fixed once the practical test date is confirmed
  const editable = cycle.status === 'ACTIVE' && cycle.attempts.length === 0

  return (
    <>
      {backLink}
      <DashboardWelcome
        title={`${cycle.student.name}`}
        message={`${cycle.student.drivingSchoolId} · practical training cycle ${cycle.cycleNumber}`}
        icon={FaCarSide}
      />
      <p className="flex flex-wrap items-center gap-2">
        <StatusBadge status={cycleStatusBadge[cycle.status]} label={cycleStatusLabels[cycle.status]} />
        {cycle.student.locked && <StatusBadge status="REJECTED" label="Account locked" />}
      </p>

      {/* Remounted after every change so its form starts from the saved state */}
      <PracticalTestSection key={`test-${cycle.attempts.length}-${cycle.test.state}-${cycle.payments.length}`} cycle={cycle} onChanged={setCycle} onToast={setToast} />

      <InstructorsSection key={`instructors-${cycle.instructors.map((i) => i.id).join()}`} cycle={cycle} editable={editable} onChanged={setCycle} onToast={setToast} />

      <DashboardSection title="Lesson Schedule (10 lessons)" icon={FaCarSide}>
        {editable && cycle.instructors.length === 0 && (
          <p className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">Assign instructors first, then schedule each lesson.</p>
        )}
        {!editable && <p className="mb-4 text-sm text-gray-600">The schedule can no longer be changed for this cycle.</p>}
        {editable && (
          <p className="mb-4 text-sm text-gray-600">
            Lessons can be scheduled from {formatDay(cycle.lessonRules.earliestDate)}
            {cycle.examDate ? ` (the driving school exam was passed on ${formatDayShort(cycle.examDate)})` : ''}, at
            15-minute times between 7:00 AM and 7:00 PM. Choose a time and press OK, then Save the lesson.
          </p>
        )}
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full min-w-[58rem] text-left text-sm">
            <caption className="sr-only">Lesson schedule</caption>
            <thead className="bg-gray-50 text-xs tracking-wide text-gray-600 uppercase">
              <tr>
                {['Lesson', 'Date', 'Time', 'Location', 'Instructor', 'Attendance', ''].map((label) => (
                  <th key={label} scope="col" className="px-3 py-3 font-semibold whitespace-nowrap">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cycle.lessons.map((lesson) => (
                <LessonRow
                  key={`${lesson.id}-${lesson.date}-${lesson.time}-${lesson.instructor?.id}-${lesson.attendance}-${cycle.instructors.length}`}
                  cycle={cycle}
                  lesson={lesson}
                  editable={editable}
                  onChanged={setCycle}
                  onToast={setToast}
                />
              ))}
            </tbody>
          </table>
        </div>
      </DashboardSection>

      <DashboardSection title={`Instructor Feedback (${feedbacks.length})`} icon={FaCommentDots}>
        {feedbacks.length === 0 ? (
          <p className="text-gray-600">No feedback has been submitted for this student yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {feedbacks.map((feedback) => (
              <FeedbackCard key={feedback.id} feedback={feedback} />
            ))}
          </div>
        )}
        <p className="mt-3 text-sm text-gray-500">Feedback is advisory: the practical test date is your decision.</p>
      </DashboardSection>
      <Toast toast={toast} onClose={closeToast} />
    </>
  )
}

export default LessonDetails
