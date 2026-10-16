import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FaArrowUpRightFromSquare,
  FaBan,
  FaCircleCheck,
  FaClipboardCheck,
  FaClockRotateLeft,
  FaFolderOpen,
  FaTriangleExclamation,
} from 'react-icons/fa6'
import ConfirmDialog from './ConfirmDialog'
import Modal from './Modal'
import DashboardSection from '../dashboard/DashboardSection'
import DashboardTable from '../dashboard/DashboardTable'
import StatusBadge from '../dashboard/StatusBadge'
import AttemptHistoryTable from '../licenceExam/AttemptHistoryTable'
import { formatPrice, paymentMethods } from '../../data/registrationData'
import { approveApplication, rejectApplication } from '../../services/applicationApi'
import { formatDateTime } from '../../utils/formatUtils'
import { formatFee, verificationLabels } from '../../utils/licenceExamUtils'

const REASON_MAX_LENGTH = 300
const typeLabels = { NEW_STUDENT: 'First-time application', REAPPLICATION: 'Reapplication' }

const getPaymentMethodLabel = (id) => paymentMethods.find((method) => method.id === id)?.label ?? id

// Reject dialog: the reason, which the student will see. `onRejected(application)`
// receives the updated application.
function RejectDialog({ application, onRejected, onClose }) {
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [fieldError, setFieldError] = useState('')

  const submit = async (event) => {
    event.preventDefault()
    if (!reason.trim()) {
      setFieldError('Please enter the reason for the rejection.')
      return
    }
    setBusy(true)
    setError('')
    setFieldError('')
    try {
      onRejected(await rejectApplication(application.id, reason))
    } catch (rejectError) {
      setError(rejectError.message)
      setFieldError(rejectError.fieldErrors?.reason ?? '')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title="Reject Reapplication" icon={FaBan} busy={busy} onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <label htmlFor="reapplication-reject-reason" className="mb-1.5 block font-semibold text-ink">
          Why is {application.fullName}&apos;s reapplication being rejected?{' '}
          <span className="text-danger">*</span>
        </label>
        <textarea
          id="reapplication-reject-reason"
          rows={3}
          maxLength={REASON_MAX_LENGTH}
          value={reason}
          disabled={busy}
          onChange={(event) => setReason(event.target.value)}
          aria-invalid={Boolean(fieldError)}
          placeholder="Explain the reason to the student"
          className={`form-input ${fieldError ? 'form-input-error' : ''}`}
        />
        <p className="mt-1 text-xs text-gray-500">
          The student will see this reason. {reason.length}/{REASON_MAX_LENGTH}
        </p>
        {fieldError && (
          <p role="alert" className="mt-1 text-sm text-danger-dark">
            {fieldError}
          </p>
        )}
        {error && (
          <p role="alert" className="mt-4 rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger-dark">
            {error}
          </p>
        )}
        <p className="mt-4 text-sm text-gray-600">
          The student&apos;s account stays locked. The application and its documents are kept, and
          the student can submit a new application.
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

// Approve / Reject for a reapplication that is still NEW. Approving unlocks the student's
// existing account; nothing is created. `onChanged(application)` receives the updated one.
export function ReapplicationActions({ application, onChanged }) {
  // null | 'approve' | 'reject'
  const [dialog, setDialog] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (application.status !== 'NEW') return null
  const { student, attemptsPerCycle } = application.reapplication

  const approve = async () => {
    setBusy(true)
    setError('')
    try {
      const updated = await approveApplication(application.id)
      setDialog(null)
      onChanged(updated)
    } catch (approveError) {
      setError(approveError.message)
    } finally {
      setBusy(false)
    }
  }
  const close = () => {
    setDialog(null)
    setError('')
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setDialog('reject')}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-white transition hover:bg-danger-dark"
      >
        <FaBan aria-hidden="true" />
        Reject
      </button>
      <button
        type="button"
        onClick={() => setDialog('approve')}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
      >
        <FaCircleCheck aria-hidden="true" />
        Approve
      </button>

      {dialog === 'approve' && (
        <ConfirmDialog
          title="Approve reapplication?"
          message={`This confirms that you have verified ${application.fullName}'s new medical report (confirmed by the student) and the ${formatPrice(application.minimumPayment)} registration payment for ${application.packageName}. The existing account ${student?.drivingSchoolId ?? ''} will be reactivated with the same Driving School ID and password, and will start a new cycle of ${attemptsPerCycle} examination attempts. This cannot be undone.`}
          confirmLabel="Approve"
          busy={busy}
          error={error}
          onConfirm={approve}
          onCancel={close}
        />
      )}
      {dialog === 'reject' && (
        <RejectDialog
          application={application}
          onRejected={(updated) => {
            setDialog(null)
            onChanged(updated)
          }}
          onClose={close}
        />
      )}
    </>
  )
}

const rowClass = 'grid gap-1 py-3 sm:grid-cols-[12rem_1fr] sm:gap-4'

// Label / value rows inside a section
function Rows({ rows }) {
  return (
    <dl className="divide-y divide-gray-100">
      {rows.map(({ label, value }) => (
        <div key={label} className={rowClass}>
          <dt className="text-sm font-medium text-gray-500">{label}</dt>
          <dd className="font-medium break-words text-ink">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

// Badge colours for the cycle statuses, from the ones StatusBadge already knows
const cycleBadges = {
  ACTIVE: { status: 'Active', label: 'Active' },
  EXHAUSTED: { status: 'REJECTED', label: 'Exhausted (3 failed)' },
  PASSED: { status: 'PASSED', label: 'Passed' },
}

const cycleColumns = [
  { key: 'cycleNumber', label: 'Cycle', render: (row) => `Cycle ${row.cycleNumber}` },
  {
    key: 'applicationId',
    label: 'Application',
    render: (row) =>
      row.applicationId ? (
        <Link to={`/admin-dashboard/registration-forms/${row.applicationId}`} className="text-brand hover:underline">
          #{row.applicationId}
        </Link>
      ) : (
        'Not recorded'
      ),
  },
  { key: 'attemptsUsed', label: 'Attempts Used', render: (row) => `${row.attemptsUsed} of ${row.attemptsPerCycle}` },
  { key: 'attemptsFailed', label: 'Failed', render: (row) => row.attemptsFailed },
  {
    key: 'status',
    label: 'Status',
    render: (row) => <StatusBadge {...(cycleBadges[row.status] ?? { status: row.status })} />,
  },
]

// What an admin needs to review a reapplication beyond the application itself: the
// existing account it belongs to, the earlier applications, the examination cycles and
// attempts, and what is verified with this application.
function ReapplicationReview({ application }) {
  const {
    student,
    previousApplications,
    attempts,
    attemptsPerCycle,
    cycles,
    exhaustedCycle,
    startedCycle,
    medicalReport,
    registrationPayment,
    legacyPayment,
    lockReason,
    practicalCycles = [],
  } = application.reapplication
  const practical = lockReason === 'PRACTICAL'

  const accountRows = student
    ? [
        { label: 'Student Name', value: student.name },
        { label: 'Driving School ID', value: `${student.drivingSchoolId} (kept: no new ID is issued)` },
        { label: 'User ID (internal)', value: `#${student.id}` },
        {
          label: 'Account Status',
          value: student.locked ? (
            <span data-account="locked">
              <StatusBadge status="REJECTED" label="Locked" />
              <span className="mt-1 block text-sm font-normal text-gray-600">
                Locked {student.lockedAt ? `since ${formatDateTime(student.lockedAt)} ` : ''}after
                three failed {practical ? 'practical driving tests' : 'examination attempts'}. Approving
                this application reactivates it.
              </span>
            </span>
          ) : (
            <span data-account="active">
              <StatusBadge status="APPROVED" label={student.accountStatus === 'active' ? 'Active' : 'Inactive'} />
            </span>
          ),
        },
      ]
    : [{ label: 'Student Account', value: 'The account of this application no longer exists.' }]

  const verificationRows = [
    {
      label: 'New Medical Report',
      value:
        medicalReport.confirmed || medicalReport.uploaded ? (
          <span data-verification="medical-report" data-confirmed={medicalReport.confirmed}>
            <StatusBadge status={medicalReport.status} label={verificationLabels[medicalReport.status]} />
            <span className="mt-1 block text-sm font-normal text-gray-600">
              {medicalReport.confirmed
                ? "The student confirmed obtaining a new medical report. Verify it through the school's usual process before approving."
                : 'Uploaded with this application: see the documents below.'}
            </span>
          </span>
        ) : (
          'Not confirmed'
        ),
    },
    {
      label: 'Registration Payment',
      value: registrationPayment.receiptSubmitted ? (
        <span data-verification="registration-payment">
          <StatusBadge status={registrationPayment.status} label={verificationLabels[registrationPayment.status]} />
          <span className="mt-1 block text-sm font-normal text-gray-600">
            {formatPrice(application.minimumPayment)} minimum for {application.packageName} (
            {formatPrice(application.packagePrice)}) by {getPaymentMethodLabel(application.paymentMethod)}.
            The receipt is among the documents below.
          </span>
        </span>
      ) : (
        'No receipt submitted'
      ),
    },
    ...(startedCycle
      ? [{ label: 'New Attempt Cycle', value: `Cycle ${startedCycle.cycleNumber}: started on approval with ${attemptsPerCycle} attempts` }]
      : []),
  ]

  return (
    <>
      <p
        data-reapplication-banner
        className="flex items-start gap-3 rounded-2xl border border-danger/20 bg-danger-soft px-5 py-4 font-semibold text-danger-dark"
      >
        <FaTriangleExclamation aria-hidden="true" className="mt-1 shrink-0" />
        {practical
          ? `Reapplication after ${attemptsPerCycle} failed practical driving tests. Approval starts a new practical training cycle.`
          : `Reapplication after ${attemptsPerCycle} failed examination attempts${exhaustedCycle ? ` (cycle ${exhaustedCycle.cycleNumber})` : ''}.`} This is a new registration
        application for an existing student account.
      </p>

      <DashboardSection title="Existing Student Account" icon={FaFolderOpen}>
        <Rows rows={accountRows} />
        <dl className="border-t border-gray-100">
        <div className={rowClass}>
          <dt className="text-sm font-medium text-gray-500">Previous Applications</dt>
          <dd className="font-medium text-ink">
            {previousApplications.length === 0 ? (
              'None on record'
            ) : (
              <ul className="flex flex-col gap-2" data-previous-applications>
                {previousApplications.map((previous) => (
                  <li key={previous.id} className="flex flex-wrap items-center gap-2">
                    <Link
                      to={`/admin-dashboard/registration-forms/${previous.id}`}
                      className="inline-flex items-center gap-1.5 text-brand hover:underline"
                    >
                      #{previous.id} · {typeLabels[previous.type] ?? previous.type}
                      <FaArrowUpRightFromSquare aria-hidden="true" className="text-xs" />
                    </Link>
                    <StatusBadge status={previous.status} />
                    <span className="text-sm font-normal text-gray-500">
                      {formatDateTime(previous.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </dd>
        </div>
        </dl>
      </DashboardSection>

      <DashboardSection title="New Medical Report and Registration Payment" icon={FaClipboardCheck}>
        <Rows rows={verificationRows} />
        {legacyPayment && (
          <p className="mt-3 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600" data-legacy-payment={legacyPayment.status}>
            Submitted before the reattempt fee for a third failure was dropped: a{' '}
            {formatFee(legacyPayment.feeAmount)} payment record (
            <Link
              to={`/admin-dashboard/notifications/reattempt-payments/${legacyPayment.id}`}
              className="text-brand hover:underline"
            >
              #{legacyPayment.id}
            </Link>
            , {verificationLabels[legacyPayment.status]}) is decided with this application.
          </p>
        )}
      </DashboardSection>

      {practicalCycles.length > 0 && (
        <DashboardSection title="Practical Driving Test History" icon={FaClockRotateLeft}>
          <ul className="flex flex-col gap-3" data-practical-history>
            {practicalCycles.map((cycle) => (
              <li key={cycle.cycleNumber} className="rounded-xl border border-gray-200 p-3">
                <p className="mb-2 font-semibold text-ink">
                  Practical cycle {cycle.cycleNumber}:{' '}
                  {cycle.attempts.filter((attempt) => attempt.result === 'FAILED').length} failed of{' '}
                  {cycle.attempts.length} attempt(s) · {cycle.status}
                </p>
                {cycle.attempts.length === 0 ? (
                  <p className="text-sm text-gray-600">No practical test taken in this cycle.</p>
                ) : (
                  <ul className="flex flex-col gap-1 text-sm">
                    {cycle.attempts.map((attempt) => (
                      <li key={attempt.id} className="flex flex-wrap items-center gap-2">
                        Attempt {attempt.attemptNumber} · {attempt.testDate}
                        <StatusBadge status={attempt.result === 'PENDING' ? 'PENDING' : attempt.result} label={attempt.result === 'PENDING' ? 'Scheduled' : attempt.result === 'PASSED' ? 'Passed' : 'Failed'} />
                        {attempt.remarks && <span className="text-gray-600">{attempt.remarks}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </DashboardSection>
      )}

      <DashboardSection title="Previous Examination History" icon={FaClockRotateLeft}>
        {exhaustedCycle && (
          <p className="mb-4 text-ink" data-failed-attempts={exhaustedCycle.attemptsFailed}>
            <span className="font-semibold">Failed attempts in cycle {exhaustedCycle.cycleNumber}:</span>{' '}
            {exhaustedCycle.attemptsFailed} of {attemptsPerCycle}
          </p>
        )}
        <DashboardTable
          caption="Examination cycles"
          columns={cycleColumns}
          rows={cycles.map((cycle) => ({ ...cycle, id: cycle.cycleNumber, attemptsPerCycle }))}
        />
        <h3 className="mt-6 mb-2 font-semibold text-ink">All Attempts</h3>
        <AttemptHistoryTable attempts={attempts} />
      </DashboardSection>
    </>
  )
}

export default ReapplicationReview
