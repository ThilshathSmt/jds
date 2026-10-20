// Dummy content for the Admin panel.
// TODO: Replace with backend API data

import {
  FaBell,
  FaCarSide,
  FaCommentDots,
  FaClipboardList,
  FaGaugeHigh,
  FaGear,
  FaImages,
  FaRoad,
  FaSliders,
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
    { label: 'Lessons', to: '/admin-dashboard/lessons', icon: FaCarSide },
    { label: 'Feedbacks', to: '/admin-dashboard/feedbacks', icon: FaCommentDots },
    { label: 'Notifications', to: '/admin-dashboard/notifications', icon: FaBell },
    { label: 'Driving Exam', to: '/admin-dashboard/driving-exam', icon: FaRoad },
    {
      label: 'Packages & Exam Penalties',
      to: '/admin-dashboard/packages-settings',
      icon: FaSliders,
    },
    { label: 'Gallery', to: '/admin-dashboard/gallery', icon: FaImages },
    // Settings stays the last item
    { label: 'Settings', to: '/admin-dashboard/settings', icon: FaGear },
  ],
}

