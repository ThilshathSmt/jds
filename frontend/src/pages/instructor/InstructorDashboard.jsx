import { useOutletContext } from 'react-router-dom'
import { FaCalendarDay, FaGaugeHigh, FaUserGraduate } from 'react-icons/fa6'
import DashboardSection from '../../components/dashboard/DashboardSection'
import DashboardTable from '../../components/dashboard/DashboardTable'
import DashboardWelcome from '../../components/dashboard/DashboardWelcome'
import ProgressBar from '../../components/dashboard/ProgressBar'
import { StatCardGrid } from '../../components/dashboard/StatCard'
import StatusBadge from '../../components/dashboard/StatusBadge'
import {
  instructorStats,
  recentStudents,
  todaysSchedule,
} from '../../data/instructorDashboardData'

const studentColumns = [
  { key: 'student', label: 'Student Name' },
  { key: 'course', label: 'Course' },
  {
    key: 'progress',
    label: 'Progress',
    render: (row) => <ProgressBar value={row.progress} label={`${row.student} progress`} />,
  },
  { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
]

function InstructorDashboard() {
  const { user } = useOutletContext()

  return (
    <>
      <DashboardWelcome
        title="Instructor Dashboard"
        message={`Welcome back, ${user.name}!`}
        user={user}
        icon={FaGaugeHigh}
      />
      <StatCardGrid stats={instructorStats} />

      <div className="grid gap-6 xl:grid-cols-3">
        <DashboardSection title="Today's Schedule" icon={FaCalendarDay}>
          <ul className="flex flex-col gap-3">
            {todaysSchedule.map(({ id, time, student, course, status }) => (
              <li
                key={id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-l-4 border-brand bg-gray-50 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold text-brand">{time}</p>
                  <p className="font-semibold text-ink">{student}</p>
                  <p className="text-sm text-gray-600">{course}</p>
                </div>
                <StatusBadge status={status} />
              </li>
            ))}
          </ul>
        </DashboardSection>

        <DashboardSection title="Recent Students" icon={FaUserGraduate} className="xl:col-span-2">
          <DashboardTable caption="Recent students" columns={studentColumns} rows={recentStudents} />
        </DashboardSection>
      </div>
    </>
  )
}

export default InstructorDashboard
