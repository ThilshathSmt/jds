import DashboardTable from '../dashboard/DashboardTable'
import StatusBadge from '../dashboard/StatusBadge'
import { getResponsibilityLabel } from '../../data/instructorData'
import { attendanceBadge, attendanceLabels, formatLessonWhen } from '../../utils/practicalUtils'

// The 10 lessons of a practical cycle, read-only. The vehicle is the responsibility of the
// lesson's instructor.
const columns = [
  { key: 'lessonNumber', label: 'Lesson', render: (row) => `Lesson ${row.lessonNumber}` },
  { key: 'when', label: 'Date & Time', render: formatLessonWhen },
  { key: 'location', label: 'Location', render: (row) => row.location || '–' },
  {
    key: 'instructor',
    label: 'Instructor',
    render: (row) => (row.instructor ? `${row.instructor.name} (${row.instructor.drivingSchoolId})` : 'Not assigned'),
  },
  {
    key: 'vehicle',
    label: 'Vehicle',
    render: (row) => getResponsibilityLabel(row.instructor?.responsibility) ?? '–',
  },
  {
    key: 'attendance',
    label: 'Attendance',
    render: (row) => <StatusBadge status={attendanceBadge[row.attendance]} label={attendanceLabels[row.attendance]} />,
  },
]

function LessonScheduleTable({ lessons }) {
  return <DashboardTable caption="Practical lessons" columns={columns} rows={lessons} />
}

export default LessonScheduleTable
