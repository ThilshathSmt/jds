import ProgressBar from '../dashboard/ProgressBar'
import StatusBadge from '../dashboard/StatusBadge'
import { formatFee } from '../../utils/licenceExamUtils'
import {
  formatDay,
  practicalResultLabels,
  progressPercent,
  testStateLabels,
} from '../../utils/practicalUtils'

const resultBadge = { PENDING: 'PENDING', PASSED: 'PASSED', FAILED: 'FAILED' }

// The key facts of a practical cycle: the original provisional date and the final date
// (kept apart), lesson progress, the practical test attempts and the current state.
// Shared by the student's Lessons page, the notification details and the admin page.
function PracticalSummary({ cycle, showMessage = true }) {
  const { progress, test } = cycle
  const facts = [
    { label: 'Practical training cycle', value: `Cycle ${cycle.cycleNumber}` },
    ...(cycle.examDate ? [{ label: 'Driving school exam passed on', value: formatDay(cycle.examDate) }] : []),
    {
      label: 'Original provisional test date',
      value: cycle.provisionalTestDate
        ? `${formatDay(cycle.provisionalTestDate)} (90 days after the exam; weekends move to Monday)`
        : 'None for this cycle: the school sets the date',
    },
    {
      label: 'Final practical test date',
      value: cycle.finalTestDate ? formatDay(cycle.finalTestDate) : 'To be confirmed by the school',
    },
    { label: 'Practical test attempts used', value: `${test.attemptsUsed} of ${test.attemptsPerCycle}` },
    {
      label: 'Status',
      value: <StatusBadge status={test.state === 'PASSED' ? 'PASSED' : test.state === 'EXHAUSTED' ? 'REJECTED' : 'NEW'} label={testStateLabels[test.state]} />,
    },
  ]

  return (
    <div data-practical-state={test.state}>
      <dl className="divide-y divide-gray-100 rounded-xl border border-gray-200 px-4">
        {facts.map(({ label, value }) => (
          <div key={label} className="grid gap-1 py-3 sm:grid-cols-[16rem_1fr] sm:gap-4">
            <dt className="text-sm font-medium text-gray-500">{label}</dt>
            <dd className="font-semibold break-words text-ink">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-4">
        <p className="mb-2 text-sm font-semibold text-ink" data-lessons-completed={progress.attended}>
          {progress.attended} of {progress.total} lessons completed
          <span className="font-normal text-gray-600">
            {' '}
            · {progress.absent} missed · {progress.total - progress.attended - progress.absent} remaining
          </span>
        </p>
        <ProgressBar value={progressPercent(progress)} label="Lessons completed" />
      </div>

      {cycle.attempts.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2">
          {cycle.attempts.map((attempt) => (
            <li key={attempt.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm">
              <span className="font-semibold text-ink">
                Practical test attempt {attempt.attemptNumber} of {attempt.attemptsPerCycle}
              </span>
              <span className="text-gray-600">{formatDay(attempt.testDate)}</span>
              <StatusBadge status={resultBadge[attempt.result]} label={practicalResultLabels[attempt.result]} />
              {attempt.reattemptFee && (
                <span className="text-gray-600">Reattempt fee: {formatFee(attempt.reattemptFee)}</span>
              )}
              {attempt.remarks && <span className="w-full text-gray-600">Remarks: {attempt.remarks}</span>}
            </li>
          ))}
        </ul>
      )}

      {showMessage && (
        <p className="mt-4 rounded-lg bg-brand-soft px-4 py-3 font-medium text-ink">{test.message}</p>
      )}
    </div>
  )
}

export default PracticalSummary
