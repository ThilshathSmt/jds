import { useOutletContext } from 'react-router-dom'
import { FaCalendarDay, FaGaugeHigh, FaUserGraduate, FaCalendarCheck, FaClipboardCheck } from 'react-icons/fa6'
import DashboardSection from '../../components/dashboard/DashboardSection'
import DashboardTable from '../../components/dashboard/DashboardTable'
import DashboardWelcome from '../../components/dashboard/DashboardWelcome'
import DashboardLoadState from '../../components/dashboard/DashboardLoadState'
import ProgressBar from '../../components/dashboard/ProgressBar'
import { StatCardGrid } from '../../components/dashboard/StatCard'
import StatusBadge from '../../components/dashboard/StatusBadge'
import useDashboardData from '../../components/dashboard/useDashboardData'
import { getInstructorDashboard } from '../../services/dashboardApi'

const studentColumns = [
  { key: 'student', label: 'Student Name' }, { key: 'course', label: 'Course' },
  { key: 'progress', label: 'Progress', render: (row) => <ProgressBar value={row.progress} label={`${row.student} progress`} /> },
  { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} label={row.statusLabel} /> },
]
const timeText = (value) => value ? new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }).format(new Date(`1970-01-01T${value}:00Z`)) : 'Time not set'

function InstructorDashboard() {
  const { user } = useOutletContext()
  const { data, loading, error, refresh } = useDashboardData(getInstructorDashboard)
  const stats = data ? [
    { label: "Today's Lessons", value: String(data.stats.today), description: 'Scheduled today', icon: FaCalendarDay },
    { label: 'Upcoming Lessons', value: String(data.stats.upcoming), description: 'Next 7 days', icon: FaCalendarCheck },
    { label: 'Students', value: String(data.stats.students), description: 'Assigned to you', icon: FaUserGraduate },
    { label: 'Completed Lessons', value: String(data.stats.completed), description: 'All time', icon: FaClipboardCheck },
  ] : []
  const studentRows = data?.students.map((row) => ({ ...row, status: row.accountStatus === 'active' ? 'Active' : 'Inactive', statusLabel: `${row.accountStatus === 'active' ? 'Active' : 'Inactive'} · ${row.trainingStatus}` })) ?? []
  return <>
    <DashboardWelcome title="Instructor Dashboard" message={`Welcome back, ${user.name}!`} user={user} icon={FaGaugeHigh} />
    <DashboardLoadState loading={loading} error={error} onRetry={refresh} />
    {data && <>
      <StatCardGrid stats={stats} />
      <div className="grid gap-6 xl:grid-cols-3">
        <DashboardSection title="Today's Schedule" icon={FaCalendarDay}>
          {data.schedule.length ? <ul className="flex flex-col gap-3">{data.schedule.map((lesson) => <li key={lesson.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-l-4 border-brand bg-gray-50 px-4 py-3"><div className="min-w-0"><p className="text-sm font-bold text-brand">{timeText(lesson.time)}</p><p className="font-semibold text-ink">{lesson.student}</p><p className="text-sm text-gray-600">{lesson.course}</p></div><StatusBadge status={lesson.status === 'ATTENDED' ? 'Completed' : lesson.status === 'ABSENT' ? 'Absent' : 'Pending'} label={lesson.status} /></li>)}</ul> : <p className="py-8 text-center text-sm text-gray-500">No practical lessons scheduled today.</p>}
        </DashboardSection>
        <DashboardSection title="Recent Students" icon={FaUserGraduate} className="xl:col-span-2">
          {studentRows.length ? <DashboardTable caption="Students assigned to you" columns={studentColumns} rows={studentRows} /> : <p className="py-8 text-center text-sm text-gray-500">No students are currently assigned to you.</p>}
        </DashboardSection>
      </div>
    </>}
  </>
}

export default InstructorDashboard
