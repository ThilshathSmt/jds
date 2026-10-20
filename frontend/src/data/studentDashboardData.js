// Dummy content for the Student panel.
// TODO: Replace with backend API data

import {
  FaBell,
  FaCarSide,
  FaFileSignature,
  FaGaugeHigh,
  FaGear,
  FaUserGraduate,
} from 'react-icons/fa6'

// Panel shell: sidebar title, signed-in user and menu.
// TODO: Load the signed-in user from the authentication/session logic
export const studentPanel = {
  role: 'student',
  panelTitle: 'Student Panel',
  user: { name: 'Student', role: 'Student', icon: FaUserGraduate, avatar: null },
  // The remaining student menu items will be added here: { label, to, icon }
  // `end` keeps "Dashboard" from staying active on sub-pages
  menuItems: [
    { label: 'Dashboard', to: '/student-dashboard', icon: FaGaugeHigh, end: true },
    { label: 'Exams', to: '/student-dashboard/exams', icon: FaFileSignature },
    { label: 'Lessons', to: '/student-dashboard/lessons', icon: FaCarSide },
    { label: 'Notifications', to: '/student-dashboard/notifications', icon: FaBell },
    { label: 'Settings', to: '/student-dashboard/settings', icon: FaGear },
  ],
}

