// Dummy content for the Instructor panel.
// TODO: Replace with backend API data

import {
  FaCalendarCheck,
  FaCalendarDay,
  FaClipboardCheck,
  FaGaugeHigh,
  FaUserGraduate,
  FaUserTie,
} from 'react-icons/fa6'

// Panel shell: sidebar title, signed-in user and menu.
// TODO: Load the signed-in user from the authentication/session logic
export const instructorPanel = {
  role: 'instructor',
  panelTitle: 'Instructor Panel',
  user: { name: 'Instructor', role: 'Instructor', icon: FaUserTie, avatar: null },
  // The remaining instructor menu items will be added here: { label, to, icon }
  menuItems: [{ label: 'Dashboard', to: '/instructor-dashboard', icon: FaGaugeHigh, end: true }],
}

// TODO: Replace dashboard statistics with backend data
export const instructorStats = [
  { label: "Today's Lessons", value: '5', description: 'Scheduled for today', icon: FaCalendarDay },
  { label: 'Upcoming Lessons', value: '12', description: 'Next 7 days', icon: FaCalendarCheck },
  { label: 'Students', value: '38', description: 'Assigned to you', icon: FaUserGraduate },
  { label: 'Completed Lessons', value: '124', description: 'All time', icon: FaClipboardCheck },
]

// TODO: Replace with API data
export const todaysSchedule = [
  { id: 1, time: '09:00 AM', student: 'Student A', course: 'Car Training', status: 'Confirmed' },
  { id: 2, time: '11:00 AM', student: 'Student B', course: 'Car Training', status: 'Confirmed' },
  { id: 3, time: '02:00 PM', student: 'Student C', course: 'Motorcycle Training', status: 'Pending' },
]

// TODO: Replace with API data
export const recentStudents = [
  { id: 1, student: 'Student A', course: 'Car', progress: 80, status: 'Active' },
  { id: 2, student: 'Student B', course: 'Car / Dual Purpose', progress: 55, status: 'Active' },
  { id: 3, student: 'Student C', course: 'Motorcycle', progress: 30, status: 'Pending' },
  { id: 4, student: 'Student D', course: 'Three Wheeler', progress: 100, status: 'Completed' },
]
