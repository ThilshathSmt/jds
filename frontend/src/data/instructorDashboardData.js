// Dummy content for the Instructor panel.
// TODO: Replace with backend API data

import {
  FaCarSide,
  FaCommentDots,
  FaGaugeHigh,
  FaGear,
  FaUserTie,
} from 'react-icons/fa6'

// Panel shell: sidebar title, signed-in user and menu.
// TODO: Load the signed-in user from the authentication/session logic
export const instructorPanel = {
  role: 'instructor',
  panelTitle: 'Instructor Panel',
  user: { name: 'Instructor', role: 'Instructor', icon: FaUserTie, avatar: null },
  // The remaining instructor menu items will be added here: { label, to, icon }
  menuItems: [
    { label: 'Dashboard', to: '/instructor-dashboard', icon: FaGaugeHigh, end: true },
    { label: 'Lessons', to: '/instructor-dashboard/lessons', icon: FaCarSide },
    { label: 'Feedbacks', to: '/instructor-dashboard/feedbacks', icon: FaCommentDots },
    { label: 'Settings', to: '/instructor-dashboard/settings', icon: FaGear },
  ],
}

