import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { FaArrowLeft, FaBan, FaCalendarCheck, FaCircleCheck, FaClipboardCheck } from 'react-icons/fa6'
import ConfirmDialog from '../../components/admin/ConfirmDialog'
import Modal from '../../components/admin/Modal'
import DashboardSection from '../../components/dashboard/DashboardSection'
import DashboardWelcome from '../../components/dashboard/DashboardWelcome'
import Toast from '../../components/dashboard/Toast'
import ExamDateRequestSummary from '../../components/examDate/ExamDateRequestSummary'
import { useNotifications } from '../../context/useNotifications'
import {
  approveExamDateRequest,
  getExamDateRequest,
  rejectExamDateRequest,
} from '../../services/examDateRequestApi'
import { formatExamDate, getSchoolDate, rejectionReasons } from '../../utils/examDateUtils'

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

// Admin-only page for one exam date request: its details and, while it is pending, the
// decision. Approving confirms exactly one of the student's preferred dates.
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
