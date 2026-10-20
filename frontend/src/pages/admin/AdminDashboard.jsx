import { useOutletContext } from 'react-router-dom'
import { FaChartPie, FaGaugeHigh, FaUserPlus, FaUserGraduate, FaChalkboardUser, FaBookOpen, FaCalendarCheck } from 'react-icons/fa6'
import DashboardChart from '../../components/dashboard/DashboardChart'
import DashboardSection from '../../components/dashboard/DashboardSection'
import DashboardTable from '../../components/dashboard/DashboardTable'
import DashboardWelcome from '../../components/dashboard/DashboardWelcome'
import DashboardLoadState from '../../components/dashboard/DashboardLoadState'
import { StatCardGrid } from '../../components/dashboard/StatCard'
import StatusBadge from '../../components/dashboard/StatusBadge'
import useDashboardData from '../../components/dashboard/useDashboardData'
import { getAdminDashboard } from '../../services/dashboardApi'

const registrationColumns = [
  { key: 'student', label: 'Student Name' }, { key: 'course', label: 'Course' },
  { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> }, { key: 'date', label: 'Date' },
]

function AdminDashboard() {
  const { user } = useOutletContext()
  const { data, loading, error, refresh } = useDashboardData(getAdminDashboard)
  const stats = data ? [
    { label: 'Total Students', value: String(data.stats.students), description: `${data.stats.activeStudents} active`, icon: FaUserGraduate },
    { label: 'Total Instructors', value: String(data.stats.instructors), description: `${data.stats.activeInstructors} active`, icon: FaChalkboardUser },
    { label: 'Active Courses', value: String(data.stats.activeCourses), description: 'Currently offered', icon: FaBookOpen },
    { label: 'Pending Bookings', value: String(data.stats.pendingBookings), description: 'Scheduled lessons without attendance', icon: FaCalendarCheck },
  ] : []
  const bookingData = data ? [
    { label: 'Confirmed', value: data.bookings.confirmed, color: 'bg-brand' },
    { label: 'Pending', value: data.bookings.pending, color: 'bg-amber-500' },
    { label: 'Completed', value: data.bookings.completed, color: 'bg-emerald-600' },
    { label: 'Cancelled', value: data.bookings.cancelled, color: 'bg-gray-400' },
    { label: 'Absent', value: data.bookings.absent, color: 'bg-rose-500' },
  ] : []
  return <>
    <DashboardWelcome title="Admin Dashboard" message={`Welcome back, ${user.name}!`} user={user} icon={FaGaugeHigh} />
    <DashboardLoadState loading={loading} error={error} onRetry={refresh} />
    {data && <>
      <StatCardGrid stats={stats} />
      <div className="grid gap-6 xl:grid-cols-3">
        <DashboardSection title="Recent Registrations" icon={FaUserPlus} className="xl:col-span-2">
          {data.registrations.length ? <DashboardTable caption="Recent student registration applications" columns={registrationColumns} rows={data.registrations} /> : <p className="py-8 text-center text-sm text-gray-500">No registration applications yet.</p>}
        </DashboardSection>
        <DashboardSection title="Booking Overview" icon={FaChartPie}>
          <DashboardChart data={bookingData} total={data.bookings.total} totalLabel="Practical lesson records" />
          <p className="mt-4 text-xs text-gray-500">Counts use practical lesson attendance states. This system does not store separate confirmed or cancelled booking states.</p>
        </DashboardSection>
      </div>
    </>}
  </>
}

export default AdminDashboard
