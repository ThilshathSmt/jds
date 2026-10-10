import { FaChalkboardUser, FaUserGraduate } from 'react-icons/fa6'

const roles = {
  student: {
    label: 'Student',
    icon: FaUserGraduate,
    className: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  },
  instructor: {
    label: 'Instructor',
    icon: FaChalkboardUser,
    className: 'bg-violet-50 text-violet-700 ring-violet-600/20',
  },
}

// Role pill for the Manage Users table and details
function RoleBadge({ role }) {
  const { label, icon: Icon, className } = roles[role] ?? { label: role, className: '' }
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap ring-1 ring-inset ${className}`}
    >
      {Icon && <Icon aria-hidden="true" />}
      {label}
    </span>
  )
}

export default RoleBadge
