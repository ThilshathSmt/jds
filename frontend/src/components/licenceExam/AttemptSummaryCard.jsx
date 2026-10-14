import { Link } from 'react-router-dom'
import {
  FaArrowRight,
  FaCalendarCheck,
  FaCircleCheck,
  FaCircleInfo,
  FaHourglassHalf,
  FaMoneyBillWave,
  FaTriangleExclamation,
} from 'react-icons/fa6'
import StatusBadge from '../dashboard/StatusBadge'
import { formatExamDate } from '../../utils/examDateUtils'
import {
  DATE_REQUEST_PATH,
  REATTEMPT_PAYMENT_PATH,
  formatAttempt,
  formatFee,
  medicalReportLabels,
  paymentStatusLabels,
  resultLabels,
} from '../../utils/licenceExamUtils'

// How each state of the summary is presented. The state itself is the backend's.
const states = {
  CAN_REQUEST: { tone: 'info', icon: FaCircleInfo, action: 'Request an examination date' },
  DATE_REQUEST_PENDING: {
    tone: 'pending',
    icon: FaHourglassHalf,
    title: 'Examination date requested',
    action: 'Wait for the school to review your request',
  },
  RESULT_PENDING: {
    tone: 'pending',
    icon: FaCalendarCheck,
    title: 'Examination date approved: result pending',
    action: 'Sit your examination',
  },
  PASSED: { tone: 'success', icon: FaCircleCheck, title: 'Passed', action: 'None: you have passed' },
  REATTEMPT_PAYMENT_REQUIRED: {
    tone: 'danger',
    icon: FaTriangleExclamation,
    title: 'Reattempt payment required',
    action: 'Pay the reattempt fee',
  },
  REATTEMPT_PAYMENT_PENDING: {
    tone: 'pending',
    icon: FaHourglassHalf,
    title: 'Reattempt payment pending admin verification',
    action: 'Wait for the school to verify your payment',
  },
  REATTEMPT_PAYMENT_REJECTED: {
    tone: 'danger',
    icon: FaTriangleExclamation,
    title: 'Reattempt payment rejected',
    action: 'Submit your payment again',
  },
  // A locked account cannot open this panel; listed so that every state has a presentation
  REAPPLICATION_REQUIRED: {
    tone: 'danger',
    icon: FaTriangleExclamation,
    title: 'Account locked: new application required',
    action: 'Submit a new registration application',
  },
  REAPPLICATION_PENDING: {
    tone: 'pending',
    icon: FaHourglassHalf,
    title: 'New application awaiting review',
    action: 'Wait for the school to review your application',
  },
  REAPPLICATION_REJECTED: {
    tone: 'danger',
    icon: FaTriangleExclamation,
    title: 'New application rejected',
    action: 'Submit a new registration application',
  },
}

const tones = {
  info: 'bg-brand-soft text-ink',
  pending: 'bg-amber-50 text-amber-900',
  success: 'border border-emerald-200 bg-emerald-50 text-emerald-800',
  danger: 'bg-danger-soft text-danger-dark',
}

const primaryLink = 'btn btn-primary shrink-0 !rounded-lg !px-5 !py-2.5'
const secondaryLink = 'btn btn-outline shrink-0 !rounded-lg !px-5 !py-2.5'

// The action offered for the current state, if any: where the student goes next.
// `onNavigate` is called when it is used (to close a dialog it is shown in).
export function NextActionLink({ summary, onNavigate }) {
  if (summary.canRequestDate) {
    return (
      <Link to={DATE_REQUEST_PATH} onClick={onNavigate} className={primaryLink}>
        <FaCalendarCheck aria-hidden="true" />
        Request Exam Date
        <FaArrowRight aria-hidden="true" />
      </Link>
    )
  }
  if (summary.canPayReattemptFee) {
    return (
      <Link to={REATTEMPT_PAYMENT_PATH} onClick={onNavigate} className={primaryLink}>
        <FaMoneyBillWave aria-hidden="true" />
        Pay Reattempt Fee
      </Link>
    )
  }
  if (summary.status === 'REATTEMPT_PAYMENT_PENDING') {
    return (
      <Link to={REATTEMPT_PAYMENT_PATH} onClick={onNavigate} className={secondaryLink}>
        View Payment Status
      </Link>
    )
  }
  if (summary.status === 'DATE_REQUEST_PENDING' || summary.status === 'RESULT_PENDING') {
    return (
      <Link to={DATE_REQUEST_PATH} onClick={onNavigate} className={secondaryLink}>
        View Exam Date Request
      </Link>
    )
  }
  return null
}

// The payment badge colours follow the statuses StatusBadge already knows
const paymentBadgeStatus = { REQUIRED: 'REJECTED', NOT_REQUIRED: 'Completed' }

// Where a student stands with the physical driving licence examination: the cycle, the
// attempts used and left, the last result, what is owed and what to do next. Everything
// shown is the backend's, read from the recorded results and payments.
function AttemptSummaryCard({ summary }) {
  const { tone, icon: StateIcon, title, action } = states[summary.status]
  const { lastResult, paymentStatus } = summary

  const figures = [
    { key: 'cycle', label: 'Attempt cycle', value: summary.cycleNumber },
    { key: 'used', label: 'Attempts used', value: `${summary.attemptsUsed} of ${summary.attemptsPerCycle}` },
    { key: 'remaining', label: 'Attempts remaining', value: summary.passed ? '–' : summary.attemptsRemaining },
  ]
  const details = [
    {
      key: 'lastResult',
      label: 'Last examination result',
      value: lastResult ? (
        <>
          <StatusBadge status={lastResult.status} label={resultLabels[lastResult.status]} />
          <span className="mt-1 block text-sm font-normal text-gray-600">
            {formatAttempt(lastResult.attemptNumber, summary.attemptsPerCycle)}, cycle{' '}
            {lastResult.cycleNumber}, {formatExamDate(lastResult.examDate)}
          </span>
        </>
      ) : (
        'No examination yet'
      ),
    },
    {
      key: 'fee',
      label: 'Reattempt fee (after a 1st or 2nd failed attempt)',
      value: formatFee(summary.reattemptFee),
    },
    {
      key: 'payment',
      label: 'Payment verification',
      value: (
        <StatusBadge
          status={paymentBadgeStatus[paymentStatus] ?? paymentStatus}
          label={paymentStatusLabels[paymentStatus]}
        />
      ),
    },
    { key: 'medical', label: 'Medical report', value: medicalReportLabels[summary.medicalReport] },
    { key: 'action', label: 'Next action', value: action },
  ]

  return (
    <section
      aria-labelledby="attempt-summary-title"
      data-attempt-status={summary.status}
      data-payment-status={paymentStatus}
      className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8"
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-3xl text-brand">
          <FaCalendarCheck aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="attempt-summary-title" className="text-xl font-extrabold text-ink sm:text-2xl">
            Driving Licence Examination
          </h2>
          <p className="mt-1 text-gray-600">
            Your attempts at the physical driving licence examination and what to do next.
          </p>
        </div>
      </div>

      <dl className="mt-6 grid gap-3 sm:grid-cols-3">
        {figures.map(({ key, label, value }) => (
          <div key={key} className="rounded-xl bg-gray-50 px-4 py-3">
            <dt className="text-xs font-semibold tracking-wide text-gray-500 uppercase">{label}</dt>
            <dd data-attempt-figure={key} className="mt-1 text-2xl font-extrabold text-ink">
              {value}
            </dd>
          </div>
        ))}
      </dl>

      <dl className="mt-3 divide-y divide-gray-100 rounded-xl border border-gray-200 px-4">
        {details.map(({ key, label, value }) => (
          <div key={key} className="grid gap-1 py-3 sm:grid-cols-[18rem_1fr] sm:gap-4">
            <dt className="text-sm font-medium text-gray-500">{label}</dt>
            <dd data-attempt-figure={key} className="font-semibold text-ink">
              {value}
            </dd>
          </div>
        ))}
      </dl>

      <div className={`mt-5 flex items-start gap-3 rounded-lg px-4 py-3 ${tones[tone]}`}>
        <StateIcon aria-hidden="true" className="mt-1 shrink-0" />
        <div className="min-w-0">
          {title && <p className="font-bold">{title}</p>}
          <p data-attempt-message className="font-medium">
            {summary.message}
          </p>
          {summary.activeRequest?.approvedDate && (
            <p className="mt-1 text-sm">
              Examination date: {formatExamDate(summary.activeRequest.approvedDate)}
            </p>
          )}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap justify-end gap-3">
        <NextActionLink summary={summary} />
      </div>
    </section>
  )
}

export default AttemptSummaryCard
