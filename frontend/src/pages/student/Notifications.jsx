import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  FaBell,
  FaCalendarCheck,
  FaCheckDouble,
  FaCircleCheck,
  FaEye,
  FaMoneyBillWave,
  FaTriangleExclamation,
} from 'react-icons/fa6'
import Modal from '../../components/admin/Modal'
import DashboardSection from '../../components/dashboard/DashboardSection'
import DashboardWelcome from '../../components/dashboard/DashboardWelcome'
import ExamDateRequestSummary from '../../components/examDate/ExamDateRequestSummary'
import { NextActionLink } from '../../components/licenceExam/AttemptSummaryCard'
import ReattemptRequestSummary from '../../components/licenceExam/ReattemptRequestSummary'
import PracticalSummary from '../../components/practical/PracticalSummary'
import { useNotifications } from '../../context/useNotifications'
import { getMyExamDateRequest } from '../../services/examDateRequestApi'
import { getMyLicenceExam, getMyReattemptRequest } from '../../services/licenceExamApi'
import { getMyPracticalCycle } from '../../services/practicalApi'
import { getMyReapplication } from '../../services/reapplicationApi'
import { formatExamDate } from '../../utils/examDateUtils'
import { formatDateTime } from '../../utils/formatUtils'
import { formatAttempt, formatFee } from '../../utils/licenceExamUtils'

const dialogClass = '!w-[min(40rem,calc(100vw-2rem))]'

// Loads what a details dialog shows: the request itself and where the student stands
// now (`summary`), which decides the next step offered. Resolves `{ request, summary }`.
const useDetails = (loadRequest, id) => {
  const [details, setDetails] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([loadRequest(id), getMyLicenceExam()])
      .then(([request, { summary }]) => active && setDetails({ request, summary }))
      .catch((loadError) => active && setError(loadError.message))
    return () => {
      active = false
    }
  }, [loadRequest, id])

  return { details, error }
}

function DialogBody({ details, error, children }) {
  if (details) return children
  return (
    <p role={error ? 'alert' : 'status'} className="py-6 text-center text-gray-600">
      {error || 'Loading details...'}
    </p>
  )
}

// What a recorded result means for the student: shown above the request it belongs to.
// `result` is that attempt; `summary` is the student's standing now, which decides the
// button offered (pay the fee, view the payment, request a date, ...).
function ResultDetails({ result, examDate, summary, onNavigate }) {
  const attempt = `${formatAttempt(result.attemptNumber, result.attemptsPerCycle)} (attempt cycle ${result.cycleNumber})`

  if (result.status === 'PASSED') {
    return (
      <div
        data-result="PASSED"
        className="mb-4 flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800"
      >
        <FaCircleCheck aria-hidden="true" className="mt-1 shrink-0" />
        <div>
          <p className="font-bold">Congratulations! You passed.</p>
          <p className="mt-1 text-sm">
            You passed your driving licence examination on {formatExamDate(examDate)}: {attempt}.
            No reattempt fee and no further examination requests are needed.
          </p>
        </div>
      </div>
    )
  }

  const facts = [
    { label: 'Examination date', value: formatExamDate(examDate) },
    { label: 'Failed attempt', value: attempt },
    {
      label: 'Attempts remaining in this cycle',
      value: `${result.attemptsRemaining} of ${result.attemptsPerCycle}`,
    },
    {
      label: 'Reattempt fee',
      // Charged after a first or second failure only: none after the last attempt of a cycle
      value: result.reattemptFee
        ? `${formatFee(result.reattemptFee)}: required before your next examination date`
        : 'Not charged: no attempt is left in this cycle',
    },
    {
      label: 'New application and medical report',
      value: result.reapplicationRequired
        ? `Required: this was your attempt ${result.attemptNumber} of ${result.attemptsPerCycle}`
        : `Not required: needed only after ${result.attemptsPerCycle} unsuccessful attempts`,
    },
  ]

  return (
    <div data-result="FAILED" className="mb-4 rounded-lg bg-danger-soft px-4 py-3 text-danger-dark">
      <p className="flex items-start gap-3 font-bold">
        <FaTriangleExclamation aria-hidden="true" className="mt-1 shrink-0" />
        This examination attempt was unsuccessful.
      </p>
      <dl className="mt-2 space-y-1 pl-7 text-sm">
        {facts.map(({ label, value }) => (
          <div key={label} className="flex flex-wrap gap-x-2">
            <dt className="font-semibold">{label}:</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      {/* A third failure locked the account until a new application was approved */}
      {result.reapplicationRequired && (
        <ul data-reapplication-required className="mt-3 list-disc space-y-1 pl-12 text-sm">
          <li>Your third attempt was unsuccessful, so your account was locked.</li>
          <li>
            A new registration application is mandatory: a new medical report, a package and the
            normal registration payment for it.
          </li>
          <li>No reattempt fee is charged for this attempt.</li>
          <li>You keep the same Driving School ID.</li>
          <li>Account access is restored after the school approves the new application.</li>
        </ul>
      )}
      {/* What the student can do now, which may differ from when this result was recorded */}
      <p className="mt-3 text-sm font-medium text-ink">{summary.message}</p>
      <div className="mt-3 flex justify-end">
        <NextActionLink summary={summary} onNavigate={onNavigate} />
      </div>
    </div>
  )
}

// The exam date request a notification is about, with its result once one is recorded
function RequestDialog({ requestId, onClose }) {
  const { details, error } = useDetails(getMyExamDateRequest, requestId)
  const recorded = details?.request.result && details.request.result.status !== 'PENDING'

  return (
    <Modal
      title={recorded ? 'Examination Result' : 'Exam Date Request'}
      icon={FaCalendarCheck}
      onClose={onClose}
      className={dialogClass}
    >
      <DialogBody details={details} error={error}>
        {recorded && (
          <ResultDetails
            result={details.request.result}
            examDate={details.request.approvedDate}
            summary={details.summary}
            onNavigate={onClose}
          />
        )}
        {details && <ExamDateRequestSummary request={details.request} />}
      </DialogBody>
    </Modal>
  )
}

// The reattempt payment a notification is about: what was decided and what comes next
function ReattemptRequestDialog({ reattemptRequestId, onClose }) {
  const { details, error } = useDetails(getMyReattemptRequest, reattemptRequestId)

  return (
    <Modal title="Reattempt Payment" icon={FaMoneyBillWave} onClose={onClose} className={dialogClass}>
      <DialogBody details={details} error={error}>
        {details && (
          <>
            <ReattemptRequestSummary request={details.request} role="student" />
            {details.request.status !== 'PENDING' && (
              <div className="mt-4 rounded-lg bg-gray-50 px-4 py-3">
                <p className="text-sm font-medium text-ink">{details.summary.message}</p>
                <div className="mt-3 flex justify-end">
                  <NextActionLink summary={details.summary} onNavigate={onClose} />
                </div>
              </div>
            )}
          </>
        )}
      </DialogBody>
    </Modal>
  )
}

const reapplicationStatusLabels = { NEW: 'Pending review', APPROVED: 'Approved', REJECTED: 'Rejected' }

// The reapplication a notification is about: the new application the student made while
// the account was locked, and what the school decided
function ReapplicationDialog({ reapplicationId, onClose }) {
  const { details, error } = useDetails(getMyReapplication, reapplicationId)
  const application = details?.request

  return (
    <Modal title="New Application" icon={FaCalendarCheck} onClose={onClose} className={dialogClass}>
      <DialogBody details={details} error={error}>
        {application && (
          <>
            {application.status === 'APPROVED' && (
              <p
                data-reapplication="APPROVED"
                className="mb-4 flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800"
              >
                <FaCircleCheck aria-hidden="true" className="mt-1 shrink-0" />
                <span>
                  <strong>Your new application was approved.</strong> Your account{' '}
                  {application.drivingSchoolId} is active again, with the same Driving School ID,
                  and you have a new cycle of examination attempts.
                </span>
              </p>
            )}
            <dl className="divide-y divide-gray-100" data-reapplication-status={application.status}>
              {[
                { label: 'Application', value: `#${application.id}` },
                { label: 'Driving School ID', value: application.drivingSchoolId },
                { label: 'Status', value: reapplicationStatusLabels[application.status] ?? application.status },
                ...(application.status === 'REJECTED'
                  ? [{ label: 'Rejection Reason', value: application.rejectionReason }]
                  : []),
                { label: 'Submitted', value: formatDateTime(application.createdAt) },
                ...(application.reviewedAt
                  ? [{ label: 'Reviewed', value: formatDateTime(application.reviewedAt) }]
                  : []),
              ].map(({ label, value }) => (
                <div key={label} className="grid gap-1 py-3 sm:grid-cols-[12rem_1fr] sm:gap-4">
                  <dt className="text-sm font-medium text-gray-500">{label}</dt>
                  <dd className="font-medium break-words text-ink">{value}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-4 rounded-lg bg-gray-50 px-4 py-3">
              <p className="text-sm font-medium text-ink">{details.summary.message}</p>
              <div className="mt-3 flex justify-end">
                <NextActionLink summary={details.summary} onNavigate={onClose} />
              </div>
            </div>
          </>
        )}
      </DialogBody>
    </Modal>
  )
}

const readId = (value) => (/^[1-9][0-9]*$/.test(value ?? '') ? Number(value) : null)

// Practical training and the practical test: the original and final test dates, lesson
// progress, attempts and what to do next. Loaded fresh, so it shows where things stand now.
function PracticalDialog({ cycleId, onClose }) {
  const [cycle, setCycle] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    getMyPracticalCycle(cycleId)
      .then((loaded) => active && setCycle(loaded))
      .catch((loadError) => active && setError(loadError.message))
    return () => {
      active = false
    }
  }, [cycleId])
  return (
    <Modal title="Practical Training Details" icon={FaCalendarCheck} onClose={onClose} className={dialogClass}>
      {!cycle ? (
        <p role={error ? 'alert' : 'status'} className="py-6 text-center text-gray-600">
          {error || 'Loading details...'}
        </p>
      ) : (
        <>
          <PracticalSummary cycle={cycle} />
          <p className="mt-4 text-sm text-gray-700">
            The final practical test date is the one confirmed by the school. Please prepare well,
            and contact the school if you cannot attend on that date. Your lesson schedule and
            progress are on the Lessons page.
          </p>
          <div className="mt-5 flex justify-end">
            <Link to="/student-dashboard/lessons" className="btn btn-primary !rounded-lg !px-5 !py-2">
              Go to Lessons
            </Link>
          </div>
        </>
      )}
    </Modal>
  )
}

// Student-only page: every notification sent to the signed-in student. The list shows a
// short line for each; "View details" opens what it is about. The bell links here with
// ?request=<id> (an exam date request or its result), ?payment=<id> (a reattempt payment)
// or ?reapplication=<id> (a new application made while the account was locked).
function Notifications() {
  const { notifications, unreadCount, loading, error, markRead, markAllRead } = useNotifications()
  const [searchParams, setSearchParams] = useSearchParams()
  const [actionError, setActionError] = useState('')
  // The dialog follows the address, so the bell's "View" and the browser's Back both work
  const openRequestId = readId(searchParams.get('request'))
  const openReattemptRequestId = readId(searchParams.get('payment'))
  const openReapplicationId = readId(searchParams.get('reapplication'))
  const openPracticalId = readId(searchParams.get('practical'))

  const run = (action) => {
    setActionError('')
    action().catch((failure) => setActionError(failure.message))
  }

  const viewDetails = (notification) => {
    if (!notification.read) run(() => markRead(notification.id))
    setSearchParams(
      notification.practicalCycleId
        ? { practical: String(notification.practicalCycleId) }
        : notification.registrationApplicationId
        ? { reapplication: String(notification.registrationApplicationId) }
        : notification.examReattemptRequestId
          ? { payment: String(notification.examReattemptRequestId) }
          : { request: String(notification.examDateRequestId) },
    )
  }
  const closeDialog = () => setSearchParams({})

  return (
    <>
      <DashboardWelcome
        title="Notifications"
        message="Updates from Jeslan Driving School about your requests."
        icon={FaBell}
      />

      <DashboardSection
        title={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : 'Notifications'}
        icon={FaBell}
        aside={
          unreadCount > 0 && (
            <button
              type="button"
              onClick={() => run(markAllRead)}
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-ink transition hover:border-brand hover:text-brand"
            >
              <FaCheckDouble aria-hidden="true" />
              Mark all as read
            </button>
          )
        }
      >
        {(actionError || error) && (
          <p role="alert" className="mb-4 rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger-dark">
            {actionError || error}
          </p>
        )}
        {notifications.length === 0 ? (
          <p role="status" className="py-8 text-center text-gray-600">
            {loading ? 'Loading notifications...' : !error && 'You have no notifications yet.'}
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {notifications.map((notification) => (
              <li
                key={notification.id}
                data-read={notification.read}
                data-type={notification.type}
                className={`flex flex-col gap-3 rounded-xl border px-4 py-4 sm:flex-row sm:items-start sm:px-5 ${
                  notification.read ? 'border-gray-200 bg-white' : 'border-brand/30 bg-brand-soft/50'
                }`}
              >
                <span
                  className={`mt-2 hidden h-2.5 w-2.5 shrink-0 rounded-full sm:block ${notification.read ? 'bg-gray-300' : 'bg-brand'}`}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-ink">
                    {notification.title}
                    {!notification.read && (
                      <span className="ml-2 rounded-full bg-brand px-2 py-0.5 align-middle text-xs font-semibold text-white">
                        New
                      </span>
                    )}
                  </p>
                  <p className="mt-1 break-words text-gray-700">{notification.message}</p>
                  <p className="mt-2 text-xs text-gray-500">{formatDateTime(notification.createdAt)}</p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {(notification.practicalCycleId ||
                    notification.examDateRequestId ||
                    notification.examReattemptRequestId ||
                    notification.registrationApplicationId) && (
                    <button
                      type="button"
                      onClick={() => viewDetails(notification)}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-ink transition hover:border-brand hover:text-brand"
                    >
                      <FaEye aria-hidden="true" />
                      View details
                    </button>
                  )}
                  {!notification.read && (
                    <button
                      type="button"
                      onClick={() => run(() => markRead(notification.id))}
                      className="cursor-pointer rounded-lg px-3 py-1.5 text-sm font-semibold text-brand transition hover:bg-brand-soft"
                    >
                      Mark as read
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </DashboardSection>

      {openPracticalId && (
        <PracticalDialog key={`practical-${openPracticalId}`} cycleId={openPracticalId} onClose={closeDialog} />
      )}
      {openRequestId && (
        <RequestDialog key={`request-${openRequestId}`} requestId={openRequestId} onClose={closeDialog} />
      )}
      {openReapplicationId && !openRequestId && !openReattemptRequestId && (
        <ReapplicationDialog
          key={`reapplication-${openReapplicationId}`}
          reapplicationId={openReapplicationId}
          onClose={closeDialog}
        />
      )}
      {openReattemptRequestId && !openRequestId && (
        <ReattemptRequestDialog
          key={`payment-${openReattemptRequestId}`}
          reattemptRequestId={openReattemptRequestId}
          onClose={closeDialog}
        />
      )}
    </>
  )
}

export default Notifications
