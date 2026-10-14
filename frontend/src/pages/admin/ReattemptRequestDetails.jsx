import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  FaArrowLeft,
  FaBan,
  FaCircleCheck,
  FaClipboardCheck,
  FaClockRotateLeft,
  FaMoneyBillWave,
} from 'react-icons/fa6'
import ConfirmDialog from '../../components/admin/ConfirmDialog'
import Modal from '../../components/admin/Modal'
import DashboardSection from '../../components/dashboard/DashboardSection'
import DashboardWelcome from '../../components/dashboard/DashboardWelcome'
import Toast from '../../components/dashboard/Toast'
import AttemptHistoryTable from '../../components/licenceExam/AttemptHistoryTable'
import ReattemptRequestSummary from '../../components/licenceExam/ReattemptRequestSummary'
import { useNotifications } from '../../context/useNotifications'
import {
  approveReattemptRequest,
  getReattemptRequest,
  rejectReattemptRequest,
} from '../../services/licenceExamApi'
import { formatAttempt, formatFee } from '../../utils/licenceExamUtils'

const LIST_PATH = '/admin-dashboard/notifications'
const REASON_MAX_LENGTH = 300

const rejectable = [
  { field: 'rejectPayment', label: 'The payment could not be verified' },
  { field: 'rejectMedicalReport', label: 'The medical report is not acceptable' },
]

// Reject dialog: the reason the student will see and, when the request also carries a
// medical report, which of the two is not acceptable. Without a medical report only the
// payment can be rejected. `onRejected(request)` receives the updated request.
function RejectDialog({ request, onRejected, onClose }) {
  const { medicalReportRequired } = request
  const [form, setForm] = useState({
    rejectPayment: !medicalReportRequired,
    rejectMedicalReport: false,
    reason: '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  const submit = async (event) => {
    event.preventDefault()
    const errors = {}
    if (!form.rejectMedicalReport && !form.rejectPayment) {
      errors.rejected = 'Select what is being rejected: the payment, the medical report or both.'
    }
    if (!form.reason.trim()) errors.reason = 'Please enter the reason for the rejection.'
    setFieldErrors(errors)
    setError('')
    if (Object.keys(errors).length > 0) return

    setBusy(true)
    try {
      onRejected(await rejectReattemptRequest(request.id, form))
    } catch (rejectError) {
      setError(rejectError.message)
      setFieldErrors(rejectError.fieldErrors ?? {})
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      title={medicalReportRequired ? 'Reject Request' : 'Reject Payment'}
      icon={FaBan}
      busy={busy}
      onClose={onClose}
    >
      <form onSubmit={submit} noValidate>
        <fieldset disabled={busy}>
          {medicalReportRequired ? (
            <>
              <legend className="font-semibold text-ink">
                What is wrong with {request.studentName}&apos;s submission?
              </legend>
              <div className="mt-4 flex flex-col gap-2">
                {rejectable.map(({ field, label }) => (
                  <label
                    key={field}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 px-4 py-3 font-semibold transition focus-within:ring-2 focus-within:ring-brand/30 ${
                      form[field]
                        ? 'border-brand bg-brand-soft text-ink'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-brand/40'
                    }`}
                  >
                    <input
                      type="checkbox"
                      name={field}
                      checked={form[field]}
                      onChange={(event) => {
                        setForm((current) => ({ ...current, [field]: event.target.checked }))
                        setFieldErrors({})
                      }}
                      className="h-4 w-4 accent-brand"
                    />
                    {label}
                  </label>
                ))}
              </div>
              {fieldErrors.rejected && (
                <p role="alert" className="mt-2 text-sm text-danger-dark">
                  {fieldErrors.rejected}
                </p>
              )}
            </>
          ) : (
            <legend className="font-semibold text-ink">
              Why is {request.studentName}&apos;s {formatFee(request.feeAmount)} payment being
              rejected?
            </legend>
          )}

          <div className="mt-4">
            <label htmlFor="reattempt-reject-reason" className="mb-1.5 block text-sm font-semibold text-ink">
              Reason <span className="text-danger">*</span>
            </label>
            <textarea
              id="reattempt-reject-reason"
              rows={3}
              maxLength={REASON_MAX_LENGTH}
              value={form.reason}
              onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))}
              aria-invalid={Boolean(fieldErrors.reason)}
              aria-describedby="reattempt-reject-reason-hint"
              placeholder="Explain the reason to the student"
              className={`form-input ${fieldErrors.reason ? 'form-input-error' : ''}`}
            />
            <p id="reattempt-reject-reason-hint" className="mt-1 text-xs text-gray-500">
              The student will see this reason. {form.reason.length}/{REASON_MAX_LENGTH}
            </p>
            {fieldErrors.reason && (
              <p role="alert" className="mt-1 text-sm text-danger-dark">
                {fieldErrors.reason}
              </p>
            )}
          </div>
        </fieldset>

        {error && (
          <p role="alert" className="mt-4 rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger-dark">
            {error}
          </p>
        )}
        <p className="mt-4 text-sm text-gray-600">
          The student cannot request another examination date and can submit valid proof again.
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
            {busy ? 'Please wait...' : 'Reject'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// Admin-only page for one reattempt payment: the student, the failed attempt it pays for,
// the receipt (and the new medical report after a third failure), the student's earlier
// attempts, and the decision. Approving is what lets the student request another date;
// uploading the files did not.
function ReattemptRequestDetails() {
  const { reattemptRequestId } = useParams()
  const { notifications, markRead, refresh: refreshNotifications } = useNotifications()
  const [request, setRequest] = useState(null)
  const [error, setError] = useState('')
  // null | 'approve' | 'reject'
  const [dialog, setDialog] = useState(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')
  const [toast, setToast] = useState(null)
  const closeToast = useCallback(() => setToast(null), [])

  useEffect(() => {
    let active = true
    getReattemptRequest(reattemptRequestId)
      .then((loaded) => active && setRequest(loaded))
      .catch((loadError) => active && setError(loadError.message))
    return () => {
      active = false
    }
  }, [reattemptRequestId])

  // Opening the request is reading the notifications about it
  useEffect(() => {
    notifications
      .filter((n) => !n.read && String(n.examReattemptRequestId) === reattemptRequestId)
      .forEach((notification) => markRead(notification.id).catch(() => {}))
  }, [notifications, reattemptRequestId, markRead])

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
      const updated = await approveReattemptRequest(request.id)
      handleDecided(
        updated,
        `Approved. ${updated.studentName} can now request an examination date and has been notified.`,
      )
    } catch (approveError) {
      setActionError(approveError.message)
      // 409: someone else has decided this request in the meantime. Show what it is now.
      if (approveError.status === 409) {
        getReattemptRequest(reattemptRequestId).then(setRequest).catch(() => {})
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
          {error || 'Loading payment...'}
        </p>
      </>
    )
  }

  const closeDialog = () => {
    setDialog(null)
    setActionError('')
  }
  const { medicalReportRequired } = request
  const fee = formatFee(request.feeAmount)
  const attempt = formatAttempt(request.attemptNumber, request.attemptsPerCycle)

  return (
    <>
      {backLink}
      <DashboardWelcome
        title={`Reattempt Payment #${request.id}`}
        message={`${request.studentName} (${request.drivingSchoolId})`}
        icon={FaMoneyBillWave}
      />

      <DashboardSection title="Payment and Documents" icon={FaClipboardCheck}>
        <ReattemptRequestSummary request={request} role="admin" showStudent />
      </DashboardSection>

      <DashboardSection title="Examination Attempts" icon={FaClockRotateLeft}>
        <AttemptHistoryTable attempts={request.attempts} />
      </DashboardSection>

      {/* A third failure's payment came with a reapplication and is decided with it */}
      {request.status === 'PENDING' && request.decidedWithReapplication && (
        <DashboardSection title="Verification" icon={FaCircleCheck}>
          <p data-with-reapplication className="text-gray-700">
            This payment is for a third failed attempt. It is verified together with the
            student&apos;s reapplication, on the Registration Forms page: approving the
            reapplication approves this payment, and rejecting it rejects this payment.
          </p>
          {request.reapplicationId && (
            <div className="mt-5 flex justify-end">
              <Link
                to={`/admin-dashboard/registration-forms/${request.reapplicationId}`}
                className="btn btn-primary !rounded-lg !px-5 !py-2.5"
              >
                Open Reapplication #{request.reapplicationId}
              </Link>
            </div>
          )}
        </DashboardSection>
      )}

      {request.status === 'PENDING' && !request.decidedWithReapplication && (
        <DashboardSection title="Verification" icon={FaCircleCheck}>
          <p className="text-gray-700">
            Open the payment receipt{medicalReportRequired && ' and the new medical report'} above
            and check {medicalReportRequired ? 'them' : 'it'} before deciding. Approve only when
            the <strong>{fee}</strong> reattempt fee has been received
            {medicalReportRequired && ' and the new medical report is acceptable'}.
          </p>
          <p className="mt-2 text-sm text-gray-600">
            {medicalReportRequired
              ? `This was ${attempt}: a new medical report is required as well as the payment, and approval starts attempt cycle ${request.newCycleNumber}.`
              : `This was ${attempt}: only the payment is required.`}
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
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              <FaCircleCheck aria-hidden="true" />
              {medicalReportRequired ? 'Approve Payment and Medical Report' : 'Approve Payment'}
            </button>
          </div>
        </DashboardSection>
      )}

      {dialog === 'approve' && (
        <ConfirmDialog
          title={medicalReportRequired ? 'Approve payment and medical report?' : 'Approve payment?'}
          message={
            medicalReportRequired
              ? `This confirms that ${request.studentName}'s ${fee} payment has been received and the new medical report is acceptable. The student will start attempt cycle ${request.newCycleNumber} with 3 new attempts and can request an examination date. This cannot be undone.`
              : `This confirms that ${request.studentName}'s ${fee} payment for ${attempt} has been received. The student can then request the next examination date. This cannot be undone.`
          }
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
          onRejected={(updated) => handleDecided(updated, 'Rejected. The student has been notified.')}
          onClose={closeDialog}
        />
      )}

      <Toast toast={toast} onClose={closeToast} />
    </>
  )
}

export default ReattemptRequestDetails
