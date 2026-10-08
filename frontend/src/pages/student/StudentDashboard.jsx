import { useOutletContext } from 'react-router-dom'
import { FaCalendarDay, FaClockRotateLeft, FaGaugeHigh } from 'react-icons/fa6'
import DashboardSection from '../../components/dashboard/DashboardSection'
import DashboardWelcome from '../../components/dashboard/DashboardWelcome'
import ProgressBar from '../../components/dashboard/ProgressBar'
import { StatCardGrid } from '../../components/dashboard/StatCard'
import StatusBadge from '../../components/dashboard/StatusBadge'
import {
  learningProgress,
  recentActivity,
  studentStats,
  upcomingLesson,
} from '../../data/studentDashboardData'

function StudentDashboard() {
  const { user } = useOutletContext()

  return (
    <>
      <DashboardWelcome
        title="Student Dashboard"
        message={`Welcome back, ${user.name}!`}
        user={user}
        icon={FaGaugeHigh}
      />
      <StatCardGrid stats={studentStats} />

      <div className="grid gap-6 lg:grid-cols-2">
        <DashboardSection
          title="Upcoming Lesson"
          icon={FaCalendarDay}
          aside={<StatusBadge status={upcomingLesson.status} />}
        >
          <dl className="grid gap-4 sm:grid-cols-2">
            {upcomingLesson.details.map(({ label, value }) => (
              <div key={label} className="rounded-xl bg-gray-50 px-4 py-3">
                <dt className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                  {label}
                </dt>
                <dd className="mt-1 font-semibold text-ink">{value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-6 border-t border-gray-100 pt-5">
            <p className="mb-2 text-sm font-semibold text-gray-700">Learning Progress</p>
            <ProgressBar value={learningProgress} label="Learning progress" />
          </div>
        </DashboardSection>

        <DashboardSection title="Recent Activity" icon={FaClockRotateLeft}>
          <ul className="flex flex-col gap-4">
            {recentActivity.map(({ id, title, detail, date, icon: Icon }) => (
              <li key={id} className="flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
                  <Icon aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1 border-b border-gray-100 pb-4">
                  <p className="font-semibold text-ink">{title}</p>
                  <p className="text-sm text-gray-600">{detail}</p>
                  <p className="mt-1 text-xs text-gray-500">{date}</p>
                </div>
              </li>
            ))}
          </ul>
        </DashboardSection>
      </div>
    </>
  )
}

export default StudentDashboard
