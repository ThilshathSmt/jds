import { useOutletContext } from 'react-router-dom'
import { FaChartPie, FaGaugeHigh, FaUserPlus } from 'react-icons/fa6'
import DashboardChart from '../../components/dashboard/DashboardChart'
import DashboardSection from '../../components/dashboard/DashboardSection'
import DashboardTable from '../../components/dashboard/DashboardTable'
import DashboardWelcome from '../../components/dashboard/DashboardWelcome'
import { StatCardGrid } from '../../components/dashboard/StatCard'
import StatusBadge from '../../components/dashboard/StatusBadge'
import { adminStats, bookingOverview, recentRegistrations } from '../../data/adminDashboardData'

const registrationColumns = [
  { key: 'student', label: 'Student Name' },
  { key: 'course', label: 'Course' },
  { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
  { key: 'date', label: 'Date' },
]

function AdminDashboard() {
  const { user } = useOutletContext()

  return (
    <>
      <DashboardWelcome
        title="Admin Dashboard"
        message={`Welcome back, ${user.name}!`}
        user={user}
        icon={FaGaugeHigh}
      />
      <StatCardGrid stats={adminStats} />

      <div className="grid gap-6 xl:grid-cols-3">
        <DashboardSection title="Recent Registrations" icon={FaUserPlus} className="xl:col-span-2">
          <DashboardTable
            caption="Recent student registrations"
            columns={registrationColumns}
            rows={recentRegistrations}
          />
        </DashboardSection>

        <DashboardSection title="Booking Overview" icon={FaChartPie}>
          <DashboardChart data={bookingOverview} totalLabel="Total bookings" />
        </DashboardSection>
      </div>
    </>
  )
}

export default AdminDashboard
