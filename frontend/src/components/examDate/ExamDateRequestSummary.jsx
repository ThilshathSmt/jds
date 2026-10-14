import { FaCircleCheck } from 'react-icons/fa6'
import StatusBadge from '../dashboard/StatusBadge'
import { formatExamDate, requestStatusLabels } from '../../utils/examDateUtils'
import { formatDateTime } from '../../utils/formatUtils'
import { formatAttempt, resultLabels } from '../../utils/licenceExamUtils'

// Everything about one exam date request as label / value rows, for the student and the
// admin alike. `showStudent` adds the student's name and Driving School ID (admin pages).
// An approved request also shows its examination result (`request.result`).
function ExamDateRequestSummary({ request, showStudent = false }) {
  const { result } = request
  const recorded = result && result.status !== 'PENDING'
  const rows = [
    { label: 'Request ID', value: `#${request.id}` },
    ...(showStudent
      ? [
          { label: 'Student Name', value: request.studentName },
          { label: 'Driving School ID', value: request.drivingSchoolId },
        ]
      : []),
    {
      label: 'Status',
      value: <StatusBadge status={request.status} label={requestStatusLabels[request.status]} />,
    },
    {
      label: 'Medical Report',
      value: request.medicalReportSubmitted ? 'Submitted (confirmed by the student)' : 'Not submitted',
    },
    {
      label: 'Preferred Dates',
      value: (
        <ol className="flex flex-col gap-1.5">
          {request.preferredDates.map((date, index) => (
            <li key={date} className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-500">{index + 1}.</span>
              {formatExamDate(date)}
              {date === request.approvedDate && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-semibold text-white">
                  <FaCircleCheck aria-hidden="true" />
                  Confirmed
                </span>
              )}
            </li>
          ))}
        </ol>
      ),
    },
    ...(request.status === 'APPROVED'
      ? [{ label: 'Confirmed Exam Date', value: formatExamDate(request.approvedDate) }]
      : []),
    ...(request.status === 'REJECTED'
      ? [{ label: 'Rejection Reason', value: request.rejectionReason }]
      : []),
    ...(result
      ? [
          {
            label: 'Examination Result',
            value: <StatusBadge status={result.status} label={resultLabels[result.status]} />,
          },
        ]
      : []),
    ...(recorded
      ? [
          {
            label: 'Attempt',
            value: `${formatAttempt(result.attemptNumber, result.attemptsPerCycle)} (attempt cycle ${result.cycleNumber})`,
          },
          { label: 'Result Recorded', value: formatDateTime(result.recordedAt) },
        ]
      : []),
    { label: 'Submitted', value: formatDateTime(request.createdAt) },
    ...(request.reviewedAt ? [{ label: 'Reviewed', value: formatDateTime(request.reviewedAt) }] : []),
  ]

  return (
    <dl className="divide-y divide-gray-100" data-request-status={request.status}>
      {rows.map(({ label, value }) => (
        <div key={label} className="grid gap-1 py-3 sm:grid-cols-[12rem_1fr] sm:gap-4">
          <dt className="text-sm font-medium text-gray-500">{label}</dt>
          <dd className="font-medium break-words text-ink">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

export default ExamDateRequestSummary
