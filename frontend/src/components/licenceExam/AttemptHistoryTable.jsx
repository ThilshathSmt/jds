import DashboardTable from '../dashboard/DashboardTable'
import StatusBadge from '../dashboard/StatusBadge'
import { formatExamDate } from '../../utils/examDateUtils'
import { formatDateTime } from '../../utils/formatUtils'
import { formatAttempt, resultLabels } from '../../utils/licenceExamUtils'

const columns = [
  { key: 'cycleNumber', label: 'Cycle', render: (row) => `Cycle ${row.cycleNumber}` },
  {
    key: 'attemptNumber',
    label: 'Attempt',
    render: (row) => formatAttempt(row.attemptNumber, row.attemptsPerCycle),
  },
  { key: 'examDate', label: 'Examination Date', render: (row) => formatExamDate(row.examDate) },
  {
    key: 'result',
    label: 'Result',
    render: (row) => <StatusBadge status={row.result} label={resultLabels[row.result]} />,
  },
  { key: 'recordedAt', label: 'Recorded', render: (row) => formatDateTime(row.recordedAt) },
]

// Every examination a student has sat, across all attempt cycles, oldest first
function AttemptHistoryTable({ attempts }) {
  if (attempts.length === 0) {
    return <p className="py-4 text-gray-600">No examination results have been recorded yet.</p>
  }
  return <DashboardTable caption="Examination attempts" columns={columns} rows={attempts} />
}

export default AttemptHistoryTable
