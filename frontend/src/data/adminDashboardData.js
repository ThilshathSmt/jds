// Dummy content for the Admin panel.
// TODO: Replace with backend API data

import {
  FaBookOpen,
  FaCalendarCheck,
  FaChalkboardUser,
  FaClipboardList,
  FaGaugeHigh,
  FaUserGraduate,
  FaUserShield,
  FaUsersGear,
} from 'react-icons/fa6'

// Panel shell: sidebar title, signed-in user and menu.
// TODO: Load the signed-in user from the authentication/session logic
export const adminPanel = {
  role: 'admin',
  panelTitle: 'Admin Panel',
  user: { name: 'Admin', role: 'Administrator', icon: FaUserShield, avatar: null },
  // Add further admin modules here; `end` keeps "Dashboard" from staying active on sub-pages
  menuItems: [
    { label: 'Dashboard', to: '/admin-dashboard', icon: FaGaugeHigh, end: true },
    { label: 'Manage Users', to: '/admin-dashboard/users', icon: FaUsersGear },
    {
      label: 'Registration Forms',
      to: '/admin-dashboard/registration-forms',
      icon: FaClipboardList,
    },
  ],
}

// TODO: Replace dashboard statistics with backend data
export const adminStats = [
  { label: 'Total Students', value: '245', description: 'Active students', icon: FaUserGraduate },
  { label: 'Total Instructors', value: '12', description: 'Training staff', icon: FaChalkboardUser },
  { label: 'Active Courses', value: '6', description: 'Currently offered', icon: FaBookOpen },
  { label: 'Pending Bookings', value: '18', description: 'Awaiting confirmation', icon: FaCalendarCheck },
]

// TODO: Replace with API data
export const recentRegistrations = [
  { id: 1, student: 'Mohamed A', course: 'Car', status: 'Active', date: '2026-10-01' },
  { id: 2, student: 'Fathima S', course: 'Motorcycle', status: 'Pending', date: '2026-10-02' },
  { id: 3, student: 'Ahmed R', course: 'Car', status: 'Active', date: '2026-10-03' },
  { id: 4, student: 'Nuha M', course: 'Car / Dual Purpose', status: 'Active', date: '2026-10-05' },
  { id: 5, student: 'Rizwan K', course: 'Three Wheeler', status: 'Pending', date: '2026-10-06' },
]

// TODO: Replace with API data
export const bookingOverview = [
  { label: 'Confirmed', value: 42, color: 'bg-brand' },
  { label: 'Pending', value: 18, color: 'bg-amber-500' },
  { label: 'Completed', value: 96, color: 'bg-emerald-600' },
  { label: 'Cancelled', value: 7, color: 'bg-gray-400' },
]
