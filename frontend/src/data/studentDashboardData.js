// Dummy content for the Student panel.
// TODO: Replace with backend API data

import {
  FaCalendarDay,
  FaCar,
  FaChartLine,
  FaCircleCheck,
  FaClipboardCheck,
  FaGaugeHigh,
  FaMoneyBillWave,
  FaUserGraduate,
} from 'react-icons/fa6'

// Panel shell: sidebar title, signed-in user and menu.
// TODO: Load the signed-in user from the authentication/session logic
export const studentPanel = {
  role: 'student',
  panelTitle: 'Student Panel',
  user: { name: 'Student', role: 'Student', icon: FaUserGraduate, avatar: null },
  // The remaining student menu items will be added here: { label, to, icon }
  menuItems: [{ label: 'Dashboard', to: '/student-dashboard', icon: FaGaugeHigh, end: true }],
}

// TODO: Replace dashboard statistics with backend data
export const studentStats = [
  { label: 'My Course', value: 'Car / Dual Purpose', description: 'Enrolled course', icon: FaCar },
  { label: 'Lessons Completed', value: '8', description: 'Practical lessons', icon: FaClipboardCheck },
  { label: 'Upcoming Lessons', value: '2', description: 'Scheduled lessons', icon: FaCalendarDay },
  { label: 'Learning Progress', value: '65%', description: 'Overall progress', icon: FaChartLine },
]

// TODO: Replace with API data
export const learningProgress = 65

// TODO: Replace with API data
export const upcomingLesson = {
  status: 'Confirmed',
  details: [
    { label: 'Date', value: 'October 12, 2026' },
    { label: 'Time', value: '10:00 AM' },
    { label: 'Instructor', value: 'Instructor Name' },
    { label: 'Vehicle', value: 'Car' },
  ],
}

// TODO: Replace with API data
export const recentActivity = [
  { id: 1, title: 'Lesson completed', detail: 'Practical lesson 8', date: 'October 8, 2026', icon: FaCircleCheck },
  { id: 2, title: 'Booking confirmed', detail: 'Lesson on October 12, 2026', date: 'October 6, 2026', icon: FaCalendarDay },
  { id: 3, title: 'Payment received', detail: 'Course instalment', date: 'October 1, 2026', icon: FaMoneyBillWave },
]
