import { useOutletContext } from 'react-router-dom'
import { FaCalendarDay, FaClockRotateLeft, FaGaugeHigh, FaCar, FaClipboardCheck, FaChartLine, FaCircleCheck, FaMoneyBillWave } from 'react-icons/fa6'
import DashboardSection from '../../components/dashboard/DashboardSection'
import DashboardWelcome from '../../components/dashboard/DashboardWelcome'
import DashboardLoadState from '../../components/dashboard/DashboardLoadState'
import ProgressBar from '../../components/dashboard/ProgressBar'
import { StatCardGrid } from '../../components/dashboard/StatCard'
import StatusBadge from '../../components/dashboard/StatusBadge'
import useDashboardData from '../../components/dashboard/useDashboardData'
import { getStudentDashboard } from '../../services/dashboardApi'

const dateText = (value) => value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`)) : 'Not scheduled'
const timeText = (value) => value ? new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }).format(new Date(`1970-01-01T${value}:00Z`)) : 'Not set'

function StudentDashboard() {
  const { user } = useOutletContext()
  const { data, loading, error, refresh } = useDashboardData(getStudentDashboard)
  const stats = data ? [
    { label: 'My Course', value: data.course || 'Not assigned', description: 'Enrolled course', icon: FaCar },
    { label: 'Lessons Completed', value: String(data.lessonsCompleted), description: 'Practical lessons', icon: FaClipboardCheck },
    { label: 'Upcoming Lessons', value: String(data.upcomingLessons), description: 'Scheduled lessons', icon: FaCalendarDay },
    { label: 'Learning Progress', value: `${data.progress}%`, description: `${data.progressRequirement} practical lessons required`, icon: FaChartLine },
  ] : []
  return <>
    <DashboardWelcome title="Student Dashboard" message={`Welcome back, ${user.name}!`} user={user} icon={FaGaugeHigh} />
    <DashboardLoadState loading={loading} error={error} onRetry={refresh} />
    {data && <>
      <StatCardGrid stats={stats} />
      <div className="grid gap-6 lg:grid-cols-2">
        <DashboardSection title="Upcoming Lesson" icon={FaCalendarDay} aside={data.upcomingLesson && <StatusBadge status={data.upcomingLesson.status} />}>
          {data.upcomingLesson ? <>
            <dl className="grid gap-4 sm:grid-cols-2">
              {[
                ['Date', dateText(data.upcomingLesson.date)], ['Time', timeText(data.upcomingLesson.time)],
                ['Instructor', data.upcomingLesson.instructor || 'Not assigned'], ['Vehicle / Training type', data.upcomingLesson.vehicle || 'Not specified'],
              ].map(([label, value]) => <div key={label} className="rounded-xl bg-gray-50 px-4 py-3"><dt className="text-xs font-semibold tracking-wide text-gray-500 uppercase">{label}</dt><dd className="mt-1 font-semibold text-ink">{value}</dd></div>)}
            </dl>
            <div className="mt-6 border-t border-gray-100 pt-5"><p className="mb-2 text-sm font-semibold text-gray-700">Learning Progress</p><ProgressBar value={data.progress} label="Learning progress" /></div>
          </> : <p className="py-8 text-center text-sm text-gray-500">You have no upcoming practical lessons.</p>}
        </DashboardSection>
        <DashboardSection title="Recent Activity" icon={FaClockRotateLeft}>
          {data.activity.length ? <ul className="flex flex-col gap-4">{data.activity.map((item) => {
            const Icon = item.type?.includes('PAYMENT') ? FaMoneyBillWave : item.type?.includes('LESSON') ? FaCircleCheck : FaCalendarDay
            return <li key={item.id} className="flex items-start gap-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand"><Icon aria-hidden="true" /></span><div className="min-w-0 flex-1 border-b border-gray-100 pb-4"><p className="font-semibold text-ink">{item.title}</p><p className="text-sm text-gray-600">{item.detail}</p><p className="mt-1 text-xs text-gray-500">{new Intl.DateTimeFormat(undefined, { dateStyle: 'long', timeZone: 'Asia/Colombo' }).format(new Date(item.date))}</p></div></li>
          })}</ul> : <p className="py-8 text-center text-sm text-gray-500">No recent activity.</p>}
        </DashboardSection>
      </div>
    </>}
  </>
}

export default StudentDashboard
