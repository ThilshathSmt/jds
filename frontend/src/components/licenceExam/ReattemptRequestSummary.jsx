import { FaDownload, FaEye } from 'react-icons/fa6'
import StatusBadge from '../dashboard/StatusBadge'
import { paymentMethods } from '../../data/registrationData'
import { getReattemptDocumentUrl } from '../../services/licenceExamApi'
import { formatExamDate } from '../../utils/examDateUtils'
import { formatDateTime } from '../../utils/formatUtils'
import {
  formatAttempt,
  formatFee,
  formatFileSize,
  reattemptDocumentLabels,
  resultLabels,
  verificationLabels,
} from '../../utils/licenceExamUtils'

const linkClass =
  'inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-ink transition hover:border-brand hover:text-brand'

const badge = (status) => <StatusBadge status={status} label={verificationLabels[status]} />

const getPaymentMethodLabel = (id) => paymentMethods.find((method) => method.id === id)?.label ?? id

// Everything about one reattempt payment as label / value rows, for the student and the
// admin alike: the failed attempt it pays for, the fee, what was submitted and what the
// school decided. `role` decides which document links are used: the backend serves a
// document only to an admin or to the student it belongs to.
// `showStudent` adds the student's name and Driving School ID (admin pages).
function ReattemptRequestSummary({ request, role, showStudent = false }) {
  const rows = [
    { label: 'Payment ID', value: `#${request.id}` },
    ...(showStudent
      ? [
          { label: 'Student Name', value: request.studentName },
          { label: 'Driving School ID', value: request.drivingSchoolId },
        ]
      : []),
    { label: 'Verification Status', value: badge(request.status) },
    {
      label: 'For Failed Attempt',
      value: request.attemptNumber
        ? `${formatAttempt(request.attemptNumber, request.attemptsPerCycle)} (attempt cycle ${request.cycleNumber})`
        : `Attempt cycle ${request.cycleNumber}`,
    },
    ...(request.examDate
      ? [{ label: 'Examination Date', value: formatExamDate(request.examDate) }]
      : []),
    ...(request.previousResult
      ? [
          {
            label: 'Examination Result',
            value: (
              <StatusBadge
                status={request.previousResult}
                label={resultLabels[request.previousResult]}
              />
            ),
          },
        ]
      : []),
    { label: 'Reattempt Fee', value: formatFee(request.feeAmount) },
    { label: 'Payment Method', value: getPaymentMethodLabel(request.paymentMethod) },
    { label: 'Payment Status', value: badge(request.paymentStatus) },
    {
      label: 'New Medical Report',
      value: request.medicalReportRequired ? (
        <>
          {badge(request.medicalReportStatus)}
          <span className="mt-1 block text-sm font-normal text-gray-600">
            Required: this was the last attempt of attempt cycle {request.cycleNumber}.
            {request.newCycleNumber && ` Approval starts attempt cycle ${request.newCycleNumber}.`}
          </span>
        </>
      ) : (
        'Not required for this attempt'
      ),
    },
    ...(request.status === 'REJECTED'
      ? [{ label: 'Rejection Reason', value: request.rejectionReason }]
      : []),
    { label: 'Submitted', value: formatDateTime(request.createdAt) },
    ...(request.reviewedAt ? [{ label: 'Reviewed', value: formatDateTime(request.reviewedAt) }] : []),
    {
      label: 'Documents',
      value: request.documents.length === 0 ? (
        // The receipt of a third failure's payment is a document of the reapplication
        request.reapplicationId ? (
          `Submitted with reapplication #${request.reapplicationId}`
        ) : (
          'None'
        )
      ) : (
        <ul className="flex flex-col gap-3">
          {request.documents.map((document) => (
            <li key={document.id} className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-ink">
                  {reattemptDocumentLabels[document.type] ?? document.type}
                </p>
                <p className="truncate text-sm font-normal text-gray-500">
                  {document.originalName} ({formatFileSize(document.sizeBytes)})
                </p>
              </div>
              <div className="flex gap-2">
                <a
                  href={getReattemptDocumentUrl(role, request.id, document.id)}
                  target="_blank"
                  rel="noreferrer"
                  className={linkClass}
                >
                  <FaEye aria-hidden="true" />
                  View
                </a>
                <a
                  href={getReattemptDocumentUrl(role, request.id, document.id, { download: true })}
                  className={linkClass}
                >
                  <FaDownload aria-hidden="true" />
                  Download
                </a>
              </div>
            </li>
          ))}
        </ul>
      ),
    },
  ]

  return (
    <dl
      className="divide-y divide-gray-100"
      data-reattempt-status={request.status}
      data-payment-status={request.paymentStatus}
      data-medical-status={request.medicalReportStatus}
    >
      {rows.map(({ label, value }) => (
        <div key={label} className="grid gap-1 py-3 sm:grid-cols-[12rem_1fr] sm:gap-4">
          <dt className="text-sm font-medium text-gray-500">{label}</dt>
          <dd className="min-w-0 font-medium break-words text-ink">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

export default ReattemptRequestSummary
