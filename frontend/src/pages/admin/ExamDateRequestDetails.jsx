import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  FaArrowLeft,
  FaBan,
  FaCalendarCheck,
  FaCircleCheck,
  FaCircleInfo,
  FaClipboardCheck,
  FaSquarePollVertical,
} from 'react-icons/fa6'
import ConfirmDialog from '../../components/admin/ConfirmDialog'
import Modal from '../../components/admin/Modal'
import DashboardSection from '../../components/dashboard/DashboardSection'
import DashboardWelcome from '../../components/dashboard/DashboardWelcome'
import StatusBadge from '../../components/dashboard/StatusBadge'
import Toast from '../../components/dashboard/Toast'
import ExamDateRequestSummary from '../../components/examDate/ExamDateRequestSummary'
import { useNotifications } from '../../context/useNotifications'
import {
  approveExamDateRequest,
  getExamDateRequest,
  rejectExamDateRequest,
} from '../../services/examDateRequestApi'
import { recordExamResult } from '../../services/licenceExamApi'
import { formatExamDate, getSchoolDate, rejectionReasons } from '../../utils/examDateUtils'
import { formatDateTime } from '../../utils/formatUtils'
import { formatAttempt, resultLabels } from '../../utils/licenceExamUtils'

const LIST_PATH = '/admin-dashboard/notifications'
const OTHER_REASON_MAX_LENGTH = 300

const optionClass = (selected, disabled) =>
  `flex items-center gap-3 rounded-xl border-2 px-4 py-3 font-semibold transition focus-within:ring-2 focus-within:ring-brand/30 ${
    disabled
      ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400'
      : selected
        ? 'cursor-pointer border-brand bg-brand-soft text-ink'
        : 'cursor-pointer border-gray-200 bg-white text-gray-700 hover:border-brand/40'
  }`

// Reject dialog: one of the listed reasons, with the admin's own text for "Other".
// `onRejected(request)` receives the updated request.
function RejectDialog({ request, onRejected, onClose }) {
  const [reason, setReason] = useState('')
  const [otherReason, setOtherReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  const submit = async (event) => {
    event.preventDefault()
    const errors = {}
    if (!reason) errors.reason = 'Please choose a reason for the rejection.'
    else if (reason === 'OTHER' && !otherReason.trim()) {
      errors.otherReason = 'Please enter the reason for the rejection.'
    }
    setFieldErrors(errors)
    setError('')
    if (Object.keys(errors).length > 0) return

    setBusy(true)
    try {
      onRejected(await rejectExamDateRequest(request.id, { reason, otherReason }))
    } catch (rejectError) {
      setError(rejectError.message)
      setFieldErrors(rejectError.fieldErrors ?? {})
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title="Reject Request" icon={FaBan} busy={busy} onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <fieldset disabled={busy}>
          <legend className="font-semibold text-ink">
            Why is {request.studentName}&apos;s request being rejected?
          </legend>
          <div className="mt-4 flex flex-col gap-2">
            {rejectionReasons.map(({ code, label }) => (
              <label key={code} className={optionClass(reason === code, false)}>
                <input
                  type="radio"
                  name="rejectionReason"
                  value={code}
                  checked={reason === code}
                  onChange={() => {
                    setReason(code)
                    setFieldErrors({})
                  }}
                  className="h-4 w-4 accent-brand"
                />
                {label}
              </label>
            ))}
          </div>
          {fieldErrors.reason && (
            <p role="alert" className="mt-2 text-sm text-danger-dark">
              {fieldErrors.reason}
            </p>
          )}

          {reason === 'OTHER' && (
            <div className="mt-4">
              <label htmlFor="other-reason" className="mb-1.5 block text-sm font-semibold text-ink">
                Reason <span className="text-danger">*</span>
              </label>
              <textarea
                id="other-reason"
                rows={3}
                maxLength={OTHER_REASON_MAX_LENGTH}
                value={otherReason}
                onChange={(event) => setOtherReason(event.target.value)}
                aria-invalid={Boolean(fieldErrors.otherReason)}
                aria-describedby="other-reason-hint"
                placeholder="Explain the reason to the student"
                className={`form-input ${fieldErrors.otherReason ? 'form-input-error' : ''}`}
              />
              <p id="other-reason-hint" className="mt-1 text-xs text-gray-500">
                The student will see this reason. {otherReason.length}/{OTHER_REASON_MAX_LENGTH}
              </p>
              {fieldErrors.otherReason && (
                <p role="alert" className="mt-1 text-sm text-danger-dark">
                  {fieldErrors.otherReason}
                </p>
              )}
            </div>
          )}
        </fieldset>

        {error && (
          <p role="alert" className="mt-4 rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger-dark">
            {error}
          </p>
        )}
        <p className="mt-4 text-sm text-gray-600">
          A rejected request cannot be approved afterwards. The student can submit a new request.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="btn !rounded-lg bg-gray-200 !px-5 !py-2 text-ink hover:bg-gray-300 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="btn btn-danger !rounded-lg !px-5 !py-2 disabled:cursor-wait disabled:opacity-70"
          >
            {busy ? 'Please wait...' : 'Reject Request'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

const resultOptions = [
  { value: 'PASSED', label: 'Passed' },
  { value: 'FAILED', label: 'Failed' },
]

// The examination of an approved request: which attempt it is and, after the examination,
// its result. Recording Passed or Failed is what uses one of the student's attempts, and
// it can be done once. `onRecorded(request)` receives the updated request; `onStale()` is
// called when the backend says the page is out of date.
function ExaminationResult({ request, onRecorded, onStale }) {
  const { result, attemptSummary } = request
  const recorded = result.status !== 'PENDING'
  const [choice, setChoice] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // Why no result can be recorded for this booking, if so (the backend refuses it too)
  const blocked = recorded
    ? ''
    : attemptSummary.passed
      ? 'This student has already passed the examination, so no further result can be recorded.'
      : attemptSummary.nextAttemptNumber === null
        ? `This student has used all ${attemptSummary.attemptsPerCycle} attempts of attempt cycle ${attemptSummary.cycleNumber}. A new attempt cycle must be approved before another result can be recorded.`
        : ''
  const attempt = recorded
    ? formatAttempt(result.attemptNumber, result.attemptsPerCycle)
    : blocked
      ? 'Not counted'
      : formatAttempt(attemptSummary.nextAttemptNumber, attemptSummary.attemptsPerCycle)

  const rows = [
    { label: 'Student Name', value: request.studentName },
    { label: 'Driving School ID', value: request.drivingSchoolId },
    { label: 'Confirmed Examination Date', value: formatExamDate(request.approvedDate) },
    { label: 'Attempt', value: attempt },
    { label: 'Attempt Cycle', value: recorded ? result.cycleNumber : attemptSummary.cycleNumber },
    {
      label: 'Result Status',
      value: <StatusBadge status={result.status} label={resultLabels[result.status]} />,
    },
    ...(recorded ? [{ label: 'Result Recorded', value: formatDateTime(result.recordedAt) }] : []),
  ]

  // True from the click until the backend answers. A ref, not state: a second click in
  // the same instant, before the button has been redrawn as disabled, is stopped too.
  const recording = useRef(false)

  const record = async () => {
    if (recording.current) return
    recording.current = true
    setBusy(true)
    setError('')
    try {
      const updated = await recordExamResult(request.id, choice)
      // Only once the backend has confirmed it: on a failure the dialog stays open with
      // the error, so the admin can try again
      setConfirming(false)
      onRecorded(updated)
    } catch (recordError) {
      setError(recordError.message)
      // 409: recorded already, or the student's attempts changed in the meantime
      if (recordError.status === 409) onStale()
    } finally {
      recording.current = false
      setBusy(false)
    }
  }

  // A failed last attempt of the cycle locks the student's account
  const locksAccount =
    choice === 'FAILED' && !recorded && attemptSummary.nextAttemptNumber === attemptSummary.attemptsPerCycle
  const notYetHeld = request.approvedDate > getSchoolDate()
  const choiceLabel = resultOptions.find((option) => option.value === choice)?.label

  return (
    <DashboardSection title="Examination Result" icon={FaSquarePollVertical}>
      <dl className="divide-y divide-gray-100" data-exam-result={result.status}>
        {rows.map(({ label, value }) => (
          <div key={label} className="grid gap-1 py-3 sm:grid-cols-[14rem_1fr] sm:gap-4">
            <dt className="text-sm font-medium text-gray-500">{label}</dt>
            <dd className="font-medium break-words text-ink">{value}</dd>
          </div>
        ))}
      </dl>

      {blocked && (
        <p className="mt-4 flex items-start gap-3 rounded-lg bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          <FaCircleInfo aria-hidden="true" className="mt-0.5 shrink-0" />
          {blocked}
        </p>
      )}

      {!recorded && !blocked && (
        <div className="mt-5 border-t border-gray-100 pt-5">
          <fieldset disabled={busy}>
            <legend className="font-semibold text-ink">
              After the examination, record the result:
            </legend>
            <div className="mt-4 flex flex-wrap gap-3">
              {resultOptions.map(({ value, label }) => (
                <label key={value} className={`min-w-32 ${optionClass(choice === value, false)}`}>
                  <input
                    type="radio"
                    name="examResult"
                    value={value}
                    checked={choice === value}
                    onChange={() => setChoice(value)}
                    className="h-4 w-4 accent-brand"
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
          <p className="mt-4 text-sm text-gray-600">
            Recording a result uses one of the student&apos;s attempts and cannot be changed
            afterwards. A failed first or second attempt requires the student to pay the
            reattempt fee before requesting another date; a failed third attempt costs no fee
            but locks the account until a new registration application is approved. If the
            student did not sit the examination,
            do not record a result.
          </p>
          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={() => setConfirming(true)}
              disabled={!choice}
              title={choice ? undefined : 'Select Passed or Failed first'}
              className="btn btn-primary !rounded-lg !px-5 !py-2.5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FaSquarePollVertical aria-hidden="true" />
              Record Result
            </button>
          </div>
        </div>
      )}

      {confirming && (
        <ConfirmDialog
          title={`Record result: ${choiceLabel}?`}
          message={`${request.studentName}'s examination on ${formatExamDate(request.approvedDate)} will be recorded as ${choiceLabel} (${attempt}). The student will be notified. This uses one attempt and cannot be changed.${locksAccount ? " This is the student's last attempt: recording Failed locks the account until a new registration application is approved." : ''}${notYetHeld ? ' Note: this examination date has not arrived yet.' : ''}`}
          confirmLabel={`Record ${choiceLabel}`}
          tone={choice === 'FAILED' ? 'danger' : 'primary'}
          busy={busy}
          error={error}
          onConfirm={record}
          onCancel={() => {
            setConfirming(false)
            setError('')
          }}
        />
      )}
    </DashboardSection>
  )
}

// Admin-only page for one exam date request: its details and, while it is pending, the
// decision. Approving confirms exactly one of the student's preferred dates. After the
// examination of an approved request, its result is recorded here.
function ExamDateRequestDetails() {
  const { requestId } = useParams()
  const { notifications, markRead, refresh: refreshNotifications } = useNotifications()
  const [request, setRequest] = useState(null)
  const [error, setError] = useState('')
  const [approvedDate, setApprovedDate] = useState('')
  // null | 'approve' | 'reject'
  const [dialog, setDialog] = useState(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')
  const [toast, setToast] = useState(null)
  const closeToast = useCallback(() => setToast(null), [])

  useEffect(() => {
    let active = true
    getExamDateRequest(requestId)
      .then((loaded) => active && setRequest(loaded))
      .catch((loadError) => active && setError(loadError.message))
    return () => {
      active = false
    }
  }, [requestId])

  // Opening the request is reading the notifications about it
  useEffect(() => {
    notifications
      .filter((notification) => !notification.read && String(notification.examDateRequestId) === requestId)
      .forEach((notification) => markRead(notification.id).catch(() => {}))
  }, [notifications, requestId, markRead])

  const handleDecided = (updated, message) => {
    setRequest(updated)
    setDialog(null)
    setToast({ message, variant: 'success' })
    refreshNotifications()
  }

  const approve = async () => {
    setBusy(true)
    setActionError('')
    try {
      const updated = await approveExamDateRequest(request.id, approvedDate)
      handleDecided(updated, `Request approved for ${formatExamDate(updated.approvedDate)}. The student has been notified.`)
    } catch (approveError) {
      setActionError(approveError.message)
      // 409: someone else has decided this request in the meantime. Show what it is now.
      if (approveError.status === 409) {
        getExamDateRequest(requestId).then(setRequest).catch(() => {})
      }
    } finally {
      setBusy(false)
    }
  }

  const backLink = (
    <Link
      to={LIST_PATH}
      className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-gray-700 transition hover:text-brand"
    >
      <FaArrowLeft aria-hidden="true" />
      Back to Notifications
    </Link>
  )

  if (!request) {
    return (
      <>
        {backLink}
        <p
          role={error ? 'alert' : 'status'}
          className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-600 shadow-sm"
        >
          {error || 'Loading request...'}
        </p>
      </>
    )
  }

  const today = getSchoolDate()
  const closeDialog = () => {
    setDialog(null)
    setActionError('')
  }

  return (
    <>
      {backLink}
      <DashboardWelcome
        title={`Exam Date Request #${request.id}`}
        message={`${request.studentName} (${request.drivingSchoolId})`}
        icon={FaCalendarCheck}
      />

      <DashboardSection title="Request Details" icon={FaClipboardCheck}>
        <ExamDateRequestSummary request={request} showStudent />
      </DashboardSection>

      {request.status === 'APPROVED' && (
        <ExaminationResult
          request={request}
          onRecorded={(updated) =>
            handleDecided(
              updated,
              `Result recorded: ${resultLabels[updated.result.status]}. The student has been notified.`,
            )
          }
          onStale={() => getExamDateRequest(requestId).then(setRequest).catch(() => {})}
        />
      )}

      {request.status === 'PENDING' && (
        <DashboardSection title="Decision" icon={FaCircleCheck}>
          <fieldset>
            <legend className="font-semibold text-ink">
              To approve, choose one of the dates the student requested:
            </legend>
            <div className="mt-4 flex flex-col gap-2">
              {request.preferredDates.map((date, index) => {
                const passed = date < today
                return (
                  <label key={date} className={optionClass(approvedDate === date, passed)}>
                    <input
                      type="radio"
                      name="approvedDate"
                      value={date}
                      checked={approvedDate === date}
                      disabled={passed}
                      onChange={() => setApprovedDate(date)}
                      className="h-4 w-4 accent-brand"
                    />
                    <span className="text-sm text-gray-500">{index + 1}.</span>
                    {formatExamDate(date)}
                    {passed && <span className="text-sm font-normal">(date has passed)</span>}
                  </label>
                )
              })}
            </div>
          </fieldset>
          <p className="mt-4 text-sm text-gray-600">
            Only one date is confirmed for a request. The other dates stay as alternatives the
            student offered and are not booked.
          </p>

          <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-5">
            <button
              type="button"
              onClick={() => setDialog('reject')}
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-danger px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-danger-dark"
            >
              <FaBan aria-hidden="true" />
              Reject
            </button>
            <button
              type="button"
              onClick={() => setDialog('approve')}
              disabled={!approvedDate}
              title={approvedDate ? undefined : 'Choose a date first'}
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FaCircleCheck aria-hidden="true" />
              Approve
            </button>
          </div>
        </DashboardSection>
      )}

      {dialog === 'approve' && (
        <ConfirmDialog
          title="Approve exam date?"
          message={`${request.studentName}'s physical driving licence examination will be confirmed for ${formatExamDate(approvedDate)}. The student will be notified. This cannot be undone.`}
          confirmLabel="Approve"
          busy={busy}
          error={actionError}
          onConfirm={approve}
          onCancel={closeDialog}
        />
      )}
      {dialog === 'reject' && (
        <RejectDialog
          request={request}
          onRejected={(updated) =>
            handleDecided(updated, 'Request rejected. The student has been notified.')
          }
          onClose={closeDialog}
        />
      )}

      <Toast toast={toast} onClose={closeToast} />
    </>
  )
}

export default ExamDateRequestDetails
